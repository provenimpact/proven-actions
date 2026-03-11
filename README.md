# skill-stats

[![CI](https://github.com/provenimpact/proven-actions/actions/workflows/ci.yml/badge.svg)](https://github.com/provenimpact/proven-actions/actions/workflows/ci.yml)
[![Skill Stats](https://github.com/provenimpact/proven-actions/actions/workflows/skill-stats.yml/badge.svg)](https://github.com/provenimpact/proven-actions/actions/workflows/skill-stats.yml)

<!-- Badge JSON hosted in a GitHub Gist, served via Shields.io endpoint badges (ADR-0004). -->
![proven-needs](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/proven-needs-badge.json)
![needs-features](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-features-badge.json)
![needs-design](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-design-badge.json)
![needs-implementation](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-implementation-badge.json)
![needs-architecture](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-architecture-badge.json)
![needs-tasks](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-tasks-badge.json)
![needs-adr](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-adr-badge.json)
![needs-dependencies](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-dependencies-badge.json)
![needs-security](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-security-badge.json)
![needs-compliance](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/needs-compliance-badge.json)

A GitHub Action that analyzes [Agent Skills](https://agentskills.io) and reports token cost statistics. Know exactly how much LLM context your skills consume before your agents load them.

## Why?

Agent Skills use [progressive disclosure](https://agentskills.io/client-implementation/adding-skills-support) to manage context efficiently:

| Tier | What's loaded | When |
|------|--------------|------|
| **Tier 1** (Catalog) | Name + description | Session start (~50-100 tokens per skill) |
| **Tier 2** (Instructions) | Full SKILL.md body | When skill is activated |
| **Tier 3** (Resources) | Scripts, references, assets | When instructions reference them |

**skill-stats** measures each tier so you can track context cost, optimize skill size, and communicate impact to users via badges.

## Quick Start

```yaml
- uses: provenimpact/proven-actions@v1
  with:
    path: .agents/skills
    badge-output-dir: ./badges
```

## Usage

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `path` | Path to a skill directory (containing SKILL.md) or a parent directory with multiple skill subdirectories | `.` |
| `badge-output-dir` | Directory to write Shields.io badge JSON files. If empty, badge files are not written to disk. | `""` |

### Outputs

| Output | Description |
|--------|-------------|
| `stats_json` | Complete analysis data as a JSON string |
| `min_tokens` | Minimum token count (SKILL.md body only) |
| `max_tokens` | Maximum token count (all files) |
| `rating` | Context budget rating |
| `badge_json` | Shields.io badge JSON string |

### Context Budget Ratings

| Rating | Max Tokens | Badge Color |
|--------|-----------|-------------|
| **lightweight** | < 1,000 | ![lightweight](https://img.shields.io/badge/skill_tokens-lightweight-brightgreen) |
| **moderate** | 1,000 - 4,999 | ![moderate](https://img.shields.io/badge/skill_tokens-moderate-yellow) |
| **heavy** | 5,000 - 19,999 | ![heavy](https://img.shields.io/badge/skill_tokens-heavy-orange) |
| **very heavy** | 20,000+ | ![very heavy](https://img.shields.io/badge/skill_tokens-very_heavy-red) |

Token counts use the [tiktoken](https://github.com/openai/tiktoken) `cl100k_base` encoding (GPT-4 / Claude-class models).

## Examples

### Analyze a single skill

```yaml
name: Skill Stats
on: [push]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: provenimpact/proven-actions@v1
        id: stats
        with:
          path: my-skill

      - run: |
          echo "Min tokens: ${{ steps.stats.outputs.min_tokens }}"
          echo "Max tokens: ${{ steps.stats.outputs.max_tokens }}"
          echo "Rating: ${{ steps.stats.outputs.rating }}"
```

### Analyze multiple skills and publish badges to a gist

```yaml
name: Skill Stats
on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: provenimpact/proven-actions@v1
        with:
          path: .agents/skills
          badge-output-dir: ./badges

      - name: Publish badges to gist
        if: github.ref == 'refs/heads/main'
        env:
          GIST_SECRET: ${{ secrets.GIST_SECRET }}
          GIST_ID: ${{ vars.GIST_ID }}
        run: |
          FILES_JSON="{"
          first=true
          for badge in badges/*-badge.json; do
            [ -f "$badge" ] || continue
            name="$(basename "$badge")"
            content="$(jq -c '.' "$badge")"
            [ "$first" = true ] && first=false || FILES_JSON+=","
            FILES_JSON+="\"$name\":{\"content\":$(jq -Rs '.' <<< "$content")}"
          done
          FILES_JSON+="}"

          curl -sf -X PATCH \
            -H "Authorization: token $GIST_SECRET" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/gists/$GIST_ID" \
            -d "{\"files\":$FILES_JSON}" > /dev/null
```

**Setup** (one-time, using the included setup script):

```bash
# Auto-discover skills and create gist + repo secrets in one command
./scripts/setup-badges.sh --path .agents/skills
```

Or manually:
1. Create a public GitHub Gist with a `<skill-name>-badge.json` file per skill
2. Create a PAT with `gist` scope and add it as the `GIST_SECRET` repository secret
3. Add the gist ID as the `GIST_ID` repository variable

The setup script prints ready-to-use badge markdown. Or construct URLs manually:

```markdown
![Skill Tokens](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/tjakobsson/c694054898dc77add2e2e0d6d5c19113/raw/my-skill-badge.json)
```

### Use outputs in downstream steps

```yaml
- uses: provenimpact/proven-actions@v1
  id: stats

- name: Fail if skill is too heavy
  run: |
    if [ "${{ steps.stats.outputs.rating }}" = "very heavy" ]; then
      echo "::error::Skill exceeds context budget (very heavy)"
      exit 1
    fi
```

## What It Measures

For each skill, the action reports:

- **Tier 1 tokens** -- catalog entry cost (name + description only)
- **Tier 2 tokens** -- full SKILL.md body (instructions loaded on activation)
- **Tier 3 tokens** -- each resource file individually (scripts, references, assets)
- **Min tokens** -- SKILL.md body only (Tier 2)
- **Max tokens** -- all files combined (Tier 2 + Tier 3)
- **Metadata validation** -- checks SKILL.md frontmatter against the [Agent Skills specification](https://agentskills.io/specification)
- **Context budget rating** -- lightweight / moderate / heavy / very heavy

The action also produces a **GitHub Actions job summary** with a detailed markdown report visible in the workflow run.

## Auto-Detection

The action automatically detects whether the input path is:

- **A single skill** -- the path itself contains a SKILL.md
- **A parent directory** -- the path contains subdirectories, each with their own SKILL.md

No configuration needed. Point it at `.agents/skills/`, `.opencode/skills/`, or any individual skill folder.

## Try It Locally

You don't need GitHub Actions to try skill-stats. After cloning the repo, you can analyze any skill directory on your machine:

```bash
# Install dependencies
npm install

# Analyze a single skill
npm run analyze -- /path/to/my-skill

# Analyze a directory of skills
npm run analyze -- ~/.agents/skills

# Analyze and generate badge JSON files
npm run analyze -- .opencode/skills --badges ./badges
```

This runs the same code the GitHub Action uses, just outside the Actions runner. It prints a full markdown report to stdout.

### Example output

```
Scanning: /home/user/.agents/skills
Found 3 skill(s)

  code-review               min=  1200  max=  1800  moderate
  pdf-processing            min=   800  max=  1400  moderate
  data-analysis             min=  3500  max=  5200  heavy

## Skill Stats

| Skill | Min Tokens | Max Tokens | Rating | Files |
|-------|-----------|-----------|--------|-------|
| code-review | 1,200 | 1,800 | moderate | 3 |
| pdf-processing | 800 | 1,400 | moderate | 2 |
| data-analysis | 3,500 | 5,200 | heavy | 4 |
| **Total** | **5,500** | **8,400** | | **9** |
```

## Contributing

```bash
npm install              # Install dependencies
npm test                 # Run tests (48 tests across 5 suites)
npm run test:watch       # Run tests in watch mode
npm run lint             # Type check
npm run build            # Bundle with Rollup to dist/
npm run all              # Lint + test + build (all at once)
```

### Project structure

```
src/
├── types.ts             # Shared TypeScript interfaces
├── discovery.ts         # Finds skill directories (single or multi-skill)
├── parser.ts            # Parses SKILL.md frontmatter, validates metadata
├── analyzer.ts          # Token counting via tiktoken, tier breakdown
├── output.ts            # Badge JSON, markdown summary generation
├── main.ts              # GitHub Action entry point
├── *.test.ts            # Unit and integration tests
scripts/
└── generate-badges.ts   # Local CLI for running skill-stats
```

### Making changes

1. Edit the source in `src/`
2. Run `npm test` to verify
3. Run `npm run build` to regenerate `dist/index.js`
4. Commit both `src/` and `dist/` (the bundle must be checked in for GitHub Actions)

### Running against this repo's own skills

```bash
npm run analyze -- .opencode/skills --badges ./badges
```

This is the same thing the [skill-stats workflow](.github/workflows/skill-stats.yml) does in CI -- dogfooding the action on the 10 proven-needs skills bundled in this repo.

## License

Apache-2.0
