/**
 * Shared type definitions for the skill-stats GitHub Action.
 */

/** A skill directory discovered during scanning. */
export interface DiscoveredSkill {
  /** Directory name (used as default skill name). */
  name: string;
  /** Absolute path to the skill directory. */
  skillDir: string;
  /** Absolute path to the SKILL.md file. */
  skillMdPath: string;
}

/** Parsed YAML frontmatter from a SKILL.md file. */
export interface SkillMetadata {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
}

/** A file within a skill directory. */
export interface SkillFile {
  /** Path relative to the skill directory (e.g., "references/REFERENCE.md"). */
  relativePath: string;
  /** Absolute path on disk. */
  absolutePath: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** File content (text files only; empty string for binary). */
  content: string;
  /** File category based on parent directory. */
  category: "skill-md" | "script" | "reference" | "asset" | "other";
}

/** A validation issue found during metadata parsing. */
export interface ValidationIssue {
  /** The frontmatter field with the issue. */
  field: string;
  /** Error = must fix; Warning = should fix. */
  severity: "error" | "warning";
  /** Human-readable description. */
  message: string;
}

/** Result of parsing a single SKILL.md file and its skill directory. */
export interface ParsedSkill {
  /** Parsed YAML frontmatter. */
  metadata: SkillMetadata;
  /** Markdown body after the frontmatter. */
  body: string;
  /** Full raw SKILL.md content. */
  rawContent: string;
  /** All files in the skill directory. */
  files: SkillFile[];
  /** Validation issues found during parsing. */
  validationIssues: ValidationIssue[];
}

/** Token count for a single resource file. */
export interface FileTokenCount {
  /** Path relative to skill directory. */
  relativePath: string;
  /** Token count for this file. */
  tokens: number;
  /** File category. */
  category: string;
}

/** Progressive disclosure tier breakdown. */
export interface TierBreakdown {
  tier1: {
    /** Tokens for catalog entry (name + description). */
    tokens: number;
    description: string;
  };
  tier2: {
    /** Tokens for SKILL.md body (instructions). */
    tokens: number;
    description: string;
  };
  /** Per-resource-file token counts. */
  tier3: FileTokenCount[];
}

/** Context budget rating. */
export type ContextRating = "lightweight" | "moderate" | "heavy" | "very heavy";

/** Complete analysis result for one skill. */
export interface SkillAnalysis {
  /** Skill name (from metadata or directory name). */
  skillName: string;
  /** Absolute path to skill directory. */
  skillDir: string;
  /** Parsed metadata. */
  metadata: SkillMetadata;
  /** Validation issues. */
  validation: ValidationIssue[];
  /** Progressive disclosure tier breakdown. */
  tiers: TierBreakdown;
  /** Minimum token cost (SKILL.md body only). */
  minTokens: number;
  /** Maximum token cost (all files). */
  maxTokens: number;
  /** Total number of files in skill directory. */
  totalFiles: number;
  /** Total size in bytes of all files. */
  totalBytes: number;
  /** Context budget rating. */
  rating: ContextRating;
  /** Shields.io badge color. */
  badgeColor: string;
}

/** Shields.io JSON endpoint format. */
export interface BadgeJson {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
}
