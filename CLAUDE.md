# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

淘宝店铺运营辅助工具，纯前端单页面应用，面向演出服定制类目。直接在浏览器打开 `index.html`。

## 运行方式

没有构建工具、没有依赖。直接用浏览器打开 `E:\taobaoTest\index.html`，或在项目目录执行 `start index.html`。

## 架构

单个 `index.html` 内联所有 CSS/JS，三个 Tab 面板：

- **标题诊断** — 输入标题 → 8维度评分（长度、产品词、属性词、场景词、定制词、重复词、符号、人群词），满分100，`score = Math.min(raw, 100)` 封顶
- **标题生成** — 填写5个属性字段 → 按"款式 + 材质 + 核心词 + 场景 + 人群 + 定制"拼接标题
- **优化技巧** — 静态内容，展示标题公式和规则

## 评分逻辑位置

`analyze()` 函数中调整各维度分值和触发条件。关键词库定义在 `GOOD_KEYWORDS`（第172行）和 `BAD_PATTERNS`（第177行），正则匹配分散在各检查项中。

## 技术约束

- JavaScript 不支持 emoji 范围的字符类正则（如 `[😀-🙏]`），会导致 `SyntaxError`
- 文件编码 UTF-8
- 浏览器 `file://` 协议下运行，无跨域问题但也没有服务端能力
