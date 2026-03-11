@skill-stats
Feature: Local CLI
  As a skill author,
  I want to run skill-stats locally from the command line without GitHub Actions,
  so that I can analyze skills during development and get immediate feedback.

  @SS-017
  Scenario: Analyze a skill directory via CLI
    Given a skill directory exists at "/path/to/my-skill"
    When I run "npm run analyze -- /path/to/my-skill"
    Then the CLI should print a markdown summary to stdout
    And the exit code should be 0

  @SS-020
  Scenario: Analyze a parent directory of skills via CLI
    Given a parent directory exists with multiple skill subdirectories
    When I run "npm run analyze -- /path/to/skills"
    Then the CLI should discover and report on all skills
    And the output should include a per-skill summary line for each skill

  @SS-018
  Scenario: Generate badge files via CLI
    Given a skill directory exists at "/path/to/my-skill"
    When I run "npm run analyze -- /path/to/my-skill --badges ./badges"
    Then badge JSON files should be written to the "./badges" directory
    And the CLI should confirm where the badges were written

  @SS-019
  Scenario: CLI reports error for nonexistent path
    Given no directory exists at "/nonexistent/path"
    When I run "npm run analyze -- /nonexistent/path"
    Then the CLI should print an error message
    And the exit code should be non-zero

  @SS-022
  Scenario: CLI reports error when no skills found
    Given a directory exists but contains no SKILL.md files
    When I run "npm run analyze -- /path/to/empty"
    Then the CLI should print an error indicating no skills were found
    And the exit code should be non-zero

  @SS-021
  Scenario: CLI defaults to .opencode/skills when no path given
    Given the current directory contains ".opencode/skills" with skills
    When I run "npm run analyze" with no arguments
    Then the CLI should analyze skills in ".opencode/skills"
