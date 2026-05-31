# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**交互语言：所有对话、代码注释、commit 信息均使用中文。**

## 项目概述

淘宝店铺运营辅助工具，纯前端单页面应用，面向演出服定制类目。直接在浏览器打开 `index.html`。

## 运行方式

没有构建工具、没有依赖（`package.json` 中的 Playwright 仅用于开发和验证，不影响运行）。直接用浏览器打开 `E:\taobaoTest\index.html`，或在项目目录执行 `start index.html`。

## 架构

单个 `index.html` 内联所有 CSS/JS，两个 Tab 面板：

- **竞品分析** — 粘贴自己的商品链接 → 一键自动搜索同类竞品并分析（标题关键词、价格竞争力、活动优惠、利润测算），支持价格/关键词筛选，分析结果联动推广分析 Tab
- **推广分析** — 基于竞品分析结果，勾选已开通的推广渠道 → 生成推荐清单（未开通的高价值渠道优先排序）。每个渠道包含适合/不适合判断、分步操作指引、精力投入度、千牛直达链接；无链接渠道提供截图 OCR 辅助定位功能

## 浏览器扩展（数据抓取）

`extension/` 目录是 Manifest V3 浏览器扩展，三层消息架构实现自动化竞品分析：

- **`background.js`** — Service Worker，编排后台标签页自动流程：创建商品页标签页（`active: false`）→ 提取标题和关键词 → 创建搜索页标签页 → 提取竞品数据 → 回传结果
- **`content.js`** — 三模式运行：`main`（中继主页面消息）、`search`（提取搜索页商品卡片）、`product`（提取商品详情页标题/店铺/价格等）。自动提取模式（`autoExtract`）不显示 UI 操作条，静默返回数据
- **`manifest.json`** — 请求 `clipboardWrite`、`storage`、`tabs` 权限，注入 `s.taobao.com`、`item.taobao.com`、`detail.tmall.com` 及 `file:///E:/taobaoTest/*`

数据流：index.html → `window.postMessage` → content.js (main) → `chrome.runtime.sendMessage` → background.js → 后台标签页自动抓取 → 回传 → content.js → `window.postMessage` → index.html 自动渲染分析结果。

由于淘宝使用 CSS Modules 动态类名，选择器依赖属性包含匹配（`[class*="doubleCardWrapperAdapt"]` 等），淘宝改版可能导致选择器全部失效，需在真实淘宝页面做 DOM 诊断后适配。

## 竞品分析核心函数

- `startAutoAnalysis()` — 校验商品链接 → 禁用按钮 → 发 `postMessage` 给扩展 → 设置超时检测（40s 初始 / 70s 进度后）
- `handleAutoResult(data)` / `handleAutoError(errorMsg)` / `handleAutoProgress(step)` — 处理扩展回传的结果/错误/进度
- `processData(raw, searchKeyword)` — JSON 解析入口，结合筛选条件 → `analyzeAndRender()`
- `analyzeAndRender(products, myPrice, myCost)` — 聚合分析，依次调用各卡片渲染函数
- `applyFilters(config)` / `reanalyzeWithFilters()` — 价格区间 + 标题包含/排除关键词筛选，首次分析即应用
- `renderDiagnostic(products, ...)` — 诊断总览卡片（7 维度改进建议）
- `renderImprovements(diagFindings)` — 改进清单卡片
- `renderPeerComparison(products, myPrice)` — 相近竞品对标卡片
- `renderTitleCard/PrickeCard/ActivityCard/ProfitCard` — 四张分析卡片
- `renderDataTable(valid)` — 渲染原始商品数据表格
- `getKeywordFrequency(titles)` — N-gram 分词统计，取 2-4 字片段，去停用词

## 推广分析核心函数

- `CHANNEL_KNOWLEDGE` — 16 个推广渠道的知识库数组，每个含 id/name/type/baseScore/costLevel/costDesc/effortLevel/threshold/path/detailedSteps/suitableFor/notSuitableFor/directUrl/effectDesc/searchWeight/checkAfter
- `renderPromotionTab()` — 入口：恢复勾选状态 → `getPromoPlan()` 生成推荐 → 渲染各卡片
- `getPromoPlan()` — 推荐引擎：过滤未开通渠道 → 按 baseScore 排序 → 分组（hero/quickWins/paid/later）
- `renderPromoHero(item)` — 渲染英雄推荐卡片（最高优先级）
- `renderPromoSection(section, items, title, defaultOpen)` — 渲染三组分渠道列表
- `renderPromoDetail()` — 渲染底部知识库，展示所有渠道完整信息（适合/不适合、分步步骤、精力投入度）
- `renderPromoPeerCard()` — 同行对标卡片（服务工具覆盖率对比）
- `loadPromoStatus()` / `savePromoStatus()` / `restorePromoCheckboxes()` — 渠道勾选状态持久化
- `getPeerCoverage(peerData)` — 从竞品数据中计算各渠道的同行使用覆盖率
- `ACTIVITY_TAG_TO_CHANNEL` — 竞品活动标签到渠道 ID 的映射表

## localStorage 键名

- `tb_my_cost` — 用户填写的成本价，跨会话保留
- `tb_promo_status` — 推广渠道勾选状态（通过 `savePromoStatus()` / `restorePromoCheckboxes()` 持久化）
- `tb_domain_dict` — 自定义领域词典（标题生成用）

## 重要参考文件

- `CHANGELOG.md` — 开发日志
- `persona-verify.yaml` — Persona 验证配置（`/persona-verify` skill 使用）

## 脚本

- `finish-phase.sh` — 阶段收尾脚本：清理临时文件 → 展示变更 → 更新 CHANGELOG → 提交 → 推送。用法：`./finish-phase.sh "提交信息"`

## 技术约束

- JavaScript 不支持 emoji 范围的字符类正则（如 `[😀-🙏]`），会导致 `SyntaxError`
- 文件编码 UTF-8
- 浏览器 `file://` 协议下运行，需配合浏览器扩展使用（扩展需在 `chrome://extensions` 开启开发者模式并加载 `extension/` 目录，同时开启「允许访问文件网址」）
