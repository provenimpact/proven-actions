import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { discoverSkills } from "./discovery.js";
import { parseSkill } from "./parser.js";
import { analyzeSkill, freeEncoder } from "./analyzer.js";
import { generateBadgeJson, generateMarkdownSummary } from "./output.js";
import { SkillAnalysis } from "./types.js";

async function run(): Promise<void> {
  try {
    // Read inputs
    const inputPath = core.getInput("path") || ".";
    const badgeOutputDir = core.getInput("badge-output-dir") || "";

    core.info(`Scanning for Agent Skills at: ${inputPath}`);

    // Discover skills
    const discovered = await discoverSkills(inputPath);

    if (discovered.length === 0) {
      core.setFailed(
        `No Agent Skills found at path "${inputPath}". ` +
          "Ensure the path contains a SKILL.md file or subdirectories with SKILL.md files."
      );
      return;
    }

    core.info(`Found ${discovered.length} skill(s): ${discovered.map((s) => s.name).join(", ")}`);

    // Parse and analyze each skill
    const analyses: SkillAnalysis[] = [];

    for (const skill of discovered) {
      core.info(`Analyzing: ${skill.name}`);

      const parsed = await parseSkill(skill);
      const analysis = analyzeSkill(parsed, skill.name, skill.skillDir);
      analyses.push(analysis);

      // Log per-skill summary
      core.info(
        `  ${skill.name}: min=${analysis.minTokens} max=${analysis.maxTokens} rating=${analysis.rating}`
      );
    }

    // Free tiktoken resources
    freeEncoder();

    // Generate outputs
    // 1. Badge JSON files
    if (badgeOutputDir) {
      const resolvedBadgeDir = path.resolve(badgeOutputDir);
      if (!fs.existsSync(resolvedBadgeDir)) {
        fs.mkdirSync(resolvedBadgeDir, { recursive: true });
      }

      for (const analysis of analyses) {
        const badge = generateBadgeJson(analysis);
        const badgePath = path.join(
          resolvedBadgeDir,
          `${analysis.skillName}-badge.json`
        );
        fs.writeFileSync(badgePath, JSON.stringify(badge, null, 2) + "\n");
        core.info(`Badge written: ${badgePath}`);
      }
    }

    // 2. Markdown summary -> job summary
    const markdown = generateMarkdownSummary(analyses);
    await core.summary.addRaw(markdown).write();

    // 3. Set action outputs
    // For single skill, use its values directly; for multiple, use first skill + aggregate
    const primary = analyses[0];
    const totalMin = analyses.reduce((sum, a) => sum + a.minTokens, 0);
    const totalMax = analyses.reduce((sum, a) => sum + a.maxTokens, 0);

    core.setOutput("stats_json", JSON.stringify(analyses, null, 2));
    core.setOutput(
      "min_tokens",
      analyses.length === 1 ? primary.minTokens.toString() : totalMin.toString()
    );
    core.setOutput(
      "max_tokens",
      analyses.length === 1 ? primary.maxTokens.toString() : totalMax.toString()
    );
    core.setOutput(
      "rating",
      analyses.length === 1 ? primary.rating : "multiple"
    );
    core.setOutput(
      "badge_json",
      analyses.length === 1
        ? JSON.stringify(generateBadgeJson(primary))
        : JSON.stringify(analyses.map((a) => generateBadgeJson(a)))
    );

    core.info("Skill stats analysis complete.");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred.");
    }
  }
}

run();
