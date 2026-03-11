/**
 * Run skill-stats locally against any skill directory.
 *
 * Usage:
 *   npx tsx scripts/generate-badges.ts [path] [--badges <dir>]
 *
 * Examples:
 *   npx tsx scripts/generate-badges.ts .opencode/skills
 *   npx tsx scripts/generate-badges.ts ./my-skill --badges ./badges
 *   npx tsx scripts/generate-badges.ts ~/.agents/skills
 *
 * If no path is given, defaults to .opencode/skills
 */
import * as fs from "fs";
import * as path from "path";
import { discoverSkills } from "../src/discovery.js";
import { parseSkill } from "../src/parser.js";
import { analyzeSkill, freeEncoder } from "../src/analyzer.js";
import { generateBadgeJson, generateMarkdownSummary } from "../src/output.js";

function parseArgs(): { skillsPath: string; badgeDir: string | null } {
  const args = process.argv.slice(2);
  let skillsPath = ".opencode/skills";
  let badgeDir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--badges" && i + 1 < args.length) {
      badgeDir = args[++i];
    } else if (!args[i].startsWith("--")) {
      skillsPath = args[i];
    }
  }

  return { skillsPath, badgeDir };
}

async function main() {
  const { skillsPath, badgeDir } = parseArgs();
  const resolvedPath = path.resolve(skillsPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`Scanning: ${resolvedPath}`);

  const discovered = await discoverSkills(resolvedPath);
  if (discovered.length === 0) {
    console.error(`No Agent Skills found at: ${resolvedPath}`);
    console.error("Ensure the path contains a SKILL.md or subdirectories with SKILL.md files.");
    process.exit(1);
  }

  console.log(`Found ${discovered.length} skill(s)\n`);

  if (badgeDir) {
    const resolvedBadgeDir = path.resolve(badgeDir);
    if (!fs.existsSync(resolvedBadgeDir)) {
      fs.mkdirSync(resolvedBadgeDir, { recursive: true });
    }
  }

  const analyses: Awaited<ReturnType<typeof analyzeSkill>>[] = [];
  for (const skill of discovered) {
    const parsed = await parseSkill(skill);
    const analysis = analyzeSkill(parsed, skill.name, skill.skillDir);
    analyses.push(analysis);

    if (badgeDir) {
      const badge = generateBadgeJson(analysis);
      const badgePath = path.join(path.resolve(badgeDir), `${analysis.skillName}-badge.json`);
      fs.writeFileSync(badgePath, JSON.stringify(badge, null, 2) + "\n");
    }

    // Per-skill summary line
    const errors = analysis.validation.filter(v => v.severity === "error");
    const warnings = analysis.validation.filter(v => v.severity === "warning");
    const status = errors.length > 0
      ? `  ERRORS: ${errors.length}`
      : warnings.length > 0
        ? `  warnings: ${warnings.length}`
        : "";
    console.log(
      `  ${skill.name.padEnd(25)} min=${String(analysis.minTokens).padStart(6)}  max=${String(analysis.maxTokens).padStart(6)}  ${analysis.rating}${status}`
    );
  }

  freeEncoder();

  // Print markdown summary
  console.log("");
  console.log(generateMarkdownSummary(analyses));

  if (badgeDir) {
    console.log(`Badge JSON files written to: ${path.resolve(badgeDir)}/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
