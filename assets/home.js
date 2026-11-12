(function () {
  const R = window.RGP;

  function countBy(papers, keyFn) {
    const map = new Map();
    papers.forEach(function (paper) {
      const key = keyFn(paper);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function table(headers, rows) {
    const head = "<tr>" + headers.map(function (cell) { return "<th>" + R.escapeHtml(cell) + "</th>"; }).join("") + "</tr>";
    const body = rows.map(function (row) {
      return "<tr>" + row.map(function (cell) { return "<td>" + R.escapeHtml(cell) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return "<table><thead>" + head + "</thead><tbody>" + body + "</tbody></table>";
  }

  function mountChart(canvas, config, summary) {
    const box = canvas.parentElement;
    if (summary) box.setAttribute("aria-label", summary);
    if (!window.Chart) {
      canvas.insertAdjacentHTML("beforebegin", "<p class=\"muted\">图表没有加载，数据表仍然可用。</p>");
      return;
    }
    try {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    config.options = config.options || {};
    config.options.animation = reduce ? false : { duration: 500 };
    config.options.maintainAspectRatio = false;
    config.options.plugins = Object.assign({
      legend: { labels: { font: { family: getComputedStyle(document.body).fontFamily } } }
    }, config.options.plugins || {});
    return new window.Chart(canvas, config);
    } catch (error) {
      canvas.insertAdjacentHTML("beforebegin", "<p class=\"muted\">图表没有画出来，数据表仍然可用。</p>");
      return null;
    }
  }

  function renderStats(papers) {
    const withCode = papers.filter(function (paper) { return paper.code_url; }).length;
    const high = papers.filter(function (paper) { return paper.reproducibility === "高"; }).length;
    const categories = new Set(papers.map(function (paper) { return paper.category; }));
    const years = papers.map(function (paper) { return paper.year; });
    const stats = [
      [String(papers.length), "已核对论文"],
      [String(categories.size), "主题类别"],
      [String(withCode), "附有代码"],
      [String(high), "可复现性「高」"]
    ];
    document.getElementById("stats").innerHTML = stats.map(function (item) {
      return "<article class=\"stat\"><b>" + R.escapeHtml(item[0]) + "</b><span>" + R.escapeHtml(item[1]) + "</span></article>";
    }).join("");
    const minYear = Math.min.apply(null, years);
    const maxYear = Math.max.apply(null, years);
    const note = document.getElementById("year-span");
    if (note) note.textContent = "年份跨度 " + minYear + "–" + maxYear + "。统计全部由 data/papers.json 现场计算。";
  }

  function renderCharts(papers) {
    const order = [];
    papers.forEach(function (paper) {
      if (!order.some(function (item) { return item.key === paper.category_key; })) {
        order.push({ key: paper.category_key, name: paper.category });
      }
    });
    const catCounts = countBy(papers, function (paper) { return paper.category_key; });
    const yearCounts = countBy(papers, function (paper) { return paper.year; });
    const years = Array.from(yearCounts.keys()).sort(function (a, b) { return a - b; });
    const reproOrder = ["高", "中", "低"];
    const reproCounts = reproOrder.map(function (name) {
      return papers.filter(function (paper) { return paper.reproducibility === name; }).length;
    });
    const codeCounts = [
      papers.filter(function (paper) { return paper.code_url; }).length,
      papers.filter(function (paper) { return !paper.code_url; }).length
    ];

    const catRows = order.map(function (item) { return [item.name, String(catCounts.get(item.key) || 0)]; });
    document.getElementById("cat-table").innerHTML = table(["类别", "篇数"], catRows);
    document.getElementById("year-table").innerHTML = table(["年份", "篇数"], years.map(function (year) {
      return [String(year), String(yearCounts.get(year))];
    }));
    document.getElementById("repro-table").innerHTML = table(["可复现性", "篇数"], reproOrder.map(function (name, index) {
      return [name, String(reproCounts[index])];
    }));
    document.getElementById("code-table").innerHTML = table(["代码", "篇数"], [["有代码", String(codeCounts[0])], ["无代码", String(codeCounts[1])]]);

    const font = getComputedStyle(document.body).fontFamily;
    const catColors = order.map(function (item) { return R.palette(item.key).fill; });
    const catBorders = order.map(function (item) { return R.palette(item.key).ink; });

    mountChart(document.getElementById("chart-category"), {
      type: "bar",
      data: {
        labels: order.map(function (item) { return item.name; }),
        datasets: [{
          label: "篇数",
          data: order.map(function (item) { return catCounts.get(item.key) || 0; }),
          backgroundColor: catColors,
          borderColor: catBorders,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { precision: 0, font: { family: font } } }, y: { ticks: { font: { family: font } } } },
        onClick: function (_event, elements) {
          if (!elements.length) return;
          const key = order[elements[0].index].key;
          location.href = "library.html?category=" + encodeURIComponent(key);
        }
      }
    }, "各类别论文数量");

    mountChart(document.getElementById("chart-year"), {
      type: "bar",
      data: {
        labels: years.map(String),
        datasets: [{
          label: "篇数",
          data: years.map(function (year) { return yearCounts.get(year); }),
          backgroundColor: "#1d6a64"
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { precision: 0 } } },
        onClick: function (_event, elements) {
          if (!elements.length) return;
          location.href = "library.html?year=" + encodeURIComponent(years[elements[0].index]);
        }
      }
    }, "各年份论文数量");

    mountChart(document.getElementById("chart-repro"), {
      type: "doughnut",
      data: {
        labels: reproOrder,
        datasets: [{ data: reproCounts, backgroundColor: ["#1d6a64", "#c6a15b", "#8a5a62"] }]
      },
      options: {
        plugins: { legend: { position: "bottom" } },
        onClick: function (_event, elements) {
          if (!elements.length) return;
          location.href = "library.html?repro=" + encodeURIComponent(reproOrder[elements[0].index]);
        }
      }
    }, "可复现性分布");

    mountChart(document.getElementById("chart-code"), {
      type: "doughnut",
      data: {
        labels: ["有代码", "无代码"],
        datasets: [{ data: codeCounts, backgroundColor: ["#1f4e79", "#e4d8c8"] }]
      },
      options: {
        plugins: { legend: { position: "bottom" } },
        onClick: function (_event, elements) {
          if (!elements.length) return;
          location.href = "library.html?code=" + (elements[0].index === 0 ? "1" : "0");
        }
      }
    }, "代码是否公开");
  }

  function renderTop3(papers, plan) {
    const byId = new Map(papers.map(function (paper) { return [paper.id, paper]; }));
    const root = document.getElementById("top3");
    root.innerHTML = (plan.top3 || []).map(function (id, index) {
      const paper = byId.get(id);
      if (!paper) {
        return "<article class=\"top-card\"><span class=\"idx\">0" + (index + 1) + "</span><h3>" + R.escapeHtml(id) + "</h3><p class=\"muted\">论文库中没有这个 id。</p></article>";
      }
      return (
        "<article class=\"top-card\">" +
          "<span class=\"idx\">0" + (index + 1) + "</span>" +
          "<div class=\"tag-row\"><span class=\"badge " + R.reproClass(paper.reproducibility) + "\">可复现性 " + R.escapeHtml(paper.reproducibility) + "</span><span class=\"badge\">" + R.escapeHtml(paper.category) + "</span></div>" +
          "<h3>" + R.escapeHtml(R.prettyTitle(paper.title)) + "</h3>" +
          "<p class=\"meta\">" + R.escapeHtml(paper.year + " · " + paper.venue) + "</p>" +
          "<p>" + R.escapeHtml(paper.relevance_zh) + "</p>" +
          R.paperLinks(paper) +
          "<div class=\"row-links\"><a href=\"library.html?id=" + encodeURIComponent(paper.id) + "\">在论文库中打开</a></div>" +
        "</article>"
      );
    }).join("");
  }

  function itemPreview(item) {
    const title = item.arxiv_url
      ? '<a href="' + R.escapeAttr(item.arxiv_url) + '" target="_blank" rel="noopener noreferrer">' + R.escapeHtml(R.prettyTitle(item.title)) + "</a>"
      : R.escapeHtml(R.prettyTitle(item.title));
    const authors = R.formatAuthors(item.authors, 3);
    const extra = item.priority ? " · 优先级 " + item.priority : "";
    return "<div class=\"item\"><h3>" + title + "</h3><p class=\"meta\">" + R.escapeHtml(authors + extra) + "</p><p>" + R.escapeHtml(item.relevance_zh || item.summary_zh || "") + "</p></div>";
  }

  async function renderDailyPreview() {
    const root = document.getElementById("daily-preview");
    const dailyIndex = await R.fetchJson("data/daily/index.json");
    const rawIndex = await R.fetchJson("data/arxiv_raw/index.json");
    const digestDates = R.sortDatesDesc(dailyIndex.dates || []);
    const rawDates = R.sortDatesDesc(rawIndex.dates || []);
    if (digestDates.length) {
      const date = digestDates[0];
      const digest = await R.fetchJson("data/daily/" + date + ".json");
      const items = (digest.items || []).slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, 3);
      root.innerHTML =
        "<p class=\"kicker\">最新解读 · " + R.escapeHtml(date) + "</p>" +
        "<h2>每日前沿</h2>" +
        "<p>" + R.escapeHtml(digest.overview_zh || "") + "</p>" +
        items.map(itemPreview).join("") +
        "<p><a class=\"btn btn-line\" href=\"daily.html?date=" + encodeURIComponent(date) + "\">阅读这一天</a></p>";
      return;
    }
    if (rawDates.length) {
      const date = rawDates[0];
      const raw = await R.fetchJson("data/arxiv_raw/" + date + ".json");
      const today = R.shanghaiToday();
      const heading = date === today ? "今日新论文候选" : date + " 新论文候选";
      const items = (raw.items || []).slice(0, 3);
      if (!items.length) {
        root.innerHTML =
          "<p class=\"kicker\">" + R.escapeHtml(date) + "</p><h2>" + R.escapeHtml(heading) + "</h2>" +
          "<p>自动抓取已运行，这一天没有新的候选论文。解读日报尚未写入。</p>" +
          "<p><a class=\"btn btn-line\" href=\"daily.html?date=" + encodeURIComponent(date) + "\">打开每日前沿</a></p>";
        return;
      }
      root.innerHTML =
        "<p class=\"kicker\">尚未人工解读 · " + R.escapeHtml(date) + "</p>" +
        "<h2>" + R.escapeHtml(heading) + "</h2>" +
        "<p class=\"muted\">以下标题来自 arXiv API，只显示原文信息，没有中文解读。</p>" +
        items.map(function (item) { return itemPreview(item); }).join("") +
        "<p><a class=\"btn btn-line\" href=\"daily.html?date=" + encodeURIComponent(date) + "\">查看全部候选</a></p>";
      return;
    }
    root.innerHTML =
      "<div class=\"empty-state\">" +
        "<h2>每日前沿还是空的</h2>" +
        "<p>目前没有解读日报，也没有已入库的 arXiv 候选。日报由助手写入 <code>data/daily/</code>；候选由每天的抓取任务写入 <code>data/arxiv_raw/</code>。</p>" +
        "<p><a class=\"btn btn-line\" href=\"daily.html\">打开每日前沿</a></p>" +
      "</div>";
  }

  async function init() {
    try {
      const papers = await R.fetchJson("data/papers.json");
      const plan = await R.fetchJson("data/reading_plan.json");
      renderStats(papers);
      renderCharts(papers);
      renderTop3(papers, plan);
      const progress = R.loadProgress();
      const readCount = Object.keys(progress.read).filter(function (id) { return progress.read[id]; }).length;
      const slot = document.getElementById("progress-note");
      if (slot && readCount) slot.textContent = "本机已勾选阅读 " + readCount + " 篇。";
      await renderDailyPreview();
    } catch (error) {
      R.showError("总览数据没有加载成功：" + error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
