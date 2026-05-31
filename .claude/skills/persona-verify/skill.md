---
name: persona-verify
description: 以用户定义的特定身份视角验证网页，生成 UX 痛点、诊断有效性和销量影响的结构化报告。用户需先在项目根目录创建 persona-verify.yaml 配置文件。
---

# Persona 验证 Skill

## 工作流程

按以下顺序执行，每步完成后再进入下一步。

### Step 0 — 读取配置

首先读取项目根目录的 `persona-verify.yaml`。

- 如果文件不存在：提示用户 "未找到 persona-verify.yaml，请先在项目根目录创建此文件。可参考 `.claude/skills/persona-verify/config.example.yaml` 模板。" — 停止。
- 解析 YAML，提取 `identity`、`target`、`browser`、`operations`。
- `target` 和 `identity` 为必填项，缺失时报错并停止。

配置读取完毕后，向用户汇报：
```
已读取配置：
  身份：<identity 前100字摘要>...
  目标：<target>
  操作：共 N 项
  浏览器：<browser 或 "自动检测">
开始验证...
```
