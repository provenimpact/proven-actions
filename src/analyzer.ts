import { encodingForModel, type Tiktoken } from "js-tiktoken";
import {
  ParsedSkill,
  SkillAnalysis,
  TierBreakdown,
  FileTokenCount,
  ContextRating,
} from "./types.js";

/** Rating thresholds based on max token count. */
const RATING_THRESHOLDS: Array<{
  maxExclusive: number;
  rating: ContextRating;
  color: string;
}> = [
  { maxExclusive: 1_000, rating: "lightweight", color: "brightgreen" },
  { maxExclusive: 5_000, rating: "moderate", color: "yellow" },
  { maxExclusive: 20_000, rating: "heavy", color: "orange" },
  { maxExclusive: Infinity, rating: "very heavy", color: "red" },
];

/** Singleton encoder instance. */
let encoder: Tiktoken | null = null;

/**
 * Get or create the tiktoken encoder.
 * Uses cl100k_base via the gpt-4 model encoding (ADR-0002).
 */
function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = encodingForModel("gpt-4");
  }
  return encoder;
}

/**
 * Count tokens in a string using cl100k_base encoding.
 */
export function countTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }
  const enc = getEncoder();
  const tokens = enc.encode(text);
  return tokens.length;
}

/**
 * Classify context budget rating based on max token count.
 */
export function classifyRating(
  maxTokens: number
): { rating: ContextRating; color: string } {
  for (const threshold of RATING_THRESHOLDS) {
    if (maxTokens < threshold.maxExclusive) {
      return { rating: threshold.rating, color: threshold.color };
    }
  }
  // Fallback (should not reach here due to Infinity)
  return { rating: "very heavy", color: "red" };
}

/**
 * Analyze a parsed skill: calculate token counts for each progressive
 * disclosure tier and determine context budget rating.
 */
export function analyzeSkill(
  parsed: ParsedSkill,
  skillName: string,
  skillDir: string
): SkillAnalysis {
  // Tier 1: Catalog entry (name + description)
  const catalogText = [
    parsed.metadata.name || "",
    parsed.metadata.description || "",
  ]
    .filter(Boolean)
    .join(" ");
  const tier1Tokens = countTokens(catalogText);

  // Tier 2: SKILL.md body (markdown after frontmatter)
  const tier2Tokens = countTokens(parsed.body);

  // Tier 3: Each resource file (excluding SKILL.md itself)
  const tier3Files: FileTokenCount[] = [];
  for (const file of parsed.files) {
    if (file.category === "skill-md") {
      continue; // SKILL.md body is already counted in Tier 2
    }
    if (!file.content) {
      continue; // Skip binary files
    }
    const tokens = countTokens(file.content);
    tier3Files.push({
      relativePath: file.relativePath,
      tokens,
      category: file.category,
    });
  }

  const tier3TotalTokens = tier3Files.reduce((sum, f) => sum + f.tokens, 0);

  const tiers: TierBreakdown = {
    tier1: {
      tokens: tier1Tokens,
      description: "Catalog entry (name + description)",
    },
    tier2: {
      tokens: tier2Tokens,
      description: "Full SKILL.md instructions",
    },
    tier3: tier3Files,
  };

  const minTokens = tier2Tokens;
  const maxTokens = tier2Tokens + tier3TotalTokens;

  const totalBytes = parsed.files.reduce((sum, f) => sum + f.sizeBytes, 0);

  const { rating, color } = classifyRating(maxTokens);

  return {
    skillName,
    skillDir,
    metadata: parsed.metadata,
    validation: parsed.validationIssues,
    tiers,
    minTokens,
    maxTokens,
    totalFiles: parsed.files.length,
    totalBytes,
    rating,
    badgeColor: color,
  };
}

/**
 * Release the tiktoken encoder reference.
 * Call this after all analysis is complete.
 * (js-tiktoken is pure JS — no WASM resources to free, but we clear
 * the singleton so it can be garbage-collected.)
 */
export function freeEncoder(): void {
  encoder = null;
}
