import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { discoverSkills } from "./discovery.js";

describe("discoverSkills", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-stats-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should detect a single skill when SKILL.md exists at root", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "SKILL.md"),
      "---\nname: test-skill\ndescription: A test skill\n---\n# Test"
    );

    const skills = await discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe(path.basename(tmpDir));
    expect(skills[0].skillMdPath).toBe(path.join(tmpDir, "SKILL.md"));
  });

  it("should discover multiple skills in subdirectories", async () => {
    const skill1 = path.join(tmpDir, "alpha-skill");
    const skill2 = path.join(tmpDir, "beta-skill");
    const skill3 = path.join(tmpDir, "gamma-skill");

    fs.mkdirSync(skill1);
    fs.mkdirSync(skill2);
    fs.mkdirSync(skill3);

    fs.writeFileSync(path.join(skill1, "SKILL.md"), "---\nname: alpha-skill\n---\n");
    fs.writeFileSync(path.join(skill2, "SKILL.md"), "---\nname: beta-skill\n---\n");
    fs.writeFileSync(path.join(skill3, "SKILL.md"), "---\nname: gamma-skill\n---\n");

    const skills = await discoverSkills(tmpDir);
    expect(skills).toHaveLength(3);
    expect(skills.map((s) => s.name)).toEqual([
      "alpha-skill",
      "beta-skill",
      "gamma-skill",
    ]);
  });

  it("should skip subdirectories without SKILL.md", async () => {
    const withSkill = path.join(tmpDir, "has-skill");
    const withoutSkill = path.join(tmpDir, "no-skill");

    fs.mkdirSync(withSkill);
    fs.mkdirSync(withoutSkill);

    fs.writeFileSync(path.join(withSkill, "SKILL.md"), "---\nname: has-skill\n---\n");
    fs.writeFileSync(path.join(withoutSkill, "README.md"), "# Not a skill");

    const skills = await discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("has-skill");
  });

  it("should skip non-directory entries in multi-skill mode", async () => {
    const skill1 = path.join(tmpDir, "real-skill");
    fs.mkdirSync(skill1);
    fs.writeFileSync(path.join(skill1, "SKILL.md"), "---\nname: real-skill\n---\n");
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Just a file");

    const skills = await discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("real-skill");
  });

  it("should return empty array when no skills found", async () => {
    const skills = await discoverSkills(tmpDir);
    expect(skills).toHaveLength(0);
  });

  it("should return empty array for non-existent path", async () => {
    const skills = await discoverSkills("/nonexistent/path/xyzzy");
    expect(skills).toHaveLength(0);
  });

  it("should sort skills alphabetically", async () => {
    for (const name of ["zeta", "alpha", "mu"]) {
      const dir = path.join(tmpDir, name);
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${name}\n---\n`);
    }

    const skills = await discoverSkills(tmpDir);
    expect(skills.map((s) => s.name)).toEqual(["alpha", "mu", "zeta"]);
  });
});
