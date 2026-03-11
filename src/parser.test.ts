import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseSkill } from "./parser.js";
import { DiscoveredSkill } from "./types.js";

describe("parseSkill", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-stats-parser-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSkill(
    name: string,
    skillMdContent: string,
    extraFiles: Record<string, string> = {}
  ): DiscoveredSkill {
    const skillDir = path.join(tmpDir, name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMdContent);

    for (const [filePath, content] of Object.entries(extraFiles)) {
      const fullPath = path.join(skillDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    return {
      name,
      skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
    };
  }

  it("should parse valid frontmatter with required fields", async () => {
    const skill = createSkill(
      "code-review",
      '---\nname: code-review\ndescription: Reviews code for quality\n---\n# Instructions\n\nDo the review.'
    );

    const result = await parseSkill(skill);
    expect(result.metadata.name).toBe("code-review");
    expect(result.metadata.description).toBe("Reviews code for quality");
    expect(result.body).toBe("# Instructions\n\nDo the review.");
    expect(result.validationIssues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("should parse optional fields", async () => {
    const skill = createSkill(
      "pdf-tool",
      '---\nname: pdf-tool\ndescription: Processes PDFs\nlicense: MIT\ncompatibility: Requires poppler\n---\n# PDF Tool'
    );

    const result = await parseSkill(skill);
    expect(result.metadata.license).toBe("MIT");
    expect(result.metadata.compatibility).toBe("Requires poppler");
  });

  it("should separate body from frontmatter", async () => {
    const body = "# My Skill\n\nThis is the body content.\n\n## Section 2\n\nMore content.";
    const skill = createSkill(
      "test-skill",
      `---\nname: test-skill\ndescription: Test\n---\n${body}`
    );

    const result = await parseSkill(skill);
    expect(result.body).toBe(body);
  });

  it("should report error for missing name field", async () => {
    const skill = createSkill(
      "no-name",
      "---\ndescription: Has description but no name\n---\n# Content"
    );

    const result = await parseSkill(skill);
    const errors = result.validationIssues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
  });

  it("should report error for missing description field", async () => {
    const skill = createSkill(
      "no-desc",
      "---\nname: no-desc\n---\n# Content"
    );

    const result = await parseSkill(skill);
    const errors = result.validationIssues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("description");
  });

  it("should report error for missing frontmatter", async () => {
    const skill = createSkill("no-frontmatter", "# Just markdown, no frontmatter");

    const result = await parseSkill(skill);
    const errors = result.validationIssues.filter((i) => i.severity === "error");
    expect(errors.some((e) => e.field === "frontmatter" || e.field === "name" || e.field === "description")).toBe(true);
  });

  it("should warn when name does not match directory name", async () => {
    const skill = createSkill(
      "my-dir",
      "---\nname: different-name\ndescription: Test\n---\n# Content"
    );

    const result = await parseSkill(skill);
    const warnings = result.validationIssues.filter(
      (i) => i.severity === "warning" && i.field === "name" && i.message.includes("does not match")
    );
    expect(warnings).toHaveLength(1);
  });

  it("should warn about uppercase characters in name", async () => {
    const skill = createSkill(
      "Code-Review",
      "---\nname: Code-Review\ndescription: Test\n---\n# Content"
    );

    const result = await parseSkill(skill);
    const warnings = result.validationIssues.filter(
      (i) => i.severity === "warning" && i.message.includes("uppercase")
    );
    expect(warnings).toHaveLength(1);
  });

  it("should warn about name exceeding 64 characters", async () => {
    const longName = "a".repeat(65);
    const skill = createSkill(
      longName,
      `---\nname: ${longName}\ndescription: Test\n---\n# Content`
    );

    const result = await parseSkill(skill);
    const warnings = result.validationIssues.filter(
      (i) => i.severity === "warning" && i.message.includes("64")
    );
    expect(warnings).toHaveLength(1);
  });

  it("should warn about consecutive hyphens", async () => {
    const skill = createSkill(
      "code--review",
      "---\nname: code--review\ndescription: Test\n---\n# Content"
    );

    const result = await parseSkill(skill);
    const warnings = result.validationIssues.filter(
      (i) => i.severity === "warning" && i.message.includes("consecutive")
    );
    expect(warnings).toHaveLength(1);
  });

  it("should enumerate all files in the skill directory", async () => {
    const skill = createSkill("multi-file", "---\nname: multi-file\ndescription: Test\n---\n# Content", {
      "references/REFERENCE.md": "# Reference content",
      "scripts/extract.py": "print('hello')",
      "assets/template.json": '{"key": "value"}',
    });

    const result = await parseSkill(skill);
    expect(result.files).toHaveLength(4); // SKILL.md + 3 extra files

    const categories = result.files.map((f) => f.category).sort();
    expect(categories).toEqual(["asset", "reference", "script", "skill-md"]);
  });

  it("should categorize files by parent directory", async () => {
    const skill = createSkill("categorized", "---\nname: categorized\ndescription: Test\n---\n# Content", {
      "scripts/run.sh": "#!/bin/bash",
      "references/guide.md": "# Guide",
      "assets/logo.txt": "logo placeholder",
      "other-dir/notes.txt": "notes",
    });

    const result = await parseSkill(skill);

    const byCategory = new Map(result.files.map((f) => [f.relativePath, f.category]));
    expect(byCategory.get("SKILL.md")).toBe("skill-md");
    expect(byCategory.get(["scripts", "run.sh"].join("/"))).toBe("script");
    expect(byCategory.get(["references", "guide.md"].join("/"))).toBe("reference");
    expect(byCategory.get(["assets", "logo.txt"].join("/"))).toBe("asset");
    expect(byCategory.get(["other-dir", "notes.txt"].join("/"))).toBe("other");
  });
});
