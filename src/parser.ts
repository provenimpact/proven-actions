import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import {
  DiscoveredSkill,
  ParsedSkill,
  SkillFile,
  SkillMetadata,
  ValidationIssue,
} from "./types.js";

/** File extensions considered binary (skip content reading). */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
]);

/**
 * Categorize a file based on its relative path within the skill directory.
 */
function categorizeFile(
  relativePath: string
): SkillFile["category"] {
  if (relativePath === "SKILL.md") {
    return "skill-md";
  }

  const firstSegment = relativePath.split(path.sep)[0];
  switch (firstSegment) {
    case "scripts":
      return "script";
    case "references":
      return "reference";
    case "assets":
      return "asset";
    default:
      return "other";
  }
}

/**
 * Recursively enumerate all files in a directory.
 */
function enumerateFiles(
  dir: string,
  baseDir: string
): SkillFile[] {
  const results: SkillFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      results.push(...enumerateFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath);
      const ext = path.extname(entry.name).toLowerCase();
      const stat = fs.statSync(fullPath);

      let content = "";
      if (!BINARY_EXTENSIONS.has(ext)) {
        try {
          content = fs.readFileSync(fullPath, "utf-8");
        } catch {
          // If we can't read it, treat as binary
          content = "";
        }
      }

      results.push({
        relativePath,
        absolutePath: fullPath,
        sizeBytes: stat.size,
        content,
        category: categorizeFile(relativePath),
      });
    }
  }

  return results;
}

/**
 * Validate SKILL.md frontmatter against the Agent Skills specification.
 */
function validateMetadata(
  metadata: SkillMetadata,
  directoryName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Required: name
  if (!metadata.name) {
    issues.push({
      field: "name",
      severity: "error",
      message: 'Required field "name" is missing from frontmatter.',
    });
  } else {
    // Name format checks (warnings)
    if (metadata.name !== metadata.name.toLowerCase()) {
      issues.push({
        field: "name",
        severity: "warning",
        message: `Name "${metadata.name}" contains uppercase characters. Names should be lowercase.`,
      });
    }

    if (metadata.name.length > 64) {
      issues.push({
        field: "name",
        severity: "warning",
        message: `Name "${metadata.name}" exceeds 64 character limit (${metadata.name.length} chars).`,
      });
    }

    if (metadata.name.includes("--")) {
      issues.push({
        field: "name",
        severity: "warning",
        message: `Name "${metadata.name}" contains consecutive hyphens.`,
      });
    }

    if (metadata.name.startsWith("-") || metadata.name.endsWith("-")) {
      issues.push({
        field: "name",
        severity: "warning",
        message: `Name "${metadata.name}" starts or ends with a hyphen.`,
      });
    }

    if (metadata.name !== directoryName) {
      issues.push({
        field: "name",
        severity: "warning",
        message: `Name "${metadata.name}" does not match directory name "${directoryName}".`,
      });
    }
  }

  // Required: description
  if (!metadata.description) {
    issues.push({
      field: "description",
      severity: "error",
      message: 'Required field "description" is missing from frontmatter.',
    });
  } else if (metadata.description.length > 1024) {
    issues.push({
      field: "description",
      severity: "warning",
      message: `Description exceeds 1024 character limit (${metadata.description.length} chars).`,
    });
  }

  // Optional: compatibility length
  if (metadata.compatibility && metadata.compatibility.length > 500) {
    issues.push({
      field: "compatibility",
      severity: "warning",
      message: `Compatibility field exceeds 500 character limit (${metadata.compatibility.length} chars).`,
    });
  }

  return issues;
}

/**
 * Parse a discovered skill: extract frontmatter, body, enumerate files, validate.
 */
export async function parseSkill(
  discovered: DiscoveredSkill
): Promise<ParsedSkill> {
  const rawContent = fs.readFileSync(discovered.skillMdPath, "utf-8");

  // Try to parse frontmatter
  let metadata: SkillMetadata = {};
  let body: string = rawContent;
  let frontmatterParsed = false;

  try {
    const parsed = matter(rawContent);
    if (parsed.data && typeof parsed.data === "object") {
      const data = parsed.data as Record<string, unknown>;
      metadata = {
        name: typeof data.name === "string" ? data.name : undefined,
        description:
          typeof data.description === "string" ? data.description : undefined,
        license: typeof data.license === "string" ? data.license : undefined,
        compatibility:
          typeof data.compatibility === "string"
            ? data.compatibility
            : undefined,
        metadata:
          typeof data.metadata === "object" && data.metadata !== null
            ? (data.metadata as Record<string, string>)
            : undefined,
        allowedTools:
          typeof data["allowed-tools"] === "string"
            ? data["allowed-tools"]
            : undefined,
      };
      body = parsed.content.trim();
      frontmatterParsed = true;
    }
  } catch {
    // Frontmatter parsing failed
    frontmatterParsed = false;
  }

  // Enumerate files
  const files = enumerateFiles(discovered.skillDir, discovered.skillDir);

  // Validate
  const validationIssues: ValidationIssue[] = [];

  if (!frontmatterParsed) {
    validationIssues.push({
      field: "frontmatter",
      severity: "error",
      message:
        "SKILL.md does not contain valid YAML frontmatter (missing or unparseable --- delimiters).",
    });
  } else {
    validationIssues.push(
      ...validateMetadata(metadata, discovered.name)
    );
  }

  return {
    metadata,
    body,
    rawContent,
    files,
    validationIssues,
  };
}
