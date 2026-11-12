#!/usr/bin/env python3
"""Fetch new arXiv candidates for the legged-manipulation paper hub.

Uses the public arXiv API (no key). Writes data/arxiv_raw/YYYY-MM-DD.json
using the Asia/Shanghai calendar date and refreshes data/arxiv_raw/index.json.
Does not invent papers: items are parsed from the Atom feed, and a paper is
kept only when the title or abstract matches the keyword list.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "arxiv_raw"
DAILY_INDEX = ROOT / "data" / "daily" / "index.json"
SITE_JSON = ROOT / "site.json"
PAPERS_JSON = ROOT / "data" / "papers.json"

SHANGHAI = timezone(timedelta(hours=8))
ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"
OPENSEARCH = "{http://a9.com/-/spec/opensearch/1.1/}"
API = "https://export.arxiv.org/api/query"
USER_AGENT = "robot-grasp-papers/1.0 (https://github.com/57cx/robot-grasp-papers)"
DATE_FILE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")

# Phrases sent to the arXiv API. Bare "grasp" is intentionally not here;
# grasping hits are the more specific phrases plus the client-side check.
API_PHRASES = [
    "quadruped",
    "quadrupedal",
    "legged manipulation",
    "legged manipulator",
    "loco-manipulation",
    "locomanipulation",
    "loco manipulation",
    "mobile manipulation",
    "mobile manipulator",
    "whole-body control",
    "whole body control",
    "visual servoing",
    "visual servo",
    "hand-eye",
    "hand eye calibration",
    "imitation learning",
    "diffusion policy",
    "vision-language-action",
    "vision language action",
    "VLA",
    "teleoperation",
    "tele-operation",
    "sim2real",
    "sim-to-real",
    "sim to real",
    "robotic grasping",
    "grasp detection",
    "object grasping",
    "grasp pose",
]

# (label, patterns). Patterns are applied with IGNORECASE.
# A "grasp" hit on a non-cs.RO paper also needs a robotics cue.
KEYWORD_GROUPS = [
    ("四足", [r"quadruped\w*"]),
    ("腿式操作", [r"legged\s+(?:\w+\s+){0,4}manipulat\w*"]),
    ("loco-manipulation", [r"loco[\s-]?manipulat\w*"]),
    ("移动操作", [r"mobile\s+manipulat\w*"]),
    ("全身控制", [r"whole[\s-]body\s+control"]),
    ("视觉伺服", [r"visual\s+servo\w*"]),
    ("手眼标定", [r"hand[\s-]eye"]),
    ("模仿学习", [r"imitation\s+learning"]),
    ("diffusion policy", [r"diffusion\s+policy"]),
    ("VLA", [r"vision[\s-]language[\s-]action", r"\bVLA\b"]),
    ("遥操作", [r"tele-?operation", r"\bteleop\b"]),
    ("sim2real", [r"sim[\s-]?to[\s-]?real", r"sim2real"]),
    ("抓取", [r"grasp\s+detection", r"object\s+grasping", r"robotic\s+grasping", r"grasp\s+pose", r"\bgrasp(?:ing|ed|s)?\b"]),
]


def shanghai_now() -> datetime:
    return datetime.now(SHANGHAI)


BROAD_LABELS = {"模仿学习", "diffusion policy", "VLA", "sim2real", "抓取"}
ROBOTICS_CUE = re.compile(
    r"robot|manipul|gripper|humanoid|quadruped|embodied|end-effector|end effector|\barm\b",
    re.IGNORECASE,
)


def match_keywords(title: str, summary: str, categories: list[str]) -> list[str]:
    text = f"{title}\n{summary}"
    cats = set(categories or [])
    in_ro = "cs.RO" in cats
    robotics = in_ro or bool(ROBOTICS_CUE.search(text))
    hits: list[str] = []
    for label, patterns in KEYWORD_GROUPS:
        matched = any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)
        if not matched:
            continue
        if label in BROAD_LABELS and not robotics:
            if label != "抓取":
                continue
            specific = any(
                re.search(pattern, text, re.IGNORECASE)
                for pattern in patterns
                if pattern != r"\bgrasp(?:ing|ed|s)?\b"
            )
            if not specific:
                continue
        hits.append(label)
    return hits


def phrase_clause(phrases: list[str]) -> str:
    parts = []
    for phrase in phrases:
        if any(ch.isspace() or ch == "-" for ch in phrase):
            parts.append(f'all:"{phrase}"')
        else:
            parts.append(f"all:{phrase}")
    return "(" + " OR ".join(parts) + ")"


def build_query(window_start: datetime, window_end: datetime) -> str:
    start = window_start.astimezone(timezone.utc).strftime("%Y%m%d%H%M")
    end = window_end.astimezone(timezone.utc).strftime("%Y%m%d%H%M")
    date_clause = f"submittedDate:[{start} TO {end}]"
    categories = "(cat:cs.RO OR cat:cs.CV OR cat:cs.LG)"
    return f"({date_clause}) AND {categories} AND {phrase_clause(API_PHRASES)}"


def http_get(params: dict) -> bytes:
    url = API + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code in {429, 500, 502, 503} and attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError as error:
            last_error = error
            if attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"arXiv request failed: {last_error}")


def fetch_entries(query: str, max_total: int = 300) -> tuple[list[ET.Element], int]:
    start = 0
    page = 100
    entries: list[ET.Element] = []
    total = 0
    while start < max_total:
        payload = http_get({
            "search_query": query,
            "start": start,
            "max_results": min(page, max_total - start),
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        })
        root = ET.fromstring(payload)
        if start == 0:
            total = int(root.findtext(f"{OPENSEARCH}totalResults") or "0")
        batch = root.findall(f"{ATOM}entry")
        if not batch:
            break
        entries.extend(batch)
        start += len(batch)
        if start >= total or start >= max_total:
            break
        time.sleep(3)
    return entries, total


def clean(value: str | None) -> str:
    return " ".join((value or "").split())


def parse_entry(entry: ET.Element) -> dict | None:
    raw_id = clean(entry.findtext(f"{ATOM}id"))
    match = re.search(r"(\d{4}\.\d{4,5})", raw_id)
    if not match:
        return None
    arxiv_id = match.group(1)
    authors = []
    for author in entry.findall(f"{ATOM}author"):
        name = clean(author.findtext(f"{ATOM}name"))
        if name:
            authors.append(name)
    categories = []
    for node in entry.findall(f"{ATOM}category"):
        term = node.attrib.get("term", "")
        if term:
            categories.append(term)
    primary_node = entry.find(f"{ARXIV_NS}primary_category")
    primary = primary_node.attrib.get("term", "") if primary_node is not None else (categories[0] if categories else "")
    title = clean(entry.findtext(f"{ATOM}title"))
    summary = clean(entry.findtext(f"{ATOM}summary"))
    allowed = {"cs.RO", "cs.CV", "cs.LG"}
    if not allowed.intersection(categories):
        return None
    keywords = match_keywords(title, summary, categories)
    if not keywords:
        return None
    published = clean(entry.findtext(f"{ATOM}published"))
    updated = clean(entry.findtext(f"{ATOM}updated"))
    return {
        "arxiv_id": arxiv_id,
        "title": title,
        "authors": authors,
        "summary": summary,
        "published": published,
        "updated": updated,
        "categories": categories,
        "primary_category": primary,
        "arxiv_url": f"https://arxiv.org/abs/{arxiv_id}",
        "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}",
        "matched_keywords": keywords,
    }


def known_ids(except_date: str) -> set[str]:
    found: set[str] = set()
    if not RAW_DIR.exists():
        return found
    for path in RAW_DIR.glob("*.json"):
        if not DATE_FILE.match(path.name) or path.stem == except_date:
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for item in payload.get("items") or []:
            arxiv_id = item.get("arxiv_id")
            if arxiv_id:
                found.add(arxiv_id)
    return found


def parse_atom_time(value: str) -> datetime | None:
    if not value:
        return None
    text = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def update_site(date: str, fetched_at: str) -> None:
    site = json.loads(SITE_JSON.read_text(encoding="utf-8"))
    site["updated"] = fetched_at
    site["latest_arxiv_raw"] = date
    if PAPERS_JSON.exists():
        papers = json.loads(PAPERS_JSON.read_text(encoding="utf-8"))
        site.setdefault("counts", {})
        if isinstance(papers, list):
            site["counts"]["papers"] = len(papers)
    if DAILY_INDEX.exists():
        daily = json.loads(DAILY_INDEX.read_text(encoding="utf-8"))
        dates = daily.get("dates") or []
        site["latest_digest"] = dates[0] if dates else None
    write_json(SITE_JSON, site)


def update_index(date: str) -> None:
    index_path = RAW_DIR / "index.json"
    if index_path.exists():
        index = json.loads(index_path.read_text(encoding="utf-8"))
    else:
        index = {"dates": []}
    dates = [item for item in index.get("dates") or [] if item != date]
    dates.append(date)
    dates = sorted(set(dates), reverse=True)
    index["dates"] = dates
    write_json(index_path, index)


def self_test() -> None:
    quadruped = match_keywords(
        "Quadruped mobile manipulation with a diffusion policy",
        "We study loco-manipulation.",
        ["cs.RO"],
    )
    assert "四足" in quadruped, quadruped
    assert "移动操作" in quadruped, quadruped
    assert "diffusion policy" in quadruped, quadruped
    assert "loco-manipulation" in quadruped, quadruped
    assert match_keywords("A note on category theory", "No robots here.", ["cs.LG"]) == []
    assert match_keywords(
        "Online Imitation Learning for Stabilizing Plasmas",
        "A Vlasov-Poisson solver.",
        ["cs.LG"],
    ) == []
    assert "模仿学习" in match_keywords("Imitation learning for a robot arm", "Policy for a manipulator.", ["cs.LG"])
    assert match_keywords("Available resources for vision", "The available set is large.", ["cs.CV"]) == []
    grasp = match_keywords("Grasp detection for a parallel gripper", "Robotic grasping in clutter.", ["cs.CV"])
    assert "抓取" in grasp, grasp
    unrelated = match_keywords("People grasping a concept", "A social science note.", ["cs.CV"])
    assert unrelated == [], unrelated
    vla = match_keywords("A VLA model", "vision-language-action control", ["cs.RO", "cs.LG"])
    assert "VLA" in vla, vla
    print("self-test ok")


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch arXiv candidates into data/arxiv_raw/")
    parser.add_argument("--dry-run", action="store_true", help="print matches without writing files")
    parser.add_argument("--self-test", action="store_true", help="run keyword checks and exit")
    parser.add_argument("--lookback-days", type=int, default=7)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.lookback_days < 1:
        print("lookback-days must be >= 1", file=sys.stderr)
        return 2

    now = shanghai_now()
    date = now.date().isoformat()
    window_end = now
    window_start = now - timedelta(days=args.lookback_days)
    query = build_query(window_start, window_end)
    print(f"Shanghai date {date}; window {window_start.isoformat()} → {window_end.isoformat()}")
    entries, reported = fetch_entries(query)
    print(f"API reported {reported} hit(s), downloaded {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}")

    seen = known_ids(date)
    items = []
    skipped_known = 0
    skipped_old = 0
    skipped_parse = 0
    for entry in entries:
        parsed = parse_entry(entry)
        if not parsed:
            skipped_parse += 1
            continue
        published = parse_atom_time(parsed["published"])
        if published is not None and published < window_start.astimezone(timezone.utc):
            skipped_old += 1
            continue
        if parsed["arxiv_id"] in seen:
            skipped_known += 1
            continue
        if any(item["arxiv_id"] == parsed["arxiv_id"] for item in items):
            continue
        items.append(parsed)
    items.sort(key=lambda item: item["published"], reverse=True)
    print(f"kept {len(items)}; dropped {skipped_parse} without keyword/category, {skipped_old} outside window, {skipped_known} already stored")
    for item in items:
        print(f"- {item['published'][:10]} [{item['primary_category']}] {item['title']} ({', '.join(item['matched_keywords'])})")

    fetched_at = now.isoformat(timespec="seconds")
    payload = {
        "date": date,
        "timezone": "Asia/Shanghai",
        "fetched_at": fetched_at,
        "source": "arXiv API (export.arxiv.org)",
        "source_query": (
            "arXiv API：cs.RO，以及标题或摘要命中同一组关键词的 cs.CV / cs.LG。"
            "关键词覆盖四足与腿式操作、移动操作、抓取、全身控制、视觉伺服、手眼标定、"
            "模仿学习、diffusion policy、VLA、遥操作、sim2real。"
            "只保留发布落在回溯窗口内、且没有出现在更早 data/arxiv_raw 文件中的条目。"
            "本文件是未解读候选，不是每日解读。"
        ),
        "api_query": query,
        "window_start": window_start.isoformat(timespec="seconds"),
        "window_end": window_end.isoformat(timespec="seconds"),
        "lookback_days": args.lookback_days,
        "status": "uninterpreted_candidates",
        "count": len(items),
        "items": items,
    }
    if args.dry_run:
        print("dry-run: no files written")
        return 0
    write_json(RAW_DIR / f"{date}.json", payload)
    update_index(date)
    update_site(date, fetched_at)
    print(f"wrote data/arxiv_raw/{date}.json and updated index + site.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
