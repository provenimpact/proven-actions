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
