import { describe, it, expect } from "vitest";
import { formatTokenCount, generateBadgeJson, generateMarkdownSummary } from "./output.js";
import { SkillAnalysis } from "./types.js";

describe("formatTokenCount", () => {
  it("should format numbers < 1000 as raw numbers", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(500)).toBe("500");
    expect(formatTokenCount(750)).toBe("750");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("should format numbers >= 1000 with k suffix", () => {
    expect(formatTokenCount(1000)).toBe("1k");
    expect(formatTokenCount(1500)).toBe("1.5k");
    expect(formatTokenCount(3500)).toBe("3.5k");
    expect(formatTokenCount(15200)).toBe("15.2k");
  });

  it("should not show trailing .0", () => {
    expect(formatTokenCount(2000)).toBe("2k");
    expect(formatTokenCount(10000)).toBe("10k");
  });
});

function makeAnalysis(overrides: Partial<SkillAnalysis> = {}): SkillAnalysis {
  return {
    skillName: "test-skill",
    skillDir: "/fake/test-skill",
    metadata: { name: "test-skill", description: "A test" },
    validation: [],
    tiers: {
      tier1: { tokens: 10, description: "Catalog" },
      tier2: { tokens: 500, description: "Instructions" },
      tier3: [],
    },
    minTokens: 500,
    maxTokens: 500,
    totalFiles: 1,
    totalBytes: 200,
    rating: "lightweight",
    badgeColor: "brightgreen",
    ...overrides,
  };
}

describe("generateBadgeJson", () => {
  it("should generate valid Shields.io JSON for a lightweight skill", () => {
    const badge = generateBadgeJson(makeAnalysis({ maxTokens: 500, rating: "lightweight", badgeColor: "brightgreen" }));
    expect(badge).toEqual({
      schemaVersion: 1,
      label: "test-skill",
      message: "500 (lightweight)",
      color: "brightgreen",
    });
  });

  it("should format large token counts with k suffix", () => {
    const badge = generateBadgeJson(makeAnalysis({ maxTokens: 3500, rating: "moderate", badgeColor: "yellow" }));
    expect(badge.message).toBe("3.5k (moderate)");
    expect(badge.color).toBe("yellow");
  });

  it("should handle very heavy skills", () => {
    const badge = generateBadgeJson(makeAnalysis({ maxTokens: 50000, rating: "very heavy", badgeColor: "red" }));
    expect(badge.message).toBe("50k (very heavy)");
    expect(badge.color).toBe("red");
  });
});

describe("generateMarkdownSummary", () => {
  it("should include skill name in header for single skill", () => {
    const md = generateMarkdownSummary([makeAnalysis()]);
    expect(md).toContain("### test-skill");
  });

  it("should include tier breakdown", () => {
    const analysis = makeAnalysis({
      tiers: {
        tier1: { tokens: 85, description: "Catalog" },
        tier2: { tokens: 2400, description: "Instructions" },
        tier3: [
          { relativePath: "references/ref.md", tokens: 800, category: "reference" },
        ],
      },
      minTokens: 2400,
      maxTokens: 3200,
    });

    const md = generateMarkdownSummary([analysis]);
    expect(md).toContain("85 tokens");
    expect(md).toContain("2,400 tokens");
    expect(md).toContain("references/ref.md");
  });

  it("should include summary table for multiple skills", () => {
    const analyses = [
      makeAnalysis({ skillName: "skill-a", minTokens: 100, maxTokens: 200, totalFiles: 2, rating: "lightweight" }),
      makeAnalysis({ skillName: "skill-b", minTokens: 300, maxTokens: 500, totalFiles: 3, rating: "lightweight" }),
    ];

    const md = generateMarkdownSummary(analyses);
    expect(md).toContain("skill-a");
    expect(md).toContain("skill-b");
    expect(md).toContain("**Total**");
  });

  it("should show validation passed when no issues", () => {
    const md = generateMarkdownSummary([makeAnalysis({ validation: [] })]);
    expect(md).toContain("All checks passed");
  });

  it("should show validation issues when present", () => {
    const analysis = makeAnalysis({
      validation: [
        { field: "name", severity: "warning", message: "Name has uppercase" },
      ],
    });
    const md = generateMarkdownSummary([analysis]);
    expect(md).toContain("Warning");
    expect(md).toContain("Name has uppercase");
  });
});
