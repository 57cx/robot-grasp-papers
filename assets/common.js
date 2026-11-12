(function () {
  const PROGRESS_KEY = "robot-grasp-papers.progress.v1";

  const PALETTE = {
    survey: { fill: "#f0d3c4", ink: "#6e3012" },
    loco: { fill: "#cfe6e2", ink: "#134e49" },
    wbc: { fill: "#d5e2f2", ink: "#1a3f66" },
    system: { fill: "#e4d8f3", ink: "#4c3174" },
    grasp: { fill: "#f6dcc8", ink: "#8c3e16" },
    servo: { fill: "#d4ebf3", ink: "#0f556c" },
    force: { fill: "#f3ddd2", ink: "#6d3a22" },
    il: { fill: "#d7e7d4", ink: "#2c552b" },
    vla: { fill: "#f3d5e1", ink: "#6e3148" },
    sim: { fill: "#dde3ec", ink: "#334155" },
    teleop: { fill: "#f6e7c4", ink: "#6e5412" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", ".": "." };

  function toSub(text) {
    return String(text).replace(/[0-9.]/g, (ch) => SUB[ch] || ch);
  }

  function prettyTitle(title) {
    return String(title ?? "")
      .replace(/\$/g, "")
      .replace(/_\{([^}]+)\}/g, (_, inner) => toSub(inner))
      .replace(/_([0-9])/g, (_, digit) => toSub(digit));
  }

  function formatAuthors(authors, limit) {
    const list = Array.isArray(authors) ? authors : [];
    const max = limit == null ? 4 : limit;
    if (!list.length) return "";
    if (list.length <= max) return list.join("、");
    return list.slice(0, max).join("、") + " 等 " + list.length + " 人";
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(url + " → " + response.status);
    return response.json();
  }

  function palette(key) {
    return PALETTE[key] || { fill: "#efe8dc", ink: "#1a2332" };
  }

  function reproClass(value) {
    if (value === "高") return "high";
    if (value === "中") return "mid";
    if (value === "低") return "low";
    return "";
  }

  function shanghaiToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function sortDatesDesc(dates) {
    return (dates || []).slice().sort((a, b) => String(b).localeCompare(String(a)));
  }

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      return {
        read: raw.read && typeof raw.read === "object" ? raw.read : {},
        practice: raw.practice && typeof raw.practice === "object" ? raw.practice : {}
      };
    } catch (error) {
      return { read: {}, practice: {} };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function externalLink(href, label) {
    if (!href) return "";
    return '<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + "</a>";
  }

  function paperLinks(paper) {
    const links = [
      externalLink(paper.arxiv_url, "arXiv"),
      externalLink(paper.doi, "DOI"),
      externalLink(paper.code_url, "代码")
    ].filter(Boolean);
    if (!links.length) return '<span class="muted">无外部链接</span>';
    return '<div class="row-links">' + links.join("") + "</div>";
  }

  function setupNav() {
    const button = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!button || !nav) return;
    button.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function showError(message) {
    const node = document.getElementById("status");
    if (!node) return;
    node.hidden = false;
    node.textContent = message;
  }

  window.RGP = {
    PALETTE: PALETTE,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    prettyTitle: prettyTitle,
    formatAuthors: formatAuthors,
    fetchJson: fetchJson,
    palette: palette,
    reproClass: reproClass,
    shanghaiToday: shanghaiToday,
    sortDatesDesc: sortDatesDesc,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    paperLinks: paperLinks,
    externalLink: externalLink,
    showError: showError
  };

  document.addEventListener("DOMContentLoaded", setupNav);
})();
