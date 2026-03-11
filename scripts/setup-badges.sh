#!/usr/bin/env bash
#
# Setup gist-based badge hosting for skill-stats.
#
# This script automates the one-time setup required to publish
# Shields.io badge JSON files to a GitHub Gist from CI.
#
# What it does:
#   1. Discovers skill directories (or accepts skill names as arguments)
#   2. Creates a public GitHub Gist with placeholder badge JSON files
#   3. Sets the GIST_ID repository variable
#   4. Prompts you to provide a PAT with gist scope and sets GIST_SECRET
#   5. Prints the badge markdown for your README
#
# Prerequisites:
#   - gh CLI installed and authenticated (https://cli.github.com)
#   - gh must have gist scope: run `gh auth refresh -s gist` if needed
#
# Usage:
#   ./scripts/setup-badges.sh [options] [skill-name ...]
#
# Options:
#   -p, --path <dir>    Path to skills directory (auto-discovers skill names)
#   -r, --repo <owner/repo>  Target repository for secrets/variables
#                             (default: current repo from gh)
#   -h, --help          Show this help message
#
# Examples:
#   # Auto-discover skills from a directory
#   ./scripts/setup-badges.sh --path .opencode/skills
#
#   # Explicit skill names
#   ./scripts/setup-badges.sh code-review pdf-processing data-analysis
#
#   # Target a specific repo
#   ./scripts/setup-badges.sh --repo myorg/myrepo --path .agents/skills

set -euo pipefail

SKILLS_PATH=""
REPO=""
SKILL_NAMES=()

usage() {
  sed -n '/^# Usage:/,/^[^#]/p' "$0" | head -n -1 | sed 's/^# \?//'
  exit 0
}

die() { echo "Error: $1" >&2; exit 1; }

# --- Parse arguments ---

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--path)  SKILLS_PATH="$2"; shift 2 ;;
    -r|--repo)  REPO="$2"; shift 2 ;;
    -h|--help)  usage ;;
    -*)         die "Unknown option: $1" ;;
    *)          SKILL_NAMES+=("$1"); shift ;;
  esac
done

# --- Validate prerequisites ---

command -v gh >/dev/null 2>&1 || die "gh CLI is required. Install from https://cli.github.com"
command -v jq >/dev/null 2>&1 || die "jq is required. Install via your package manager"

# Check gh auth includes gist scope
if ! gh auth status 2>&1 | grep -q "gist"; then
  echo "Your gh CLI token may not have gist scope."
  echo "Run: gh auth refresh -s gist"
  echo ""
  read -rp "Continue anyway? [y/N] " ans
  [[ "$ans" =~ ^[Yy] ]] || exit 1
fi

# --- Determine repo ---

if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null) \
    || die "Could not detect repository. Use --repo <owner/repo>"
fi

echo "Repository: $REPO"

# --- Discover or validate skill names ---

if [[ ${#SKILL_NAMES[@]} -eq 0 && -z "$SKILLS_PATH" ]]; then
  die "Provide skill names as arguments or use --path <dir> to auto-discover"
fi

if [[ -n "$SKILLS_PATH" ]]; then
  [[ -d "$SKILLS_PATH" ]] || die "Path does not exist: $SKILLS_PATH"

  for dir in "$SKILLS_PATH"/*/; do
    [[ -f "${dir}SKILL.md" ]] && SKILL_NAMES+=("$(basename "$dir")")
  done

  [[ ${#SKILL_NAMES[@]} -gt 0 ]] || die "No skills found in $SKILLS_PATH (no SKILL.md files)"
fi

echo "Skills (${#SKILL_NAMES[@]}): ${SKILL_NAMES[*]}"
echo ""

# --- Create placeholder badge files in a temp dir ---

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

PLACEHOLDER='{"schemaVersion":1,"label":"skill tokens","message":"pending","color":"lightgrey"}'

for name in "${SKILL_NAMES[@]}"; do
  echo "$PLACEHOLDER" > "$TMPDIR/${name}-badge.json"
done

# --- Create the gist ---

echo "Creating public gist with ${#SKILL_NAMES[@]} badge files..."

GIST_URL=$(gh gist create --public --desc "skill-stats badges for $REPO" "$TMPDIR"/*-badge.json)

# Extract gist ID from URL (last path segment)
GIST_ID="${GIST_URL##*/}"

echo "Gist created: $GIST_URL"
echo "Gist ID: $GIST_ID"
echo ""

# --- Get gist owner ---

GIST_OWNER=$(gh api "gists/$GIST_ID" --jq '.owner.login')

echo "Gist owner: $GIST_OWNER"
echo ""

# --- Set GIST_ID repository variable ---

echo "Setting GIST_ID repository variable..."
gh variable set GIST_ID --repo "$REPO" --body "$GIST_ID"
echo "Done."
echo ""

# --- Set GIST_SECRET ---

echo "=== PAT Setup ==="
echo ""
echo "The workflow needs a Personal Access Token to update the badge gist."
echo "The GITHUB_TOKEN cannot access gists (they are user-scoped, not repo-scoped)."
echo ""
echo "Recommended: Fine-grained PAT (minimal permissions)"
echo "  https://github.com/settings/personal-access-tokens/new?description=skill-stats+badge+gist&gists=write"
echo "  - Resource owner: your personal account"
echo "  - Repository access: Public repositories (read-only)"
echo "  - Account permissions: Gists → Write (only this one)"
echo ""
echo "Alternative: Classic PAT"
echo "  https://github.com/settings/tokens/new?scopes=gist&description=skill-stats+badge+gist"
echo "  - Select the 'gist' scope (grants access to all your gists)"
echo ""

if [[ -t 0 ]]; then
  # Interactive terminal — prompt for the PAT
  read -rsp "Paste your PAT (input hidden): " PAT
  echo ""

  if [[ -z "$PAT" ]]; then
    echo "Skipped."
  else
    echo "Setting GIST_SECRET repository secret..."
    echo "$PAT" | gh secret set GIST_SECRET --repo "$REPO"
    echo "Done."
  fi
else
  echo "(Non-interactive mode — skipping PAT prompt)"
fi

echo ""
echo "To set the secret manually:"
echo "  gh secret set GIST_SECRET --repo $REPO"

echo ""

# --- Print badge markdown ---

echo "=== Badge Markdown ==="
echo ""
echo "Add these to your README.md:"
echo ""

for name in "${SKILL_NAMES[@]}"; do
  echo "![${name}](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/${GIST_OWNER}/${GIST_ID}/raw/${name}-badge.json)"
done

echo ""
echo "=== Markdown Table ==="
echo ""
echo "| Skill | Badge |"
echo "|-------|-------|"
for name in "${SKILL_NAMES[@]}"; do
  echo "| ${name} | ![${name}](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/${GIST_OWNER}/${GIST_ID}/raw/${name}-badge.json) |"
done

echo ""
echo "Setup complete. The next push to main will publish real badge data."
