#!/bin/bash
# finish-phase.sh — 阶段收尾：清理 + 提交 + 推送
# 用法:
#   ./finish-phase.sh                    仅清理并展示变更，不提交
#   ./finish-phase.sh ":sparkles: 词典管理和标题优化"  清理 → 提交 → 推送

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

# 清理测试图片目录中的临时截图 (文件名含 temp/暂存/截图的)
if [ -d "测试图片" ]; then
  find "测试图片" -type f \( -name "*temp*" -o -name "*暂存*" -o -name "*临时*" \) -delete 2>/dev/null || true
fi

echo ""

# ===== 2. 变更概览 =====
echo "===== 2. 变更文件 ====="

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "工作区干净，没有需要提交的变更。"
  echo ""
  echo "可手动更新 CHANGELOG.md 后重新运行本脚本。"
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

# ===== 3. 更新开发日志 =====
if [ -n "$1" ]; then
  TODAY=$(date +%Y-%m-%d)
  COMMIT_MSG="$1"

  # 去掉 convential commit 前缀 (如 "feat: " → "")
  ENTRY_TITLE=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*: //')

  if grep -q "^## $TODAY" CHANGELOG.md 2>/dev/null; then
    # 今天已有标题：在标题行后插入新条目
    awk -v today="$TODAY" -v entry="- ${ENTRY_TITLE}" '
      { sub(/\r$/, "") }
      /^## / && $0 == "## "today && !done { print; print entry; done=1; next }
      { print }
    ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  else
    # 今天还没有标题：在第一个日期标题前插入
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
