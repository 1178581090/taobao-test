# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

淘宝店铺运营辅助工具，纯前端单页面应用，面向演出服定制类目。直接在浏览器打开 `index.html`。

## 运行方式

没有构建工具、没有依赖。直接用浏览器打开 `E:\taobaoTest\index.html`，或在项目目录执行 `start index.html`。

## 架构

单个 `index.html` 内联所有 CSS/JS，五个 Tab 面板：

- **标题诊断** — 输入标题 → 8维度评分（长度、产品词、属性词、场景词、定制词、重复词、符号、人群词），满分100，`score = Math.min(raw, 100)` 封顶
- **标题生成** — 填写5个属性字段 → 按"款式 + 材质 + 核心词 + 场景 + 人群 + 定制"拼接标题
- **优化技巧** — 静态内容，展示标题公式和规则
- **竞品分析** — 搜索关键词 → 淘宝扩展提取数据 → 粘贴 JSON → 四维度分析（标题关键词、价格竞争力、活动优惠、利润测算）
- **明日清单** — 基于竞品分析结果自动生成待办任务，勾选状态通过 `localStorage` 持久化

## 浏览器扩展（数据抓取）

`extension/` 目录是 Manifest V3 浏览器扩展，注入淘宝搜索结果页提取商品数据：

- `content.js` — 延迟 3 秒后通过 CSS Modules 选择器提取商品卡片（标题、价格、销量、店铺、天猫标识、活动标签），在页顶注入橙色操作条，点击"复制到剪贴板"将 JSON 写入剪贴板
- `manifest.json` — 仅请求 `clipboardWrite` 权限和 `s.taobao.com` 主机权限

数据流：浏览器内打开淘宝搜索页 → 扩展自动激活 → 点击"复制到剪贴板" → 回到 `index.html` 竞品分析 Tab 粘贴 → 点击"分析数据"

由于淘宝使用 CSS Modules 动态类名，选择器依赖属性包含匹配（`[class*="doubleCardWrapperAdapt"]` 等），淘宝改版可能导致选择器全部失效，需在真实淘宝页面做 DOM 诊断后适配。

## 竞品分析核心函数

- `processData(raw)` — JSON 解析入口，校验 `data.products` 数组
- `analyzeAndRender(products, myPrice, myCost)` — 聚合分析，依次调用四张卡片渲染函数
- `getKeywordFrequency(titles)` — N-gram 分词统计，取 2-4 字片段，去停用词，返回按频率排序的关键词数组
- `renderTitleCard/PrickeCard/ActivityCard/ProfitCard` — 四张分析卡片，各自包含 badge 标签、统计数据和操作建议
- `renderDataTable(valid)` — 渲染原始商品数据表格
- `generateChecklistTasks(result)` — 根据分析结果生成明日清单（高频词检查、价格调整、活动跟进、运费险），合并已有的勾选状态后写入 `localStorage`

## localStorage 键名

- `tb_checklist_tasks` — 明日清单任务数组（含 `done` 字段）
- `tb_my_cost` — 用户填写的成本价，跨会话保留

## 评分逻辑

`analyze()` 函数中调整各维度分值和触发条件。关键词库定义在 `GOOD_KEYWORDS` 和 `BAD_PATTERNS`，正则匹配分散在各检查项的 `if/else` 分支中。详细评分规则见 `设计文档.md` 第 3.1 节。

## 重要参考文件

- `设计文档.md` — 完整的产品设计、诊断规则汇总、页面规范、验收标准
- `CHANGELOG.md` — 开发日志，记录了每次修改的背景和原因（尤其是淘宝 DOM 适配的 4 轮诊断过程）

## 技术约束

- JavaScript 不支持 emoji 范围的字符类正则（如 `[😀-🙏]`），会导致 `SyntaxError`
- 文件编码 UTF-8
- 浏览器 `file://` 协议下运行，`navigator.clipboard.readText()` 不可用，需用户手动 Ctrl+V 粘贴
