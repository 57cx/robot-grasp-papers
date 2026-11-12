#!/usr/bin/env python3
"""Check the static site, data locks, and digest/raw indexes."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

LOCKED = {
    "data/papers.json": "ed7ed31dcec64c3be8dfb904068184fdd4d8eef60697099e090587fcdd9b2645",
    "data/reading_plan.json": "95b2ed6ab86f31f69147e05f20ec295e1f0d70e555f3b115ef0ca53c4fe8cf73",
    "data/reading_plan.md": "48de6d218eccb06f912e0084af881c64737b024b4fb55903d73697f9e2d178c0",
}

PAPER_KEYS = {
    "id", "title", "authors", "year", "venue", "arxiv_url", "doi", "code_url",
    "category", "category_key", "tags", "summary_zh", "relevance_zh",
    "reproducibility", "verified", "venue_source", "verified_via",
}
DIGEST_ITEM_KEYS = {
    "title", "authors", "arxiv_url", "categories", "summary_zh", "analysis_zh",
    "relevance_zh", "score", "priority", "tags",
}
RAW_ITEM_KEYS = {
    "arxiv_id", "title", "authors", "summary", "published", "updated",
    "categories", "primary_category", "arxiv_url", "pdf_url", "matched_keywords",
}


class RefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        for key in ("href", "src"):
            value = values.get(key)
            if not value or value.startswith(("http://", "https://", "mailto:", "#", "data:")):
                continue
            self.refs.append(value.split("?", 1)[0].split("#", 1)[0])


def fail(message: str) -> None:
    print(f"ERROR {message}", file=sys.stderr)
    raise SystemExit(1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"{path.relative_to(ROOT)} is not valid JSON: {error}")


def require_keys(record: dict, keys: set[str], label: str) -> None:
    missing = sorted(keys - set(record))
    if missing:
        fail(f"{label} missing {missing}")


def check_index(index_path: Path, pattern_dir: Path, kind: str) -> list[str]:
    payload = load(index_path)
    if not isinstance(payload, dict) or not isinstance(payload.get("dates"), list):
        fail(f"{index_path.relative_to(ROOT)} must be an object with a dates array")
    dates = payload["dates"]
    if any(not isinstance(item, str) or not DATE.match(item) for item in dates):
        fail(f"{index_path.relative_to(ROOT)} dates must be YYYY-MM-DD strings")
    if len(dates) != len(set(dates)):
        fail(f"{index_path.relative_to(ROOT)} has duplicate dates")
    for date in dates:
        target = pattern_dir / f"{date}.json"
        if not target.exists():
            fail(f"{kind} index lists {date} but {target.relative_to(ROOT)} is missing")
    for path in pattern_dir.glob("*.json"):
        if DATE.match(path.stem) and path.stem not in dates:
            fail(f"{path.relative_to(ROOT)} is not listed in the index")
    return dates


def main() -> int:
    for relative, expected in LOCKED.items():
        path = ROOT / relative
        if not path.exists():
            fail(f"missing {relative}")
        actual = sha256(path)
        if actual != expected:
            fail(f"{relative} hash changed ({actual}); paper facts and the reading plan must stay byte-for-byte unless the lock is updated on purpose")

    papers = load(ROOT / "data" / "papers.json")
    if not isinstance(papers, list) or len(papers) != 145:
        fail("papers.json must be a list of 145 records")
    ids = []
    for paper in papers:
        if not isinstance(paper, dict):
            fail("paper record is not an object")
        require_keys(paper, PAPER_KEYS, paper.get("id", "<paper>"))
        if paper["reproducibility"] not in {"高", "中", "低"}:
            fail(f"{paper['id']} has an unexpected reproducibility value")
        ids.append(paper["id"])
    if len(set(ids)) != len(ids):
        fail("paper ids are not unique")

    plan = load(ROOT / "data" / "reading_plan.json")
    known = set(ids)
    for stage in plan["stages"]:
        for key in ("first_read", "core", "optional"):
            for paper_id in stage[key]:
                if paper_id not in known:
                    fail(f"reading plan stage {stage['stage']} {key} references unknown id {paper_id}")
    for idea in plan["research_ideas"]:
        for paper_id in idea["refs"]:
            if paper_id not in known:
                fail(f"research idea references unknown id {paper_id}")
    if plan["top3"] != ["langella2026locopilot", "ha2024umionlegs", "pan2024roboduet"]:
        fail("top3 changed")

    digest_dates = check_index(ROOT / "data" / "daily" / "index.json", ROOT / "data" / "daily", "daily")
    for date in digest_dates:
        digest = load(ROOT / "data" / "daily" / f"{date}.json")
        require_keys(digest, {"date", "source_query", "overview_zh", "items"}, f"digest {date}")
        if digest["date"] != date:
            fail(f"digest {date} date field is {digest['date']}")
        if not isinstance(digest["items"], list):
            fail(f"digest {date} items is not a list")
        for index, item in enumerate(digest["items"]):
            require_keys(item, DIGEST_ITEM_KEYS, f"digest {date} item {index}")
            if not isinstance(item["authors"], list) or not isinstance(item["tags"], list):
                fail(f"digest {date} item {index} authors/tags must be arrays")
            if not isinstance(item["score"], (int, float)):
                fail(f"digest {date} item {index} score must be a number")
            if item["priority"] not in {"高", "中", "低"}:
                fail(f"digest {date} item {index} priority must be 高/中/低")

    raw_dates = check_index(ROOT / "data" / "arxiv_raw" / "index.json", ROOT / "data" / "arxiv_raw", "arxiv_raw")
    for date in raw_dates:
        raw = load(ROOT / "data" / "arxiv_raw" / f"{date}.json")
        require_keys(raw, {"date", "fetched_at", "source", "source_query", "count", "items"}, f"raw {date}")
        if raw["date"] != date or raw.get("status") != "uninterpreted_candidates":
            fail(f"raw {date} date/status mismatch")
        if raw["count"] != len(raw["items"]):
            fail(f"raw {date} count does not match items")
        for index, item in enumerate(raw["items"]):
            require_keys(item, RAW_ITEM_KEYS, f"raw {date} item {index}")
            if "summary_zh" in item or "analysis_zh" in item:
                fail(f"raw {date} item {index} contains interpreted Chinese fields; those belong in data/daily/")

    site = load(ROOT / "site.json")
    for key in ("title", "description", "language", "url", "base_path", "updated", "sections", "data"):
        if key not in site:
            fail(f"site.json missing {key}")
    if site["base_path"] != "/robot-grasp-papers/":
        fail("site.json base_path is not /robot-grasp-papers/")
    if site["url"] != "https://57cx.github.io/robot-grasp-papers/":
        fail("site.json url mismatch")
    section_ids = [item["id"] for item in site["sections"]]
    if section_ids != ["overview", "library", "plan", "daily"]:
        fail(f"unexpected sections {section_ids}")

    pages = ["index.html", "library.html", "plan.html", "daily.html"]
    for name in pages:
        parser = RefParser()
        parser.feed((ROOT / name).read_text(encoding="utf-8"))
        for ref in parser.refs:
            if ref.startswith("//"):
                continue
            target = (ROOT / name).parent / ref
            if not target.exists():
                fail(f"{name} references missing {ref}")

    script_names = ["common.js", "treemap.js", "home.js", "library.js", "plan.js", "daily.js"]
    for name in script_names:
        subprocess.check_call(["node", "--check", str(ROOT / "assets" / name)])
    subprocess.check_call(["node", "-e", """
const { layoutTreemap } = require("./assets/treemap.js");
const rects = layoutTreemap([{value:22},{value:20},{value:19},{value:18},{value:13},{value:11},{value:9},{value:9},{value:8},{value:8},{value:8}], 640, 320);
if (rects.length !== 11) process.exit(1);
const area = rects.reduce((sum, rect) => sum + rect.w * rect.h, 0);
if (Math.abs(area - 640 * 320) / (640 * 320) > 0.02) {
  console.error("treemap area", area);
  process.exit(1);
}
if (rects.some((rect) => rect.w < 0 || rect.h < 0 || rect.x < -0.1 || rect.y < -0.1)) process.exit(1);
"""], cwd=ROOT)
    subprocess.check_call([sys.executable, str(ROOT / "scripts" / "fetch_arxiv.py"), "--self-test"])
    print("verify ok", f"papers={len(papers)}", f"digests={len(digest_dates)}", f"raw={len(raw_dates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
