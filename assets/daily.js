(function () {
  const R = window.RGP;
  let digestDates = [];
  let rawDates = [];

  function emptyMark() {
    return '<svg class="empty-mark" viewBox="0 0 72 72" aria-hidden="true"><rect x="10" y="16" width="52" height="40" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 28h52M24 16v-4h24v4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M28 40h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function candidateHtml(item) {
    const keywords = (item.matched_keywords || []).map(function (word) {
      return '<span class="badge">' + R.escapeHtml(word) + "</span>";
    }).join("");
    const cats = (item.categories || []).map(function (cat) {
      return '<span class="badge code">' + R.escapeHtml(cat) + "</span>";
    }).join("");
    return (
      '<article class="candidate">' +
        '<div class="tag-row">' + cats + keywords + "</div>" +
        "<h3>" + R.externalLink(item.arxiv_url, R.prettyTitle(item.title)) + "</h3>" +
        '<p class="meta">' + R.escapeHtml(R.formatAuthors(item.authors, 6)) + "</p>" +
        '<p class="meta">主分类 ' + R.escapeHtml(item.primary_category || "") + " · 发布 " + R.escapeHtml(item.published || "") + "</p>" +
        '<div class="row-links">' + R.externalLink(item.arxiv_url, "arXiv") + R.externalLink(item.pdf_url, "PDF") + "</div>" +
        (item.summary ? "<details><summary>英文摘要（arXiv 原文）</summary><p>" + R.escapeHtml(item.summary) + "</p></details>" : "") +
      "</article>"
    );
  }

  function digestHtml(digest) {
    const items = (digest.items || []).slice().sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    const body = items.length ? items.map(function (item) {
      const tags = (item.tags || []).map(function (tag) {
        return '<span class="tag">' + R.escapeHtml(tag) + "</span>";
      }).join("");
      return (
        '<article class="digest-item candidate">' +
          '<div class="digest-top"><div class="tag-row"><span class="badge ' + R.reproClass(item.priority) + '">优先级 ' + R.escapeHtml(item.priority || "") + "</span>" + (item.categories || []).map(function (cat) {
            return '<span class="badge code">' + R.escapeHtml(cat) + "</span>";
          }).join("") + "</div><div class=\"score\" title=\"相关度\">" + R.escapeHtml(item.score) + "</div></div>" +
          "<h3>" + (item.arxiv_url ? R.externalLink(item.arxiv_url, R.prettyTitle(item.title)) : R.escapeHtml(R.prettyTitle(item.title))) + "</h3>" +
          '<p class="meta">' + R.escapeHtml(R.formatAuthors(item.authors, 6)) + "</p>" +
          "<p><strong>摘要。</strong> " + R.escapeHtml(item.summary_zh || "") + "</p>" +
          "<p><strong>分析。</strong> " + R.escapeHtml(item.analysis_zh || "") + "</p>" +
          '<div class="callout"><strong>与本硬件。</strong> ' + R.escapeHtml(item.relevance_zh || "") + "</div>" +
          '<div class="tag-row">' + tags + "</div>" +
        "</article>"
      );
    }).join("") : '<div class="empty-state"><h3>这一天的解读没有收录论文</h3><p>文件存在，但 items 为空。</p></div>';
    return (
      "<p class=\"kicker\">解读日报 · " + R.escapeHtml(digest.date || "") + "</p>" +
      "<h2>" + R.escapeHtml(digest.date || "") + "</h2>" +
      "<p>" + R.escapeHtml(digest.overview_zh || "") + "</p>" +
      '<p class="meta">来源说明：' + R.escapeHtml(digest.source_query || "") + "</p>" +
      body
    );
  }

  function renderArchive(selected) {
    const dates = R.sortDatesDesc(Array.from(new Set(digestDates.concat(rawDates))));
    const root = document.getElementById("archive");
    if (!dates.length) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    root.innerHTML = "<h2>日期</h2>" + dates.map(function (date) {
      const kind = digestDates.indexOf(date) !== -1 ? "解读" : "候选";
      return '<button type="button" data-date="' + R.escapeAttr(date) + '" aria-current="' + (date === selected ? "true" : "false") + '"><strong>' + R.escapeHtml(date) + '</strong><div class="meta">' + kind + "</div></button>";
    }).join("");
  }

  async function renderDate(date) {
    const root = document.getElementById("daily-main");
    const hasDigest = digestDates.indexOf(date) !== -1;
    const hasRaw = rawDates.indexOf(date) !== -1;
    const today = R.shanghaiToday();
    let html = "";
    if (hasDigest) {
      const digest = await R.fetchJson("data/daily/" + date + ".json");
      html += digestHtml(digest);
    }
    if (hasRaw) {
      const raw = await R.fetchJson("data/arxiv_raw/" + date + ".json");
      const heading = !hasDigest && date === today ? "今日新论文候选" : date + " 新论文候选";
      const items = raw.items || [];
      html += '<section class="section"><h2>' + R.escapeHtml(heading) + "</h2>";
      html += "<p class=\"muted\">这些条目来自 arXiv API 的关键词筛选，尚未当作解读。发布日期是论文在 arXiv 上的时间，抓取日是 " + R.escapeHtml(raw.date || date) + "。</p>";
      if (!items.length) {
        html += '<div class="empty-state"><h3>这一天没有新候选</h3><p>抓取已经跑过，窗口里没有尚未收录的命中。</p></div>';
      } else {
        html += items.map(candidateHtml).join("");
      }
      html += "</section>";
    }
    if (!hasDigest && !hasRaw) {
      html = '<div class="empty-state"><h2>这一天没有文件</h2><p>索引里没有 ' + R.escapeHtml(date) + "。</p></div>";
    }
    root.innerHTML = html;
    const url = new URL(location.href);
    url.searchParams.set("date", date);
    history.replaceState(null, "", url.pathname + url.search);
    renderArchive(date);
  }

  function renderEmpty() {
    document.getElementById("archive").hidden = true;
    document.getElementById("daily-main").innerHTML =
      '<div class="empty-state">' + emptyMark() +
        "<h2>还没有每日前沿</h2>" +
        "<p>解读日报和 arXiv 候选都还没写入。页面不会编造论文。</p>" +
        "<p class=\"muted\">助手把解读写到 <code>data/daily/YYYY-MM-DD.json</code>，并把它的日期加进 <code>data/daily/index.json</code>。自动任务把候选写到 <code>data/arxiv_raw/YYYY-MM-DD.json</code>。</p>" +
      "</div>";
  }

  async function init() {
    try {
      const dailyIndex = await R.fetchJson("data/daily/index.json");
      const rawIndex = await R.fetchJson("data/arxiv_raw/index.json");
      digestDates = R.sortDatesDesc(dailyIndex.dates || []);
      rawDates = R.sortDatesDesc(rawIndex.dates || []);
      const dates = R.sortDatesDesc(Array.from(new Set(digestDates.concat(rawDates))));
      if (!dates.length) {
        renderEmpty();
        return;
      }
      const requested = new URL(location.href).searchParams.get("date");
      const selected = dates.indexOf(requested) !== -1 ? requested : dates[0];
      document.getElementById("archive").addEventListener("click", function (event) {
        const button = event.target.closest("[data-date]");
        if (!button) return;
        renderDate(button.getAttribute("data-date")).catch(function (error) {
          R.showError("这一天的文件没有打开：" + error.message);
        });
      });
      await renderDate(selected);
    } catch (error) {
      R.showError("每日前沿没有加载成功：" + error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
