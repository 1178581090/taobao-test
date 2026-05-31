# Persona 验证 Skill — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `persona-verify` skill，用户通过配置文件定义身份和测试操作，skill 自动以该身份视角验证网页，输出结构化报告并可选执行修复。

**Architecture:** Skill 本身是一个 Markdown 文件，存放于 `.claude/skills/persona-verify/skill.md`。调用时 Claude 读取项目根目录的 `persona-verify.yaml` 配置，按工作流执行浏览器操作 → 子代理身份模拟 → 报告生成 → 修复执行。

**Tech Stack:** 纯 Markdown skill 文件 + YAML 配置，无代码依赖。依赖 Claude 内置的 Agent、Bash、Read/Write/Edit 工具。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `.claude/skills/persona-verify/skill.md` | 新建 | Skill 主文件，包含完整的系统提示词和工作流指令 |
| `.claude/skills/persona-verify/config.example.yaml` | 新建 | 配置模板，用户复制到项目根目录修改 |
| `persona-verify.yaml` | 新建 | 当前项目的配置（淘宝诊断工具） |

---

### Task 1: 创建 Skill 目录和配置模板

**Files:**
- Create: `.claude/skills/persona-verify/config.example.yaml`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p ".claude/skills/persona-verify"
```

- [ ] **Step 2: 写入配置模板**

文件：`.claude/skills/persona-verify/config.example.yaml`

```yaml
# Persona 验证 Skill 配置文件
# 复制此文件到项目根目录，重命名为 persona-verify.yaml，按需修改。

# ── 你的身份（必填） ──
# 描述你在这个项目中的真实角色、经验水平、痛点。
# 越具体越好——子代理会以这个人格去测试页面。
identity: |
  开了3个月淘宝店，卖古装演出服，月销5单。
  不懂运营推广，标题是复制同行的，没做过竞品分析。
  店里有15个商品，多数0销量，想破零。

# ── 目标页面（必填） ──
# 相对于项目根目录的路径。也支持绝对路径。
target: index.html

# ── 浏览器（可选） ──
# 可选值：chrome | edge | default
# 不填则自动检测系统可用浏览器。
browser: edge

# ── 测试操作（必填） ──
# 列出你要 skill 在页面上执行的每个操作。
# 每个操作描述清楚：在哪个 Tab/输入框，填什么数据，点什么按钮。
operations:
  - tab: 竞品分析
    action: 在输入框中粘贴已复制的竞品JSON数据，点击「分析数据」按钮
  - tab: 标题诊断
    action: 在输入框中输入"古装演出服女成人舞台定制"，点击「诊断」按钮
  - tab: 推广分析
    action: 勾选「运费险」和「淘金币」复选框，点击「生成推荐」按钮
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/persona-verify/config.example.yaml
git commit -m "feat: persona-verify skill 配置模板"
```

---

### Task 2: 写入 Skill 主文件（初始化 + 配置读取）

**Files:**
- Create: `.claude/skills/persona-verify/skill.md`

- [ ] **Step 1: 写入 Skill 头部和初始化部分**

文件：`.claude/skills/persona-verify/skill.md`

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "feat: persona-verify skill 初始化+配置读取"
```

---

### Task 3: 追加 Skill — 浏览器交互 + 页面理解

**Files:**
- Modify: `.claude/skills/persona-verify/skill.md` — 追加内容

- [ ] **Step 1: 追加 Step 1 和 Step 2**

在 skill.md 末尾追加：

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "feat: persona-verify skill 浏览器交互+页面理解"
```

---

### Task 4: 追加 Skill — 身份模拟分析（核心）

**Files:**
- Modify: `.claude/skills/persona-verify/skill.md` — 追加内容

- [ ] **Step 1: 追加 Step 3**

在 skill.md 末尾追加：

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "feat: persona-verify skill 身份模拟分析"
```

---

### Task 5: 追加 Skill — 报告生成

**Files:**
- Modify: `.claude/skills/persona-verify/skill.md` — 追加内容

- [ ] **Step 1: 追加 Step 4**

在 skill.md 末尾追加：

```markdown
### Step 4 — 生成结构化报告

将 Step 3 子代理返回的 JSON 格式化输出给用户。报告必须包含四个部分：

---

## Persona 验证报告
**身份视角：** {identity 的前100字摘要}
**目标页面：** {target}
**验证时间：** {当前时间}

### 一、UX 痛点

按 severity 排序（high → medium → low），每项包含：
- 痛点标题
- 严重程度（🔴高 / 🟡中 / 🟢低）
- 详细描述：卡在哪里、为什么会困惑
- 改进方向（一句话）

### 二、诊断有效性评估

| 功能 | 评级 | 原因 |
|------|------|------|
| ... | ✅有效 / ⚠️部分有效 / ❌无效 | ... |

### 三、销量影响判断

**综合结论：** {positive/neutral/negative}
**详细理由：** {子代理的 sales_impact.reason}
**关键建议：** {1-3 条最重要的行动建议}

### 四、修复方案

按优先级排序的代码改动列表：
- **[P0]** 阻塞性问题（不改就影响核心功能）
- **[P1]** 重要但不阻塞
- **[P2]** 锦上添花

每个修复项包含：涉及的文件、改动位置、改动内容简述。

---

报告生成完毕后，询问用户：
"报告完成。是否按修复方案执行代码修改？（回复 '执行全部' / '只执行 P0' / '我自己改' / '具体说第X项'）"
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "feat: persona-verify skill 报告生成"
```

---

### Task 6: 追加 Skill — 修复执行

**Files:**
- Modify: `.claude/skills/persona-verify/skill.md` — 追加内容

- [ ] **Step 1: 追加 Step 5**

在 skill.md 末尾追加：

```markdown
### Step 5 — 执行修复（用户确认后）

根据用户选择的修复范围，按优先级顺序逐个修改代码：

1. 先改 P0 → 再改 P1 → 最后 P2
2. 每次修改用 `Edit` 工具做精确替换，不改动无关代码
3. 每改完一项，报告 "已修复：<P级别> <标题>"
4. 所有修复完成后，汇总：
   - 修改了哪些文件
   - 改了什么（列表）
   - 建议用户在浏览器中刷新页面验证

**约束**：
- 只修改 `target` 指定的文件及相关文件
- 不修改 `.claude/`、`docs/`、`extension/` 等非 target 文件
- 不提交 git（用户自行决定是否提交）
```

- [ ] **Step 2: 追加 Skill 尾部 — 使用示例**

在 skill.md 末尾追加：

```markdown
---

## 使用方式

1. 在项目根目录创建 `persona-verify.yaml`（参考 `.claude/skills/persona-verify/config.example.yaml`）
2. 调用 skill：`/persona-verify`
3. 等待报告生成
4. 选择是否执行修复

## 配置文件参考

见 `.claude/skills/persona-verify/config.example.yaml`
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "feat: persona-verify skill 修复执行+使用说明"
```

---

### Task 7: 为当前项目创建配置

**Files:**
- Create: `persona-verify.yaml`

- [ ] **Step 1: 根据当前淘宝诊断工具写入配置**

```bash
cat > persona-verify.yaml << 'YAMLEOF'
# Persona 验证 - 淘宝店铺诊断工具配置

identity: |
  开了3个月淘宝店，卖古装演出服，月销5单。
  不懂运营推广，标题是复制同行的，没做过竞品分析。
  店里有15个商品，多数0销量，想破零。
  不知道直通车、引力魔方、万相台这些是什么。

target: index.html

browser: edge

operations:
  - tab: 竞品分析
    action: 在输入框中粘贴已复制的竞品JSON数据，点击「分析数据」按钮
  - tab: 标题诊断
    action: 在输入框中输入"古装演出服女成人舞台定制"，点击「诊断」按钮
  - tab: 推广分析
    action: 勾选「运费险」和「淘金币」复选框，点击「生成推荐」按钮
YAMLEOF
```

- [ ] **Step 2: 确认 .gitignore 中排除此文件（可选）**

因为 persona-verify.yaml 包含个人身份信息，确认它不会被提交。如果项目 .gitignore 中没有，添加：

```bash
echo "persona-verify.yaml" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add persona-verify.yaml .gitignore
git commit -m "feat: 当前项目 persona-verify 配置"
```

---

### Task 8: 端到端验证

**Files:**
- 无新建文件

- [ ] **Step 1: 验证 skill 可被发现**

确认 `.claude/skills/persona-verify/skill.md` 存在且 frontmatter 正确（name、description 字段）。

- [ ] **Step 2: 验证配置模板可读**

确认 `config.example.yaml` 语法正确，用户可按模板填写。

- [ ] **Step 3: 验证配置读取**

检查 `persona-verify.yaml` 已存在于项目根目录，内容完整。

- [ ] **Step 4: 验证 skill 工作流**

调用 `/persona-verify`，检查：
1. 正确读取 persona-verify.yaml
2. 正确打开 index.html 浏览器
3. 按 operations 执行操作
4. 子代理输出符合 JSON 格式
5. 报告包含四个部分
6. 用户选择「执行全部」后代码被正确修改

- [ ] **Step 5: 修复验证中发现的问题**

如发现 skill.md 中的指令不清晰、子代理输出格式不符合预期、浏览器操作步骤有问题，修改 skill.md 并重新验证。

- [ ] **Step 6: Commit（如有修复）**

```bash
git add .claude/skills/persona-verify/skill.md
git commit -m "fix: persona-verify 端到端验证修复"
```

---

## 自审检查

**1. Spec 覆盖**

| 设计文档要求 | 对应任务 |
|-------------|----------|
| 配置读取（persona-verify.yaml） | Task 2 |
| 浏览器打开页面 | Task 3 |
| 按 operations 真实操作 | Task 3 |
| 子代理身份模拟 | Task 4 |
| 结构化报告（4 部分） | Task 5 |
| 修复执行 | Task 6 |
| 配置模板 | Task 1 |
| 当前项目配置 | Task 7 |
| 端到端验证 | Task 8 |

**2. Placeholder 检查** — 无 TBD/TODO/占位符，所有步骤包含实际内容。

**3. 类型一致性** — skill.md 的 Step 编号与 workflow 一致，JSON 字段名在各步骤中保持一致（`ux_pain_points` / `diagnosis_effectiveness` / `sales_impact`）。配置 YAML 中的字段名（`identity` / `target` / `browser` / `operations`）与 skill.md Step 0 中的引用一致。
