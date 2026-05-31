#!/bin/bash
# finish-phase.sh — 阶段收尾：清理 + 文档检查 + 提交 + 推送
# 用法:
#   ./finish-phase.sh                    仅清理并展示变更，不提交
#   ./finish-phase.sh "提交信息"          清理 → 文档检查 → 提交 → 推送

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "===== 1. 清理临时文件 ====="

# .superpowers 缓存
if [ -d ".superpowers/brainstorm" ]; then
  rm -rf .superpowers/brainstorm/*
  echo "  .superpowers/brainstorm/ 已清理"
fi

# docs 下的临时文档
if [ -d "docs/superpowers" ]; then
  rm -rf docs/superpowers/* 2>/dev/null || true
  echo "  docs/superpowers/ 已清理"
fi

# 清理测试图片目录中的临时截图
if [ -d "测试图片" ]; then
  find "测试图片" -type f \( -name "*temp*" -o -name "*暂存*" -o -name "*临时*" \) -delete 2>/dev/null || true
fi

echo ""

# ===== 2. 变更概览 =====
echo "===== 2. 变更文件 ====="

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "工作区干净，没有需要提交的变更。"
  exit 0
fi

echo ""
echo "--- 文件状态 ---"
git status --short
echo ""
echo "--- 变更统计 ---"
git diff --stat
echo ""
git diff --cached --stat 2>/dev/null || true
echo ""

# 未跟踪文件
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
  echo "--- 未跟踪文件 ---"
  echo "$UNTRACKED"
  echo ""
fi

# ===== 2.5 文档同步检查 =====
echo "===== 2.5 文档同步检查 ====="

# 本次变更中涉及代码的文件
CODE_CHANGED=$(git diff --name-only; git diff --cached --name-only; git ls-files --others --exclude-standard)
HAS_CODE_CHANGE=$(echo "$CODE_CHANGED" | grep -E '^(index\.html|extension/)' || true)
# CLAUDE.md 是否在变更中
CLAUDE_UPDATED=$(echo "$CODE_CHANGED" | grep 'CLAUDE\.md' || true)

if [ -n "$HAS_CODE_CHANGE" ] && [ -z "$CLAUDE_UPDATED" ]; then
  echo ""
  echo "  ================================================"
  echo "  检测到 index.html / extension/ 代码变更，但 CLAUDE.md 未更新"
  echo ""
  echo "  请先更新 CLAUDE.md 中的函数列表和架构说明，然后重新运行本脚本"
  echo "  如本次改动无需更新文档，在 CLAUDE.md 末尾加一行 # skip-doc-check 并提交"
  echo "  ================================================"
  echo ""
  exit 1
fi

if [ -n "$CLAUDE_UPDATED" ]; then
  echo "  CLAUDE.md 已同步更新"
fi

if [ -z "$HAS_CODE_CHANGE" ]; then
  echo "  无代码变更，跳过文档检查"
fi

echo ""

# ===== 3. 更新开发日志 =====
if [ -n "$1" ]; then
  TODAY=$(date +%Y-%m-%d)
  COMMIT_MSG="$1"
  ENTRY_TITLE=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*: //')

  if grep -q "^## $TODAY" CHANGELOG.md 2>/dev/null; then
    awk -v today="$TODAY" -v entry="- ${ENTRY_TITLE}" '
      { sub(/\r$/, "") }
      /^## / && $0 == "## "today && !done { print; print entry; done=1; next }
      { print }
    ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  else
    if grep -q "^## 20" CHANGELOG.md 2>/dev/null; then
      awk -v today="$TODAY" -v entry="- ${ENTRY_TITLE}" '
        { sub(/\r$/, "") }
        !done && /^## 20[0-9][0-9]-/ { print "## "today; print ""; print entry; print ""; done=1 }
        { print }
      ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
    else
      printf '\n## %s\n\n- %s\n' "$TODAY" "$ENTRY_TITLE" >> CHANGELOG.md
    fi
  fi

  echo "===== 3. 已更新 CHANGELOG.md ====="
fi

# ===== 4. 提交并推送 =====
if [ -z "$1" ]; then
  echo "===== 未提供提交信息 ====="
  echo "确认变更无误后运行: ./finish-phase.sh \"<提交信息>\""
  exit 0
fi

echo "===== 4. 提交: $COMMIT_MSG ====="
git add -A
git commit -m "$COMMIT_MSG"

echo ""
echo "===== 5. 推送到远程 ====="
git push origin master

echo ""
echo "===== 收尾完成 ====="
