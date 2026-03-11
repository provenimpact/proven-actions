import { BadgeJson, SkillAnalysis } from "./types.js";

/**
 * Format a token count for display.
 * < 1000: raw number (e.g., "750")
 * >= 1000: divided by 1000 with one decimal and "k" suffix (e.g., "3.5k")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1_000) {
    return tokens.toString();
  }
  const k = tokens / 1_000;
  // Avoid trailing .0
  const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
  return `${formatted}k`;
}

/**
 * Format a number with comma separators for display in tables.
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Generate a Shields.io-compatible JSON badge for a skill.
 */
export function generateBadgeJson(analysis: SkillAnalysis): BadgeJson {
  const tokenStr = formatTokenCount(analysis.maxTokens);
  return {
    schemaVersion: 1,
    label: "skill tokens",
    message: `${tokenStr} (${analysis.rating})`,
    color: analysis.badgeColor,
  };
}

/**
 * Generate a markdown summary for a single skill analysis.
 */
function generateSingleSkillMarkdown(analysis: SkillAnalysis): string {
  const lines: string[] = [];

  lines.push(`### ${analysis.skillName}`);
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(
    `| Tier 1 (Catalog) | ${formatNumber(analysis.tiers.tier1.tokens)} tokens |`
  );
  lines.push(
    `| Tier 2 (SKILL.md body) | ${formatNumber(analysis.tiers.tier2.tokens)} tokens |`
  );

  const tier3Total = analysis.tiers.tier3.reduce(
    (sum, f) => sum + f.tokens,
    0
  );
  lines.push(
    `| Tier 3 (Resources) | ${formatNumber(tier3Total)} tokens |`
  );
  lines.push(
    `| **Min (SKILL.md only)** | **${formatNumber(analysis.minTokens)} tokens** |`
  );
  lines.push(
    `| **Max (All files)** | **${formatNumber(analysis.maxTokens)} tokens** |`
  );
  lines.push(`| **Rating** | **${analysis.rating}** |`);
  lines.push("");

  // File inventory
  if (analysis.tiers.tier3.length > 0) {
    lines.push("#### File Inventory");
    lines.push("");
    lines.push("| File | Tokens | Category |");
    lines.push("|------|--------|----------|");
    lines.push(
      `| SKILL.md (body) | ${formatNumber(analysis.tiers.tier2.tokens)} | instructions |`
    );

    // Sort by category then path
    const sorted = [...analysis.tiers.tier3].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.relativePath.localeCompare(b.relativePath);
    });

    for (const file of sorted) {
      lines.push(
        `| ${file.relativePath} | ${formatNumber(file.tokens)} | ${file.category} |`
      );
    }
    lines.push("");
  }

  // Validation
  const errors = analysis.validation.filter((v) => v.severity === "error");
  const warnings = analysis.validation.filter((v) => v.severity === "warning");

  if (errors.length === 0 && warnings.length === 0) {
    lines.push("**Validation:** All checks passed");
  } else {
    lines.push("#### Validation");
    lines.push("");
    for (const issue of errors) {
      lines.push(`- :x: **Error** (${issue.field}): ${issue.message}`);
    }
    for (const issue of warnings) {
      lines.push(
        `- :warning: **Warning** (${issue.field}): ${issue.message}`
      );
    }
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a complete markdown summary for one or more skill analyses.
 */
export function generateMarkdownSummary(analyses: SkillAnalysis[]): string {
  const lines: string[] = [];

  lines.push("## Skill Stats");
  lines.push("");

  if (analyses.length > 1) {
    // Summary table for multiple skills
    lines.push("| Skill | Min Tokens | Max Tokens | Rating | Files |");
    lines.push("|-------|-----------|-----------|--------|-------|");

    let totalMin = 0;
    let totalMax = 0;
    let totalFiles = 0;

    for (const analysis of analyses) {
      totalMin += analysis.minTokens;
      totalMax += analysis.maxTokens;
      totalFiles += analysis.totalFiles;

      lines.push(
        `| ${analysis.skillName} | ${formatNumber(analysis.minTokens)} | ${formatNumber(analysis.maxTokens)} | ${analysis.rating} | ${analysis.totalFiles} |`
      );
    }

    lines.push(
      `| **Total** | **${formatNumber(totalMin)}** | **${formatNumber(totalMax)}** | | **${totalFiles}** |`
    );
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Detailed breakdown per skill
  for (const analysis of analyses) {
    lines.push(generateSingleSkillMarkdown(analysis));
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
