(function () {
  const R = window.RGP;
  const VIEW_KEY = "robot-grasp-papers.library.view";
  let papers = [];
  let filters = { q: "", category: "", year: "", tag: "", repro: "", code: "", sort: "year-desc", view: "card" };
  let openId = "";
  let shouldScroll = false;

  function paramsFromUrl() {
    const url = new URL(location.href);
    ["q", "category", "year", "tag", "repro", "code", "sort"].forEach(function (key) {
      const value = url.searchParams.get(key);
      if (value) filters[key] = value;
    });
    const id = url.searchParams.get("id") || (location.hash ? decodeURIComponent(location.hash.slice(1)) : "");
    if (id) {
      openId = id;
      shouldScroll = true;
    }
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "card" || saved === "table") filters.view = saved;
  }

  function writeUrl() {
    const url = new URL(location.href);
    ["q", "category", "year", "tag", "repro", "code", "sort"].forEach(function (key) {
      if (filters[key] && !(key === "sort" && filters[key] === "year-desc")) url.searchParams.set(key, filters[key]);
      else url.searchParams.delete(key);
    });
    if (openId) url.searchParams.set("id", openId);
    else url.searchParams.delete("id");
    history.replaceState(null, "", url.pathname + url.search);
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values)).sort(function (a, b) {
      if (typeof a === "number" && typeof b === "number") return b - a;
      return String(a).localeCompare(String(b), "zh");
    });
  }

  function fillControls() {
    const categories = [];
    papers.forEach(function (paper) {
      if (!categories.some(function (item) { return item.key === paper.category_key; })) {
        categories.push({ key: paper.category_key, name: paper.category });
      }
    });
    const catSelect = document.getElementById("filter-category");
    catSelect.innerHTML = '<option value="">全部类别</option>' + categories.map(function (item) {
      const count = papers.filter(function (paper) { return paper.category_key === item.key; }).length;
      return '<option value="' + R.escapeAttr(item.key) + '">' + R.escapeHtml(item.name) + "（" + count + "）</option>";
    }).join("");
    const years = uniqueSorted(papers.map(function (paper) { return paper.year; }));
    document.getElementById("filter-year").innerHTML = '<option value="">全部年份</option>' + years.map(function (year) {
      return '<option value="' + year + '">' + year + "</option>";
    }).join("");
    const tagCounts = new Map();
    papers.forEach(function (paper) {
      (paper.tags || []).forEach(function (tag) { tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1); });
    });
    const tags = Array.from(tagCounts.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    document.getElementById("filter-tag").innerHTML = '<option value="">全部标签</option>' + tags.map(function (pair) {
      return '<option value="' + R.escapeAttr(pair[0]) + '">' + R.escapeHtml(pair[0]) + "（" + pair[1] + "）</option>";
    }).join("");
    document.getElementById("filter-q").value = filters.q;
    catSelect.value = filters.category;
    document.getElementById("filter-year").value = filters.year;
    document.getElementById("filter-tag").value = filters.tag;
    document.getElementById("filter-repro").value = filters.repro;
    document.getElementById("filter-code").value = filters.code;
    document.getElementById("filter-sort").value = filters.sort;
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-view") === filters.view ? "true" : "false");
    });
  }

  function matches(paper) {
    if (filters.category && paper.category_key !== filters.category && paper.category !== filters.category) return false;
    if (filters.year && String(paper.year) !== String(filters.year)) return false;
    if (filters.tag && !(paper.tags || []).includes(filters.tag)) return false;
    if (filters.repro && paper.reproducibility !== filters.repro) return false;
    if (filters.code === "1" && !paper.code_url) return false;
    if (filters.code === "0" && paper.code_url) return false;
    if (filters.q) {
      const blob = [
        paper.title, paper.id, paper.venue, paper.category, paper.summary_zh, paper.relevance_zh,
        (paper.authors || []).join(" "), (paper.tags || []).join(" ")
      ].join("\n").toLowerCase();
      if (!blob.includes(filters.q.trim().toLowerCase())) return false;
    }
    return true;
  }

  function sortPapers(list) {
    const rank = { "高": 0, "中": 1, "低": 2 };
    return list.slice().sort(function (a, b) {
      if (filters.sort === "year-asc") return a.year - b.year || a.title.localeCompare(b.title);
      if (filters.sort === "repro") return (rank[a.reproducibility] ?? 9) - (rank[b.reproducibility] ?? 9) || b.year - a.year;
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return b.year - a.year || a.title.localeCompare(b.title);
    });
  }

  function detailHtml(paper) {
    const authors = paper.authors || [];
    const shown = authors.length > 12
      ? R.escapeHtml(authors.slice(0, 8).join("、")) + " 等 " + authors.length + " 人"
      : R.escapeHtml(authors.join("、"));
    const authorBlock = authors.length > 12
      ? "<p class=\"meta\">作者：" + shown + "</p><details><summary>全部作者</summary><p class=\"meta\">" + R.escapeHtml(authors.join("、")) + "</p></details>"
      : "<p class=\"meta\">作者：" + shown + "</p>";
    return (
      "<div class=\"expand\">" +
        "<p><strong>摘要。</strong> " + R.escapeHtml(paper.summary_zh) + "</p>" +
        "<div class=\"callout\"><strong>与本硬件。</strong> " + R.escapeHtml(paper.relevance_zh) + "</div>" +
        authorBlock +
        "<p class=\"meta\">会议来源：" + R.escapeHtml(paper.venue_source || "") + " · 核对：" + R.escapeHtml(paper.verified_via || "") + "</p>" +
        R.paperLinks(paper) +
      "</div>"
    );
  }

  function cardHtml(paper) {
    const color = R.palette(paper.category_key);
    const open = paper.id === openId;
    const tags = (paper.tags || []).slice(0, 6).map(function (tag) {
      return '<button type="button" class="tag" data-tag="' + R.escapeAttr(tag) + '">' + R.escapeHtml(tag) + "</button>";
    }).join("");
    return (
      '<article class="paper-card' + (open ? " is-open" : "") + '" id="paper-' + R.escapeAttr(paper.id) + '" style="--cat:' + color.ink + '">' +
        '<div class="tag-row">' +
          '<span class="badge ' + R.reproClass(paper.reproducibility) + '">' + R.escapeHtml(paper.reproducibility) + "</span>" +
          '<span class="badge">' + R.escapeHtml(paper.category) + "</span>" +
          (paper.code_url ? '<span class="badge code">有代码</span>' : "") +
          '<span class="badge">' + R.escapeHtml(paper.year) + "</span>" +
        "</div>" +
        "<h3>" + R.escapeHtml(R.prettyTitle(paper.title)) + "</h3>" +
        '<p class="paper-meta">' + R.escapeHtml(R.formatAuthors(paper.authors, 4)) + " · " + R.escapeHtml(paper.venue) + "</p>" +
        '<div class="tag-row">' + tags + "</div>" +
        '<button type="button" class="btn btn-line" data-open="' + R.escapeAttr(paper.id) + '" aria-expanded="' + (open ? "true" : "false") + '">' + (open ? "收起" : "展开") + "</button>" +
        (open ? detailHtml(paper) : "") +
      "</article>"
    );
  }

  function tableHtml(list) {
    const rows = list.map(function (paper) {
      const open = paper.id === openId;
      return (
        '<tr id="paper-' + R.escapeAttr(paper.id) + '" data-open="' + R.escapeAttr(paper.id) + '" class="' + (open ? "is-open" : "") + '">' +
          "<td><a href=\"library.html?id=" + encodeURIComponent(paper.id) + "\">" + R.escapeHtml(R.prettyTitle(paper.title)) + "</a><div class=\"meta\">" + R.escapeHtml(R.formatAuthors(paper.authors, 3)) + "</div></td>" +
          "<td>" + R.escapeHtml(paper.year) + "</td>" +
          "<td>" + R.escapeHtml(paper.venue) + "</td>" +
          "<td>" + R.escapeHtml(paper.category) + "</td>" +
          '<td><span class="badge ' + R.reproClass(paper.reproducibility) + '">' + R.escapeHtml(paper.reproducibility) + "</span></td>" +
          "<td>" + (paper.code_url ? "有" : "无") + "</td>" +
        "</tr>" +
        (open ? '<tr class="is-open"><td colspan="6">' + detailHtml(paper) + "</td></tr>" : "")
      );
    }).join("");
    return '<div class="table-wrap"><table class="papers"><thead><tr><th>标题</th><th>年份</th><th>会议 / 期刊</th><th>类别</th><th>可复现性</th><th>代码</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function renderTreemap(list) {
    const host = document.getElementById("treemap");
    const counts = new Map();
    list.forEach(function (paper) {
      if (!counts.has(paper.category_key)) counts.set(paper.category_key, { key: paper.category_key, name: paper.category, value: 0 });
      counts.get(paper.category_key).value += 1;
    });
    const items = Array.from(counts.values());
    const width = host.clientWidth || 640;
    const height = host.clientHeight || 320;
    const rects = R.layoutTreemap(items, width, height);
    host.innerHTML = rects.map(function (rect) {
      const color = R.palette(rect.item.key);
      const label = rect.w > 92 && rect.h > 52
        ? "<strong>" + R.escapeHtml(rect.item.name) + "</strong><span>" + rect.item.value + "</span>"
        : (rect.w > 40 && rect.h > 32 ? "<span>" + rect.item.value + "</span>" : "");
      return '<button type="button" data-category="' + R.escapeAttr(rect.item.key) + '" aria-pressed="' + (filters.category === rect.item.key ? "true" : "false") + '" title="' + R.escapeAttr(rect.item.name + " " + rect.item.value) + '" style="left:' + rect.x + "px;top:" + rect.y + "px;width:" + Math.max(rect.w - 4, 0) + "px;height:" + Math.max(rect.h - 4, 0) + "px;background:" + color.fill + ";color:" + color.ink + '">' + label + "</button>";
    }).join("");
    const selected = filters.category;
    const pool = selected ? papers.filter(function (paper) { return paper.category_key === selected; }) : list;
    const tagCounts = new Map();
    pool.forEach(function (paper) {
      (paper.tags || []).forEach(function (tag) { tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1); });
    });
    const top = Array.from(tagCounts.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 18);
    const caption = document.getElementById("tag-caption");
    caption.textContent = selected
      ? "「" + (pool[0] ? pool[0].category : selected) + "」里出现较多的标签"
      : "当前结果里出现较多的标签";
    document.getElementById("tag-cloud").innerHTML = top.map(function (pair) {
      return '<button type="button" class="tag" data-tag="' + R.escapeAttr(pair[0]) + '" aria-pressed="' + (filters.tag === pair[0] ? "true" : "false") + '">' + R.escapeHtml(pair[0]) + " " + pair[1] + "</button>";
    }).join("") || '<p class="muted">这个范围里没有标签。</p>';
  }

  function render() {
    const list = sortPapers(papers.filter(matches));
    document.getElementById("result-count").textContent = "显示 " + list.length + " / " + papers.length;
    const root = document.getElementById("results");
    if (!list.length) {
      root.innerHTML = '<div class="empty-state"><h2>没有符合条件的论文</h2><p>换一个关键词，或清除筛选。</p></div>';
    } else if (filters.view === "table") {
      root.innerHTML = tableHtml(list);
    } else {
      root.innerHTML = '<div class="cards">' + list.map(cardHtml).join("") + "</div>";
    }
    const savedCategory = filters.category;
    filters.category = "";
    const treemapSource = papers.filter(matches);
    filters.category = savedCategory;
    renderTreemap(treemapSource);
    writeUrl();
    if (shouldScroll && openId) {
      const node = document.getElementById("paper-" + openId);
      if (node) node.scrollIntoView({ block: "center" });
      shouldScroll = false;
    }
  }

  function bind() {
    let timer = 0;
    document.getElementById("filters").addEventListener("submit", function (event) {
      event.preventDefault();
    });
    document.getElementById("filter-q").addEventListener("input", function (event) {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        filters.q = event.target.value;
        openId = "";
        render();
      }, 140);
    });
    [["filter-category", "category"], ["filter-year", "year"], ["filter-tag", "tag"], ["filter-repro", "repro"], ["filter-code", "code"], ["filter-sort", "sort"]].forEach(function (pair) {
      document.getElementById(pair[0]).addEventListener("change", function (event) {
        filters[pair[1]] = event.target.value;
        openId = "";
        render();
      });
    });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        filters.view = button.getAttribute("data-view");
        localStorage.setItem(VIEW_KEY, filters.view);
        document.querySelectorAll("[data-view]").forEach(function (item) {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        render();
      });
    });
    document.getElementById("clear-filters").addEventListener("click", function () {
      filters = { q: "", category: "", year: "", tag: "", repro: "", code: "", sort: "year-desc", view: filters.view };
      openId = "";
      fillControls();
      render();
    });
    document.getElementById("library").addEventListener("click", function (event) {
      const link = event.target.closest("a");
      if (link && link.origin === location.origin && /library\.html$/.test(link.pathname)) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const id = new URL(link.href).searchParams.get("id");
        if (id) {
          event.preventDefault();
          openId = openId === id ? "" : id;
          render();
          return;
        }
      }
      const tagButton = event.target.closest("[data-tag]");
      if (tagButton) {
        filters.tag = tagButton.getAttribute("data-tag");
        document.getElementById("filter-tag").value = filters.tag;
        openId = "";
        render();
        return;
      }
      const categoryButton = event.target.closest("[data-category]");
      if (categoryButton) {
        const key = categoryButton.getAttribute("data-category");
        filters.category = filters.category === key ? "" : key;
        document.getElementById("filter-category").value = filters.category;
        openId = "";
        render();
        return;
      }
      const opener = event.target.closest("[data-open]");
      if (opener && event.target.tagName !== "A") {
        const id = opener.getAttribute("data-open");
        openId = openId === id ? "" : id;
        render();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "/" && document.activeElement && document.activeElement.tagName !== "INPUT") {
        event.preventDefault();
        document.getElementById("filter-q").focus();
      }
    });
    window.addEventListener("resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { renderTreemap(sortPapers(papers.filter(matches))); }, 120);
    });
  }

  async function init() {
    try {
      papers = await R.fetchJson("data/papers.json");
      paramsFromUrl();
      fillControls();
      bind();
      render();
    } catch (error) {
      R.showError("论文库没有加载成功：" + error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
