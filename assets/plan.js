(function () {
  const R = window.RGP;
  let papers = new Map();
  let plan = null;
  let progress = R.loadProgress();

  function paperOf(id) {
    return papers.get(id);
  }

  function splitPractice(text) {
    return String(text || "").split(/[；;]/).map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function allPaperIds() {
    const ids = new Set();
    (plan.stages || []).forEach(function (stage) {
      (stage.core || []).forEach(function (id) { ids.add(id); });
      (stage.optional || []).forEach(function (id) { ids.add(id); });
      (stage.first_read || []).forEach(function (id) { ids.add(id); });
    });
    return Array.from(ids);
  }

  function stageIds(stage) {
    return Array.from(new Set([].concat(stage.core || [], stage.optional || [], stage.first_read || [])));
  }

  function updateProgressUi() {
    const ids = allPaperIds();
    const done = ids.filter(function (id) { return progress.read[id]; }).length;
    const bar = document.getElementById("total-progress");
    if (bar) bar.style.width = (ids.length ? (done / ids.length) * 100 : 0) + "%";
    const label = document.getElementById("total-progress-label");
    if (label) label.textContent = "已读 " + done + " / " + ids.length + " 篇（核心与选读去重）";
    (plan.stages || []).forEach(function (stage) {
      const stageList = stageIds(stage);
      const stageDone = stageList.filter(function (id) { return progress.read[id]; }).length;
      const node = document.querySelector('[data-stage-bar="' + stage.stage + '"]');
      if (node) node.style.width = (stageList.length ? (stageDone / stageList.length) * 100 : 0) + "%";
      const text = document.querySelector('[data-stage-label="' + stage.stage + '"]');
      if (text) text.textContent = stageDone + " / " + stageList.length;
    });
    document.querySelectorAll("[data-read]").forEach(function (box) {
      box.checked = !!progress.read[box.getAttribute("data-read")];
    });
    document.querySelectorAll("[data-practice]").forEach(function (box) {
      box.checked = !!progress.practice[box.getAttribute("data-practice")];
    });
  }

  function paperRow(id, first) {
    const paper = paperOf(id);
    const title = paper ? R.prettyTitle(paper.title) : id;
    const meta = paper
      ? paper.year + " · " + paper.venue + " · 可复现性 " + paper.reproducibility + (paper.code_url ? " · 有代码" : "")
      : "论文库中没有这个 id";
    return (
      '<div class="read-row">' +
        '<input type="checkbox" data-read="' + R.escapeAttr(id) + '" aria-label="标记已读：' + R.escapeAttr(title) + '">' +
        "<div><a href=\"library.html?id=" + encodeURIComponent(id) + "\">" + R.escapeHtml(title) + "</a> " +
        (first ? '<span class="badge high">先读</span>' : "") +
        '<div class="meta">' + R.escapeHtml(meta) + "</div></div></div>"
    );
  }

  function renderTimeline() {
    let cursor = 1;
    document.getElementById("timeline").innerHTML = (plan.stages || []).map(function (stage) {
      const start = cursor;
      const end = cursor + Number(stage.weeks) - 1;
      cursor = end + 1;
      return '<button type="button" class="week-block tone-' + stage.stage + '" style="--span:' + Number(stage.weeks) + '" data-jump="stage-' + stage.stage + '"><b>第 ' + start + "–" + end + ' 周</b><span>阶段 ' + stage.stage + " · " + R.escapeHtml(stage.name) + "</span></button>";
    }).join("");
  }

  function renderStages() {
    document.getElementById("stages").innerHTML = (plan.stages || []).map(function (stage) {
      const first = new Set(stage.first_read || []);
      const core = stage.core || [];
      const optional = stage.optional || [];
      const extras = (stage.first_read || []).filter(function (id) { return core.indexOf(id) === -1; });
      const practice = splitPractice(stage.practice).map(function (item, index) {
        const key = stage.stage + ":" + index;
        return '<div class="read-row"><input type="checkbox" data-practice="' + key + '" aria-label="完成动手项：' + R.escapeAttr(item) + '"><div>' + R.escapeHtml(item) + "</div></div>";
      }).join("");
      return (
        '<article class="stage" id="stage-' + stage.stage + '">' +
          "<header><div><p class=\"kicker\">阶段 " + stage.stage + " · " + R.escapeHtml(stage.weeks) + " 周</p><h2>" + R.escapeHtml(stage.name) + "</h2></div><strong data-stage-label=\"" + stage.stage + "\"></strong></header>" +
          '<div class="progress" aria-hidden="true"><i data-stage-bar="' + stage.stage + '"></i></div>' +
          "<p>" + R.escapeHtml(stage.goal) + "</p>" +
          "<h3>核心阅读</h3><div class=\"read-list\">" + core.concat(extras).map(function (id) { return paperRow(id, first.has(id)); }).join("") + "</div>" +
          "<h3>选读</h3><div class=\"read-list\">" + (optional.length ? optional.map(function (id) { return paperRow(id, false); }).join("") : '<p class="muted">这一阶段没有选读。</p>') + "</div>" +
          "<h3>配套动手</h3><div class=\"practice read-list\">" + practice + "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderIdeas() {
    document.getElementById("ideas").innerHTML = (plan.research_ideas || []).map(function (idea, index) {
      const refs = (idea.refs || []).map(function (id) {
        const paper = paperOf(id);
        const label = paper ? R.prettyTitle(paper.title) : id;
        return '<a class="tag" href="library.html?id=' + encodeURIComponent(id) + '">' + R.escapeHtml(label) + "</a>";
      }).join("");
      return '<article class="idea"><p class="kicker">研究设想 0' + (index + 1) + "</p><h3>" + R.escapeHtml(idea.title) + "</h3><p>" + R.escapeHtml(idea.text) + '</p><div class="tag-row">' + refs + "</div></article>";
    }).join("");
  }

  function renderTools() {
    document.getElementById("tools").innerHTML = (plan.hardware_resources || []).map(function (tool) {
      return '<article class="tool"><a href="' + R.escapeAttr(tool.url) + '" target="_blank" rel="noopener noreferrer">' + R.escapeHtml(tool.name) + '</a><div class="meta">' + R.escapeHtml(tool.url) + "</div></article>";
    }).join("");
  }

  function bind() {
    document.getElementById("plan").addEventListener("click", function (event) {
      const jump = event.target.closest("[data-jump]");
      if (jump) {
        const node = document.getElementById(jump.getAttribute("data-jump"));
        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    document.getElementById("plan").addEventListener("change", function (event) {
      const read = event.target.getAttribute("data-read");
      const practice = event.target.getAttribute("data-practice");
      if (read) progress.read[read] = event.target.checked;
      if (practice) progress.practice[practice] = event.target.checked;
      R.saveProgress(progress);
      updateProgressUi();
    });
    document.getElementById("reset-progress").addEventListener("click", function () {
      if (!window.confirm("清除这台浏览器里保存的阅读勾选？")) return;
      progress = { read: {}, practice: {} };
      R.saveProgress(progress);
      updateProgressUi();
    });
  }

  async function init() {
    try {
      const list = await R.fetchJson("data/papers.json");
      papers = new Map(list.map(function (paper) { return [paper.id, paper]; }));
      plan = await R.fetchJson("data/reading_plan.json");
      document.getElementById("plan-updated").textContent = "计划更新于 " + plan.updated + " · 共 " + plan.total_weeks + " 周";
      renderTimeline();
      renderStages();
      renderIdeas();
      renderTools();
      bind();
      updateProgressUi();
    } catch (error) {
      R.showError("阅读计划没有加载成功：" + error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
