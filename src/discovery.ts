import * as fs from "fs";
import * as path from "path";
import { DiscoveredSkill } from "./types.js";

/**
 * Discover Agent Skill directories at the given path.
 *
 * Two modes:
 * - Single-skill: If `inputPath` itself contains a SKILL.md, return it as a single skill.
 * - Multi-skill: Otherwise, scan immediate subdirectories for SKILL.md files.
 *
 * @param inputPath - Absolute or relative path to scan.
 * @returns Array of discovered skills (may be empty if none found).
 */
export async function discoverSkills(
  inputPath: string
): Promise<DiscoveredSkill[]> {
  const resolvedPath = path.resolve(inputPath);

  // Check if the path exists
  if (!fs.existsSync(resolvedPath)) {
    return [];
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    return [];
  }

  // Single-skill mode: SKILL.md at root
  const rootSkillMd = path.join(resolvedPath, "SKILL.md");
  if (fs.existsSync(rootSkillMd)) {
    return [
      {
        name: path.basename(resolvedPath),
        skillDir: resolvedPath,
        skillMdPath: rootSkillMd,
      },
    ];
  }

  // Multi-skill mode: scan subdirectories
  const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
  const skills: DiscoveredSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const subDir = path.join(resolvedPath, entry.name);
    const subSkillMd = path.join(subDir, "SKILL.md");

    if (fs.existsSync(subSkillMd)) {
      skills.push({
        name: entry.name,
        skillDir: subDir,
        skillMdPath: subSkillMd,
      });
    }
  }

  // Sort alphabetically for deterministic output
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return skills;
}
