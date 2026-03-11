@skill-stats
Feature: Badge JSON Generation
  As a skill author,
  I want the action to generate Shields.io badge JSON files,
  so that I can display token cost badges in my repository README.

  @SS-010
  Scenario: Generate badge JSON for a single skill
    Given a skill "code-review" with a maximum token count of 3500
    When I generate badge output
    Then a JSON file should be produced with:
      | field         | value                    |
      | schemaVersion | 1                        |
      | label         | skill tokens             |
      | message       | 3.5k (moderate)          |
      | color         | yellow                   |

  @SS-010
  Scenario: Badge message formats large token counts
    Given a skill with a maximum token count of 15200
    When I generate badge output
    Then the badge message should display "15.2k (heavy)"

  @SS-010
  Scenario: Badge message formats small token counts
    Given a skill with a maximum token count of 750
    When I generate badge output
    Then the badge message should display "750 (lightweight)"

  @SS-011
  Scenario: Generate badge JSON files for multiple skills
    Given a parent directory containing skills "auth", "billing", and "notifications"
    When I generate badge output
    Then a separate badge JSON file should be produced for each skill
    And each file should be named "<skill-name>-badge.json"

  @SS-023
  Scenario: Badge JSON is published to a GitHub Gist
    Given the skill-stats workflow has generated badge JSON files
    When the workflow runs on a push to the main branch
    Then each badge JSON file should be published to a GitHub Gist
    And the gist should be updated via the GitHub Gists API
    And no badge files should be committed to the repository

  @SS-023
  Scenario: Badge data is not published on pull requests
    Given the skill-stats workflow has generated badge JSON files
    When the workflow runs on a pull request
    Then no badge data should be published to a gist

  @SS-024
  Scenario: Badge files are excluded from the repository
    Given the repository has a .gitignore file
    Then the badges directory should be listed in .gitignore
    And no badge JSON files should exist in the committed source tree

  @SS-024
  Scenario: README badges reference the gist URL
    Given badge JSON files are published to a GitHub Gist
    Then README badge URLs should use the Shields.io endpoint format
    And the endpoint URL should point to gist raw content
    And the badge URL pattern should be "https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/{user}/{gist-id}/raw/{filename}"
