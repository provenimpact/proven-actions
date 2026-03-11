@skill-stats
Feature: Skill Directory Discovery
  As a CI/CD pipeline operator,
  I want the action to auto-detect whether a path contains a single skill or multiple skills,
  so that I can point it at any skills directory without manual configuration.

  @SS-004
  Scenario: Analyze a single skill directory
    Given a directory containing a SKILL.md file at the root
    When I run skill-stats with that directory as input
    Then it should analyze exactly one skill
    And the results should contain stats for that skill

  @SS-005
  Scenario: Analyze a parent directory containing multiple skills
    Given a directory containing subdirectories:
      | subdirectory      | has_skill_md |
      | code-review       | true         |
      | pdf-processing    | true         |
      | data-analysis     | true         |
      | README.md         | false        |
    When I run skill-stats with that parent directory as input
    Then it should discover and analyze 3 skills
    And the results should contain stats for "code-review", "pdf-processing", and "data-analysis"

  @SS-005
  Scenario: Skip subdirectories without SKILL.md
    Given a parent directory containing subdirectories where some lack a SKILL.md file
    When I run skill-stats with that parent directory as input
    Then subdirectories without SKILL.md should be silently skipped

  @SS-004
  Scenario: Fail gracefully when path contains no skills
    Given a directory that contains no SKILL.md file at any level
    When I run skill-stats with that directory as input
    Then the action should report an error indicating no skills were found
