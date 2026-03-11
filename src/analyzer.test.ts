import { describe, it, expect, afterAll } from "vitest";
import { countTokens, classifyRating, analyzeSkill, freeEncoder } from "./analyzer.js";
import { ParsedSkill } from "./types.js";

afterAll(() => {
  freeEncoder();
});

describe("countTokens", () => {
  it("should return 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("should count tokens for a simple string", () => {
    const tokens = countTokens("Hello, world!");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it("should count more tokens for longer text", () => {
    const short = countTokens("Hello");
    const long = countTokens(
      "This is a much longer piece of text that should produce more tokens than a simple greeting."
    );
    expect(long).toBeGreaterThan(short);
  });
});

describe("classifyRating", () => {
  it("should classify < 1000 as lightweight", () => {
    expect(classifyRating(0)).toEqual({ rating: "lightweight", color: "brightgreen" });
    expect(classifyRating(500)).toEqual({ rating: "lightweight", color: "brightgreen" });
    expect(classifyRating(999)).toEqual({ rating: "lightweight", color: "brightgreen" });
  });

  it("should classify 1000-4999 as moderate", () => {
    expect(classifyRating(1000)).toEqual({ rating: "moderate", color: "yellow" });
    expect(classifyRating(3500)).toEqual({ rating: "moderate", color: "yellow" });
    expect(classifyRating(4999)).toEqual({ rating: "moderate", color: "yellow" });
  });

  it("should classify 5000-19999 as heavy", () => {
    expect(classifyRating(5000)).toEqual({ rating: "heavy", color: "orange" });
    expect(classifyRating(12000)).toEqual({ rating: "heavy", color: "orange" });
    expect(classifyRating(19999)).toEqual({ rating: "heavy", color: "orange" });
  });

  it("should classify >= 20000 as very heavy", () => {
    expect(classifyRating(20000)).toEqual({ rating: "very heavy", color: "red" });
    expect(classifyRating(50000)).toEqual({ rating: "very heavy", color: "red" });
  });
});

describe("analyzeSkill", () => {
  function makeParsedSkill(overrides: Partial<ParsedSkill> = {}): ParsedSkill {
    return {
      metadata: {
        name: "test-skill",
        description: "A test skill for testing purposes",
        ...overrides.metadata,
      },
      body: overrides.body ?? "# Test Skill\n\nThis is a test skill with some content.",
      rawContent: overrides.rawContent ?? "---\nname: test-skill\n---\n# Test",
      files: overrides.files ?? [
        {
          relativePath: "SKILL.md",
          absolutePath: "/fake/SKILL.md",
          sizeBytes: 100,
          content: "---\nname: test\n---\n# Test",
          category: "skill-md" as const,
        },
      ],
      validationIssues: overrides.validationIssues ?? [],
    };
  }

  it("should calculate tier 1 tokens from name and description", () => {
    const parsed = makeParsedSkill();
    const result = analyzeSkill(parsed, "test-skill", "/fake");

    expect(result.tiers.tier1.tokens).toBeGreaterThan(0);
    expect(result.tiers.tier1.description).toBe("Catalog entry (name + description)");
  });

  it("should calculate tier 2 tokens from body", () => {
    const parsed = makeParsedSkill({
      body: "# Instructions\n\nStep 1: Do something.\nStep 2: Do something else.",
    });
    const result = analyzeSkill(parsed, "test-skill", "/fake");

    expect(result.tiers.tier2.tokens).toBeGreaterThan(0);
    expect(result.tiers.tier2.description).toBe("Full SKILL.md instructions");
  });

  it("should set min tokens equal to tier 2", () => {
    const parsed = makeParsedSkill();
    const result = analyzeSkill(parsed, "test-skill", "/fake");

    expect(result.minTokens).toBe(result.tiers.tier2.tokens);
  });

  it("should set max tokens to tier 2 + tier 3 sum", () => {
    const parsed = makeParsedSkill({
      files: [
        {
          relativePath: "SKILL.md",
          absolutePath: "/fake/SKILL.md",
          sizeBytes: 50,
          content: "# skill",
          category: "skill-md",
        },
        {
          relativePath: "references/ref.md",
          absolutePath: "/fake/references/ref.md",
          sizeBytes: 100,
          content: "# Reference\n\nSome reference content that adds tokens.",
          category: "reference",
        },
      ],
    });

    const result = analyzeSkill(parsed, "test-skill", "/fake");

    const tier3Total = result.tiers.tier3.reduce((sum, f) => sum + f.tokens, 0);
    expect(result.maxTokens).toBe(result.tiers.tier2.tokens + tier3Total);
    expect(result.maxTokens).toBeGreaterThan(result.minTokens);
  });

  it("should have min equal max when no resource files", () => {
    const parsed = makeParsedSkill({
      files: [
        {
          relativePath: "SKILL.md",
          absolutePath: "/fake/SKILL.md",
          sizeBytes: 50,
          content: "---\nname: test\n---\n# Test",
          category: "skill-md",
        },
      ],
    });

    const result = analyzeSkill(parsed, "test-skill", "/fake");
    expect(result.minTokens).toBe(result.maxTokens);
  });

  it("should not include SKILL.md in tier 3", () => {
    const parsed = makeParsedSkill({
      files: [
        {
          relativePath: "SKILL.md",
          absolutePath: "/fake/SKILL.md",
          sizeBytes: 50,
          content: "# Skill content",
          category: "skill-md",
        },
      ],
    });

    const result = analyzeSkill(parsed, "test-skill", "/fake");
    expect(result.tiers.tier3).toHaveLength(0);
  });

  it("should assign correct rating based on max tokens", () => {
    // Create a skill with known small content
    const parsed = makeParsedSkill({
      body: "Hi",
      files: [
        {
          relativePath: "SKILL.md",
          absolutePath: "/fake/SKILL.md",
          sizeBytes: 10,
          content: "Hi",
          category: "skill-md",
        },
      ],
    });

    const result = analyzeSkill(parsed, "test-skill", "/fake");
    expect(result.rating).toBe("lightweight");
    expect(result.badgeColor).toBe("brightgreen");
  });
});
