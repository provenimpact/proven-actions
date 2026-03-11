@skill-stats
Feature: GitHub Action Interface
  As a CI/CD pipeline operator,
  I want to configure the skill-stats action via standard GitHub Actions inputs and outputs,
  so that I can integrate it into my workflows.

  @SS-014
  Scenario: Action accepts a path input
    Given a GitHub Actions workflow with the skill-stats action
    When the "path" input is set to ".agents/skills/code-review"
    Then the action should analyze the skill at that path

  @SS-014
  Scenario: Action uses default path when not specified
    Given a GitHub Actions workflow with the skill-stats action
    When no "path" input is specified
    Then the action should default to scanning the current working directory

  @SS-015
  Scenario: Action sets output parameters
    Given the action has analyzed a skill
    When the action completes
    Then the following outputs should be set:
      | output         | description                              |
      | stats_json     | JSON string with complete analysis data  |
      | min_tokens     | Minimum token count (SKILL.md only)      |
      | max_tokens     | Maximum token count (all files)          |
      | rating         | Context budget rating                    |
      | badge_json     | Shields.io badge JSON string             |

  @SS-016
  Scenario: Action writes job summary
    Given the action has analyzed skills
    When the action completes
    Then a GitHub Actions job summary should be written
    And the summary should contain the markdown analysis report

  @SS-014
  Scenario: Action accepts badge-output-dir input
    Given a GitHub Actions workflow with the skill-stats action
    When the "badge-output-dir" input is set to "./badges"
    Then badge JSON files should be written to the "./badges" directory
