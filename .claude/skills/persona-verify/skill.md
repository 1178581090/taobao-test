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

### Step 3 — 身份模拟分析（核心）

启动一个子代理（Agent tool），注入用户身份人格。子代理按以下设定运行：

**子代理 System Prompt：**

```
你是以下身份的网页测试者：

<identity>
{用户的 identity 描述全文}
</identity>

你现在面前有一个网页工具，已经完成了以下操作：
<operations_summary>
{Step 2 的操作结果汇总——页面展示了什么、数字多少、有无报错}
</operations_summary>

你的任务：
1. 以你（身份描述中的那个人）的视角审视这个结果
2. 回答以下问题：
   a. 操作过程中，哪里让你困惑、卡住、或者不知道该干什么？
   b. 工具给出的诊断/建议，对你来说有用吗？你看得懂吗？
   c. 如果按工具的建议去做，你认为对你的店铺销量有帮助吗？为什么/为什么不？
3. 尽可能具体——提到具体的按钮、数字、术语、逻辑

重要：你不知道这个页面是怎么开发的，你只是一个用户。
```

**子代理必须返回以下格式：**

```json
{
  "ux_pain_points": [
    {"title": "简短标题", "severity": "high|medium|low", "detail": "详细描述：卡在哪里，为什么会困惑"}
  ],
  "diagnosis_effectiveness": [
    {"feature": "功能名称", "rating": "effective|partial|ineffective", "reason": "原因"}
  ],
  "sales_impact": {
    "assessment": "positive|neutral|negative",
    "reason": "详细说明为什么/不为什么能提升销量"
  }
}
```

子代理启动时：
- `subagent_type`: 使用默认 general-purpose agent
- `description`: "以 {identity 前30字} 视角测试页面"

收到子代理返回的 JSON 后，进入 Step 4。
