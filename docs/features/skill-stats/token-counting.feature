@skill-stats
Feature: Token Cost Calculation
  As a skill author,
  I want to know how many tokens my Agent Skill consumes from an LLM context window,
  so that I can optimize my skill size and communicate its context cost to users.

  Background:
    Given the tiktoken cl100k_base tokenizer is available

  @SS-001
  Scenario: Calculate minimum token cost for a simple skill
    Given a skill directory containing only a SKILL.md file
    When I analyze the skill
    Then the minimum token count should equal the SKILL.md body token count
    And the maximum token count should equal the SKILL.md body token count

  @SS-002
  Scenario: Calculate maximum token cost including all resources
    Given a skill directory containing:
      | file                       | size   |
      | SKILL.md                   | 2000b  |
      | references/REFERENCE.md    | 5000b  |
      | scripts/extract.py         | 1200b  |
      | assets/template.json       | 800b   |
    When I analyze the skill
    Then the minimum token count should reflect only the SKILL.md body
    And the maximum token count should reflect all files combined

  @SS-003
  Scenario: Calculate progressive disclosure tier breakdown
    Given a skill directory with a SKILL.md and reference files
    When I analyze the skill
    Then the result should include a Tier 1 token count for the catalog entry
    And the result should include a Tier 2 token count for the SKILL.md body
    And the result should include a Tier 3 token count for each resource file

  @SS-001
  Scenario: Minimum token count excludes YAML frontmatter
    Given a SKILL.md file with YAML frontmatter and a markdown body
    When I calculate the minimum token count
    Then only the markdown body after the frontmatter is counted
    And the frontmatter is excluded from the body token count

  @SS-003
  Scenario: Tier 1 catalog tokens count name and description only
    Given a SKILL.md with name "code-review" and description "Reviews code for quality and best practices"
    When I calculate the Tier 1 token count
    Then the token count should reflect the name and description text only
