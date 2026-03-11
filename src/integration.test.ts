import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { discoverSkills } from "./discovery.js";
import { parseSkill } from "./parser.js";
import { analyzeSkill, freeEncoder } from "./analyzer.js";
import { generateBadgeJson, generateMarkdownSummary } from "./output.js";

afterAll(() => {
  freeEncoder();
});

describe("Integration: full pipeline", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-stats-integ-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFixtureSkill(
    name: string,
    skillMd: string,
    files: Record<string, string> = {}
  ): string {
    const skillDir = path.join(tmpDir, name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd);

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(skillDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    return skillDir;
  }

  it("should analyze a single skill end-to-end", async () => {
    const skillDir = createFixtureSkill(
      "code-review",
      [
        "---",
        "name: code-review",
        "description: Reviews code for quality and best practices. Use when asked to review code.",
        "license: MIT",
        "---",
        "",
        "# Code Review",
        "",
        "## When to use",
        "Use this skill when the user asks for a code review.",
        "",
        "## Steps",
        "1. Read the code",
        "2. Identify issues",
        "3. Suggest improvements",
      ].join("\n"),
      {
        "references/style-guide.md":
          "# Style Guide\n\nFollow consistent naming conventions.\nUse meaningful variable names.\nKeep functions small.",
        "scripts/lint.sh": '#!/bin/bash\neslint "$1"',
      }
    );

    // Discover
    const discovered = await discoverSkills(skillDir);
    expect(discovered).toHaveLength(1);
    expect(discovered[0].name).toBe("code-review");

    // Parse
    const parsed = await parseSkill(discovered[0]);
    expect(parsed.metadata.name).toBe("code-review");
    expect(parsed.metadata.description).toContain("Reviews code");
    expect(parsed.body).toContain("# Code Review");
    expect(parsed.files.length).toBeGreaterThanOrEqual(3); // SKILL.md + 2 extras
    expect(parsed.validationIssues.filter((i) => i.severity === "error")).toHaveLength(0);

    // Analyze
    const analysis = analyzeSkill(parsed, discovered[0].name, discovered[0].skillDir);
    expect(analysis.skillName).toBe("code-review");
    expect(analysis.tiers.tier1.tokens).toBeGreaterThan(0);
    expect(analysis.tiers.tier2.tokens).toBeGreaterThan(0);
    expect(analysis.tiers.tier3.length).toBeGreaterThan(0);
    expect(analysis.minTokens).toBe(analysis.tiers.tier2.tokens);
    expect(analysis.maxTokens).toBeGreaterThan(analysis.minTokens);
    expect(analysis.rating).toBe("lightweight"); // Small test skill

    // Badge
    const badge = generateBadgeJson(analysis);
    expect(badge.schemaVersion).toBe(1);
    expect(badge.label).toBe("code-review");
    expect(badge.message).toContain("lightweight");
    expect(badge.color).toBe("brightgreen");

    // Markdown
    const md = generateMarkdownSummary([analysis]);
    expect(md).toContain("code-review");
    expect(md).toContain("Tier 1");
    expect(md).toContain("Tier 2");
    expect(md).toContain("All checks passed");
  });

  it("should analyze multiple skills end-to-end", async () => {
    createFixtureSkill(
      "alpha",
      "---\nname: alpha\ndescription: First skill\n---\n# Alpha\n\nAlpha content."
    );
    createFixtureSkill(
      "beta",
      "---\nname: beta\ndescription: Second skill\n---\n# Beta\n\nBeta content.",
      {
        "references/guide.md": "# Guide\n\nA reference guide with more content to increase token count.",
      }
    );

    // Discover from parent
    const discovered = await discoverSkills(tmpDir);
    expect(discovered).toHaveLength(2);

    // Full pipeline
    const analyses: import("./types.js").SkillAnalysis[] = [];
    for (const skill of discovered) {
      const parsed = await parseSkill(skill);
      analyses.push(analyzeSkill(parsed, skill.name, skill.skillDir));
    }

    expect(analyses).toHaveLength(2);

    // Beta should have more max tokens than alpha (has reference file)
    const alpha = analyses.find((a) => a.skillName === "alpha")!;
    const beta = analyses.find((a) => a.skillName === "beta")!;
    expect(beta.maxTokens).toBeGreaterThan(alpha.maxTokens);

    // Markdown should have summary table
    const md = generateMarkdownSummary(analyses);
    expect(md).toContain("alpha");
    expect(md).toContain("beta");
    expect(md).toContain("**Total**");
  });

  it("should handle a skill with validation warnings", async () => {
    createFixtureSkill(
      "Bad-Name",
      "---\nname: Bad-Name\ndescription: Has issues\n---\n# Content"
    );

    const discovered = await discoverSkills(path.join(tmpDir, "Bad-Name"));
    const parsed = await parseSkill(discovered[0]);

    const warnings = parsed.validationIssues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.message.includes("uppercase"))).toBe(true);
  });

  it("should work with real skills from .opencode/skills", async () => {
    // Test against the actual proven-needs skills in this repo if they exist
    const realSkillsDir = path.resolve(__dirname, "../.opencode/skills");
    if (!fs.existsSync(realSkillsDir)) {
      return; // Skip if not available (e.g., in CI)
    }

    const discovered = await discoverSkills(realSkillsDir);
    expect(discovered.length).toBeGreaterThan(0);

    for (const skill of discovered) {
      const parsed = await parseSkill(skill);
      const analysis = analyzeSkill(parsed, skill.name, skill.skillDir);

      // Basic sanity checks
      expect(analysis.minTokens).toBeGreaterThan(0);
      expect(analysis.maxTokens).toBeGreaterThanOrEqual(analysis.minTokens);
      expect(analysis.tiers.tier2.tokens).toBeGreaterThan(0);
      expect(["lightweight", "moderate", "heavy", "very heavy"]).toContain(analysis.rating);
    }
  });
});
