# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**交互语言：所有对话、代码注释、commit 信息均使用中文。**

## 项目概述

淘宝店铺运营辅助工具，纯前端单页面应用，面向演出服定制类目。直接在浏览器打开 `index.html`。

## 运行方式

没有构建工具、没有依赖（`package.json` 中的 Playwright 仅用于开发和验证，不影响运行）。直接用浏览器打开 `E:\taobaoTest\index.html`，或在项目目录执行 `start index.html`。

## 架构

单个 `index.html` 内联所有 CSS/JS，四个 Tab 面板：

- **竞品分析** — 粘贴自己的商品链接 → 一键自动搜索同类竞品并分析（标题关键词、价格竞争力、活动优惠、利润测算），支持价格/关键词筛选，分析结果联动推广分析 Tab
- **推广分析** — 基于竞品分析结果，勾选已开通的推广渠道 → 展示渠道操作手册。每个渠道包含适合/不适合判断、分步操作指引、精力投入度、千牛直达链接；无链接渠道提供截图 OCR 辅助定位功能。已降级为工具手册模式，不再做推荐排序
- **活动筛选** — 基于千牛真实店铺数据 + 资格匹配规则的个性化活动推荐。四组结果（可参加/差一步/暂不可参加/平台暂停）+ 预算计算器
- **店铺诊断** — 两个子模块：店铺激活向导（8 项清单 + 进度条）帮新手完成基础搭建；标题工作台（抓取竞品关键词 → 三级标签分级 → 生成 3 个候选标题 ≤30 字）帮新手优化搜索排名

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

## 推广分析（工具手册模式）

推广分析 Tab 已降级为工具手册，不再做推荐排序。仅保留勾选面板和渠道详情卡片。

- `CHANNEL_KNOWLEDGE` — 13 个推广渠道的知识库数组（直通车/引力魔方/极速推已合并入万相台无界版）
- `renderPromotionTab()` — 入口：恢复勾选状态 → 渲染同行对标 + 渠道手册
- `renderPromoManual()` — 渲染渠道操作手册（未开通/已开通分组，每项含效果/路径/步骤/费用/门槛/精力）
- `renderPromoPeerCard()` — 同行对标卡片（服务工具覆盖率对比）
- `loadPromoStatus()` / `savePromoStatus()` / `restorePromoCheckboxes()` — 渠道勾选状态持久化
- `ACTIVITY_TAG_TO_CHANNEL` — 竞品活动标签到渠道 ID 的映射表

## 活动筛选 Tab（核心推荐引擎）

基于千牛真实店铺数据 + 资格匹配规则的个性化活动推荐。

- `ACTIVITY_RULES` — 27 条活动规则数组，含 rules（资格条件）/ costType / effort / scope / monthlyCost / cpcRange / expectedReturn / selectionTip / detailedSteps / url
- `matchRule(rule, store)` / `matchAllRules(store)` — 资格匹配引擎，5 维度判断（层级/体验分/订单/保证金/违规）
- `renderAfResults()` — 渲染四组结果（可参加/差一步/暂不可参加/平台暂停）
- `renderAfGroup()` — 渲染单组活动卡片列表
- `renderAfStoreCard()` — 渲染店铺状态快照
- `applyAfFilter()` — 筛选开关切换
- `scanStore()` / `runQianniuScan()` / `handleQianniuData()` — 千牛一键扫描
- `loadAfData()` / `saveAfData()` — 扫描数据 localStorage 持久化（键名 `tb_af_scan`）
- `openWithSteps(url, name, ruleId)` — 通过扩展打开千牛页面并注入步骤跟随面板
- `updateBudgetCalc()` / `toggleBudgetItem()` / `initBudgetCalc()` / `scrollToActivity()` — 预算计算器

## OCR 截图辅助

- `showOcrZone(channelId)` — 展开截图粘贴区，注入对应渠道的操作步骤
- 粘贴事件监听 — 截图后显示操作指引，与步骤对照

## localStorage 键名

- `tb_my_cost` — 用户填写的成本价，跨会话保留
- `tb_promo_status` — 推广渠道勾选状态
- `tb_domain_dict` — 自定义领域词典（标题生成用）
- `tb_af_scan` — 千牛扫描数据缓存
- `tb_af_budget` — 月预算上限
- `tb_af_budget_<id>` — 单个活动的预算勾选状态
- `tb_promo_visited` — 首次访问标记
- `tb_store_checklist` — 店铺激活清单勾选状态
- `tb_title_prefs` — 标题工作台输入偏好（按商品名分组）
- `tb_title_history` — 标题生成历史（最多 20 条）
- `tb_title_keywords` — 关键词缓存（含抓取时间，7 天过期提示）

## 店铺诊断核心函数

- `initDiagnosisTab()` — 入口：渲染清单 + 初始化标题工作台
- `renderChecklist()` — 渲染 8 项激活清单 + 进度条
- `toggleChecklistItem(id, checkbox)` — 清单项勾选（200ms 防抖）+ localStorage 持久化
- `initTitleWorkbench()` — 初始化面料/场景芯片 + 事件监听 + 偏好恢复
- `startTitleAnalysis()` — 发起关键词抓取 → 加载态 → 40s 超时 → 手动降级
- `handleTitleAnalysisResult(data)` — 处理扩展回传 → 词频分析 → 三级关键词分级（强推/防守/长尾）
- `renderKeywordTags(keywords, totalCount)` — 渲染关键词标签（绿/黄/灰）+ 竞争度判断
- `generateTitles()` / `buildTitle(strategy, sortedWords)` — 3 策略标题生成（搜索/点击/均衡），30 字硬约束
- `renderTitleCandidates()` / `copyTitle()` / `showTwToast()` — 候选渲染 + 复制反馈
- `loadTitleHistory()` / `addTitleHistory()` / `renderHistoryList()` — 历史记录（按商品分组）
- `switchToTab(target)` — Tab 间跳转辅助函数

## 最近修复

- 扩展安装引导 — 首次访问显示安装指南卡（可关闭）
- Tab 跳转链接 — 「未设置成本」「请先搜索竞品」改为可点击跳转
- 推广新手推荐 — 醒目渐变卡片 + 直接勾选「标记已开通」
- 预算计算器 — 默认 ¥300，首次根据成本自动推荐起步预算
- 性能优化 — 输入防抖 200ms + localStorage 内存缓存 + CSS transition 精确化

## 重要参考文件

- `CHANGELOG.md` — 开发日志
- `persona-verify.yaml` — Persona 验证配置（`/persona-verify` skill 使用）

## 脚本

- `scripts/finish-phase.sh` — 阶段收尾脚本：清理临时文件 → 展示变更 → 更新 CHANGELOG → 提交 → 推送。用法：`./scripts/finish-phase.sh "提交信息"`
- `scripts/scan-qianniu.js` — Playwright 脚本，扫描千牛 4 个页面（首页/活动报名/推广中心/商品成交锦囊），输出 scan-qianniu.json。需先用 fetch-page.js 登录一次保存 cookie
- `fetch-page.js` — 单页抓取工具，登录态保存到 `.browser-state/state.json`

## 浏览器扩展新增能力

- `scanQianniu` — 一键扫描店铺数据（background.js 开 myseller 后台标签页 → content.js qianniu 模式提取数据）
- `openWithSteps` — 打开千牛页面并在页面内注入步骤跟随浮动面板（支持递归多级标签页跳转）
- `injectStepPanel` — 被 chrome.scripting.executeScript 序列化注入到千牛页面的面板函数，自带 setInterval 轮询自愈
- `searchCompetitors(keyword)` — 纯关键词搜索（标题工作台），background.js 直接调用 extractFromSearchPage，跳过产品页提取流程
- `extractSearchTotalCount()` — content.js 搜索页提取搜索结果总数，用于关键词竞争度分级
- 消息路由新增：`tb-search-competitors` / `tb-title-analysis-result` / `tb-title-analysis-error`

## 技术约束

- JavaScript 不支持 emoji 范围的字符类正则（如 `[😀-🙏]`），会导致 `SyntaxError`
- 文件编码 UTF-8
- 浏览器 `file://` 协议下运行，需配合浏览器扩展使用（扩展需在 `chrome://extensions` 开启开发者模式并加载 `extension/` 目录，同时开启「允许访问文件网址」）
