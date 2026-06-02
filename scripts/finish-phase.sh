#!/bin/bash
# finish-phase.sh — 阶段收尾：清理 + 文档检查 + 提交 + 推送
# 用法:
#   ./scripts/finish-phase.sh                    仅清理并展示变更，不提交
#   ./scripts/finish-phase.sh "提交信息"          清理 → 文档检查 → 提交 → 推送

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
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

# 列出所有需要与代码同步的文档
DOC_FILES="CLAUDE.md docs/设计文档.md CHANGELOG.md"

# 本次变更的文件
CHANGED_FILES=$(git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null)

# 代码文件是否变更
CODE_CHANGED=$(echo "$CHANGED_FILES" | grep -E '^(index\.html|extension/)' || true)

if [ -n "$CODE_CHANGED" ]; then
  MISSING_DOCS=""
  for doc in $DOC_FILES; do
    if ! echo "$CHANGED_FILES" | grep -Fq "$doc"; then
      # 检查是否有 skip 标记
      SKIP_FLAG=false
      if [ "$doc" = "CLAUDE.md" ] && grep -q '# skip-doc-check' CLAUDE.md 2>/dev/null; then
        SKIP_FLAG=true
      fi
      if [ "$SKIP_FLAG" = false ]; then
        MISSING_DOCS="$MISSING_DOCS  - $doc\n"
      fi
    fi
  done

  if [ -n "$MISSING_DOCS" ]; then
    echo ""
    echo "  ================================================"
    echo "  检测到 index.html / extension/ 代码变更，"
    echo "  但以下文档未在本次变更中："
    echo ""
    printf "%b" "$MISSING_DOCS"
    echo ""
    echo "  请先更新上述文档："
    echo "    CLAUDE.md        — 函数列表、架构说明、localStorage 键名"
    echo "    docs/设计文档.md  — 功能模块描述"
    echo "    CHANGELOG.md     — 开发日志（本脚本会自动生成条目，需手动补充细节）"
    echo ""
    echo "  如本次改动确实无需更新文档，在 CLAUDE.md 末尾加一行 # skip-doc-check"
    echo "  ================================================"
    echo ""
    exit 1
  fi
  echo "  全部文档已同步 ✓"
else
  echo "  无代码变更，跳过文档检查"
fi

echo ""

# ===== 3. 更新开发日志 =====
if [ -n "$1" ]; then
  TODAY=$(date +%Y-%m-%d)
  COMMIT_MSG="$1"
  ENTRY_TITLE=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*: //' | sed 's/^[A-Z]*: //')

  # 生成变更文件摘要（排除 docs/ CHANGELOG 等纯文档文件）
  CODE_CHANGED_FILES=$(echo "$CHANGED_FILES" | grep -v '^docs/' | grep -v '^CHANGELOG' | grep -v '^CLAUDE\.md' | grep -v '^$' || true)

  if [ -n "$CODE_CHANGED_FILES" ]; then
    FILE_SHORT=$(echo "$CODE_CHANGED_FILES" | head -8 | sed 's/^/    | /')
    FILE_COUNT=$(echo "$CODE_CHANGED_FILES" | wc -l)
    if [ "$FILE_COUNT" -gt 8 ]; then
      FILE_SHORT="${FILE_SHORT}\n    | ... 等 $(($FILE_COUNT - 8)) 个文件"
    fi
  fi

  # 检查今天是否已有日志
  if grep -q "^## $TODAY" CHANGELOG.md 2>/dev/null; then
    # 今天已有标题：在标题后插入条目
    awk -v today="$TODAY" -v entry="- $ENTRY_TITLE" -v files="$FILE_SHORT" '
      { sub(/\r$/, "") }
      /^## / && $0 == "## "today && !done {
        print
        print entry
        if (files != "") print files
        done=1
        next
      }
      { print }
    ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  else
    # 新的一天：在第一个已有日期标题前插入
    if grep -q "^## 20" CHANGELOG.md 2>/dev/null; then
      awk -v today="$TODAY" -v entry="- $ENTRY_TITLE" -v files="$FILE_SHORT" '
        { sub(/\r$/, "") }
        !done && /^## 20[0-9][0-9]-/ {
          print "## "today
          print ""
          print entry
          if (files != "") print files
          print ""
          done=1
        }
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
