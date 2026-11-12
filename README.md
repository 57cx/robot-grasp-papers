# 腿臂移动操作与精细抓取论文库

面向 **Unitree GO2 EDU**、**AgileX PiPER / PiPER-X**、**Intel RealSense D435i / D405** 的论文枢纽。页面是中文静态站，发布在 GitHub Pages：

https://57cx.github.io/robot-grasp-papers/

论文事实以 `data/papers.json` 为唯一来源。站点只读取它，不在页面里改写标题、作者、年份、链接或摘要。阅读计划以 `data/reading_plan.json` 为准，`data/reading_plan.md` 是同一计划的叙述稿。

## 页面

| 路径 | 内容 |
|---|---|
| `index.html` | 总览：硬件说明、由数据算出的统计、类别 / 年份 / 可复现性 / 代码图表、先读 3 篇、每日前沿预览 |
| `library.html` | 论文库：检索和筛选、卡片或表格、展开后的中文摘要与链接、类别树图和标签 |
| `plan.html` | 4 个阶段、12 周时间轴、论文与动手勾选、5 个研究设想、工具链 |
| `daily.html` | 每日解读；没有解读时显示 arXiv 候选。两边都没有文件时是空状态，不放示例论文 |
| `site.json` | 给外部枢纽（例如 han-learning-hub）发现本站的清单 |

图表用 [Chart.js 4.4.6](https://www.chartjs.org/)（MIT），文件在 `assets/chart.umd.min.js`。阅读勾选存在浏览器 `localStorage` 键 `robot-grasp-papers.progress.v1`，不上报。

资源都用相对路径，以便站点挂在 `/robot-grasp-papers/` 下，本地用静态服务器打开时也能用。

## 目录

```
index.html library.html plan.html daily.html   页面
site.json                                       站点清单
assets/                                         样式、脚本、图表库
data/papers.json                                145 篇已核对论文
data/reading_plan.json                          阅读计划
data/reading_plan.md                            阅读计划叙述稿
data/daily/index.json                           已有解读的日期，新的在前
data/daily/YYYY-MM-DD.json                      某一天的解读
data/daily/digest.schema.json                   解读的 JSON Schema
data/arxiv_raw/index.json                       已抓取候选的日期，新的在前
data/arxiv_raw/YYYY-MM-DD.json                  当天未解读的 arXiv 候选
data/arxiv_raw/raw.schema.json                  候选的 JSON Schema
scripts/fetch_arxiv.py                          调用公开 arXiv API
scripts/verify_site.py                          校验数据锁、索引和页面引用
.github/workflows/arxiv-daily.yml               每天抓取并提交候选
.github/workflows/pages.yml                     校验后发布到 GitHub Pages
```

`scripts/verify_site.py` 锁定了三份源文件的 SHA-256。更新论文库或阅读计划时，需要同时改这三份文件里的校验值，否则 Pages 工作流会失败。日常抓取只写 `data/arxiv_raw/` 和 `site.json` 的更新时间，不会碰论文库。

## 论文字段

`data/papers.json` 是数组。每条包含：

| 字段 | 含义 |
|---|---|
| `id` | 站内稳定 id，阅读计划用它引用 |
| `title` `authors` `year` `venue` | 题名、作者、年份、会议或期刊 |
| `arxiv_url` `doi` `code_url` | 链接；没有则为空字符串 |
| `category` `category_key` | 中文类别和稳定键 |
| `tags` | 标签数组 |
| `summary_zh` `relevance_zh` | 中文摘要，以及和这套硬件的关系 |
| `reproducibility` | `高` / `中` / `低`：在 GO2 + PiPER + RealSense 上复现的难易。高表示有代码且硬件接近；低表示平台或传感器差得远，或没有代码 |
| `verified` | 是否核对过 |
| `venue_source` `verified_via` | 会议信息从哪里来、用什么核对 |

## 阅读计划字段

`data/reading_plan.json`：

- `title` `updated` `papers_file` `total_weeks`
- `top3`：先读论文 id
- `stages[]`：`stage` `name` `weeks` `goal` `first_read` `core` `optional` `practice`
- `research_ideas[]`：`title` `text` `refs`
- `hardware_resources[]`：`name` `url`

时间轴上的周次只表示每个阶段占几周。数据里没有「第几周读哪一篇」，页面也不编这个对应关系。

## 每日解读 schema

文件：`data/daily/YYYY-MM-DD.json`。机器可读定义见 `data/daily/digest.schema.json`。

```json
{
  "date": "2026-11-13",
  "source_query": "人工解读依据，例如：data/arxiv_raw/2026-11-13.json 中与腿臂抓取相关的条目",
  "overview_zh": "这一天真正值得记下的观察。没有就写空字符串，不要编趋势。",
  "items": [
    {
      "title": "论文标题",
      "authors": ["作者 A", "作者 B"],
      "arxiv_url": "https://arxiv.org/abs/2601.00001",
      "categories": ["cs.RO"],
      "summary_zh": "问题、方法和结果，只写论文里有的内容。",
      "analysis_zh": "方法和局限落在哪，和已有工作的关系。",
      "relevance_zh": "和 GO2 EDU、PiPER / PiPER-X、D435i / D405 的关系。",
      "score": 8,
      "priority": "高",
      "tags": ["quadruped", "grasp"]
    }
  ]
}
```

约定：

- `date` 是北京时间日历日，并且等于文件名。
- `source_query` 说明这天解读从哪次检索或哪份候选来。
- `overview_zh` 是当天总述。
- `items` 没有论文时用空数组 `[]`。不要为了让页面好看而虚构条目。
- `score` 是 0–10 的相关度，越高越值得当天读。`priority` 只能是 `高`、`中`、`低`。
- 可以多写别的字段，页面会忽略不认识的键。

索引 `data/daily/index.json`：

```json
{ "dates": ["2026-11-13", "2026-11-12"] }
```

`dates` 用 `YYYY-MM-DD`，新的在前，不要重复。页面也会自己按日期倒序排，但写入时请保持这个顺序。

## 每天要写哪些文件

人工解读（助手）每次写两处：

1. `data/daily/YYYY-MM-DD.json` — 上面的解读对象。日期用北京时间。
2. `data/daily/index.json` — 把这个日期放进 `dates`。缺了索引，页面不会显示该文件。

不要把中文解读写进 `data/arxiv_raw/`。那份目录只放 API 原文。

自动抓取（GitHub Actions，也可在本地跑 `python scripts/fetch_arxiv.py`）每次写：

1. `data/arxiv_raw/YYYY-MM-DD.json` — 未解读候选。
2. `data/arxiv_raw/index.json` — 日期索引。
3. `site.json` 的 `updated` 和 `latest_arxiv_raw`。

候选里的 `summary` 是 arXiv 英文摘要原文。`status` 固定为 `uninterpreted_candidates`。页面在某一天没有解读文件时，把这些条目显示为「今日新论文候选」（若抓取日就是北京时间的今天）或「该日期 新论文候选」。

## arXiv 自动抓取

工作流 `.github/workflows/arxiv-daily.yml`：

- 定时：`0 23 * * *`，即 UTC 23:00，等于北京时间次日 07:00。
- 也可在 Actions 里手动运行。
- 请求 `http://export.arxiv.org/api/query`，不使用 API key。
- 范围是 `cs.RO`，以及标题或摘要命中同一组关键词的 `cs.CV` / `cs.LG`。
- 关键词包括四足与腿式操作、移动操作、抓取、全身控制、视觉伺服、手眼标定、模仿学习、diffusion policy、VLA、遥操作、sim2real。
- 默认回溯 7 天，并跳过已经写在更早候选文件里的 arXiv id，所以同一篇不会每天重复出现。
- 发布早于窗口的旧论文会被丢掉。抓取日不等于论文的 arXiv 发布时间；每条记录自己的 `published` 才是。
- 没有命中也会写下空的 `items`，用来区分「跑过了，没有新候选」和「还没跑过」。
- 提交用户是 `github-actions[bot]`，随后 `pages.yml` 会因为 `main` 上的这次提交重新发布。

arXiv 每日公告大约在北京时间 08:00–09:00，比 07:00 的任务略晚。任务抓到的是运行当时 API 里已经公开的稿件；最晚一批会出现在下一次运行里。

本地试跑：

```bash
python3 scripts/fetch_arxiv.py --self-test
python3 scripts/fetch_arxiv.py --dry-run
python3 scripts/fetch_arxiv.py
```

## 本地预览

在仓库根目录：

```bash
python3 -m http.server 8000
```

打开 http://127.0.0.1:8000/ 。不要用 `file://` 直接打开 HTML，浏览器会拦截对 JSON 的读取。

校验：

```bash
python3 scripts/verify_site.py
```

## GitHub Pages

发布工作流是 `.github/workflows/pages.yml`。它在 `main` 被推送时运行：先执行 `scripts/verify_site.py`，再把页面、`assets/`、`data/` 和 `site.json` 部署到 Pages。不经过 Jekyll（产物里带 `.nojekyll`）。

仓库需要手动打开 Pages，并且把构建源设成 Actions，工作流才有地方可发：

1. 打开 https://github.com/57cx/robot-grasp-papers/settings/pages
2. **Build and deployment** → **Source** 选择 **GitHub Actions**（不要选 Deploy from a branch）
3. 把本分支合并进 `main`。若第一次部署报 Pages 站点还不存在，完成第 2 步后在 Actions 里重跑 **Deploy GitHub Pages**
4. 站点地址是 https://57cx.github.io/robot-grasp-papers/

每日抓取要能把 JSON 推回 `main`。若 Actions 日志里提交被拒绝，到 **Settings → Actions → General → Workflow permissions**，选 **Read and write permissions**。

## site.json

外部枢纽读取 https://57cx.github.io/robot-grasp-papers/site.json 。其中有：

- `title` `description` `language`
- `url` 与 `base_path`（`/robot-grasp-papers/`）
- `updated`：最近一次清单更新时间（抓取任务会刷新它）
- `sections`：总览、论文库、阅读计划、每日前沿
- `data`：论文、阅读计划、解读索引、候选索引和两条 schema 的相对路径
- `latest_digest` `latest_arxiv_raw`：目前最新的日期；还没有时为 `null`
- `counts.papers` 与 `hardware`

路径都相对站点根，和 `url` 拼在一起即可。
