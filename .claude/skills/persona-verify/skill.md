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

### Step 1 — 打开页面，理解结构

1. 用 `Read` 工具读取 `target` 文件，理解页面结构：
   - 有哪些 Tab / 区域
   - 有哪些输入框、按钮
   - 核心交互流程是什么

2. 在浏览器打开页面：
   ```bash
   # Windows
   start <target>
   # 或指定浏览器
   start msedge <target>
   ```
   如果 `browser` 配置为 `chrome`：
   ```bash
   start chrome <target>
   ```

3. 对照源码，总结页面功能和交互流程，确认与配置中的 `operations` 是否匹配。
   如果某个 operation 描述的 Tab/按钮在页面中找不到，立即反馈给用户。

### Step 2 — 执行测试操作

按 `operations` 列表逐条执行：

1. 切到对应 Tab（需要时点击 Tab 按钮）
2. 在指定输入框填入数据
3. 点击对应按钮
4. 等待结果出现
5. **截图或详细描述**当前页面的状态：显示了什么、数字是多少、颜色是什么、有没有报错

**重要**：如果某步操作需要用户提供数据（如粘贴 JSON），先提示用户。用户说「数据已经复制好了」，再继续。

所有操作执行完毕后，汇总操作结果：
- 每个操作执行成功/失败
- 关键页面状态（评分数字、分析结果摘要）
