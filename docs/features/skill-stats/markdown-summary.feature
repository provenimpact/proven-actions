@skill-stats
Feature: Markdown Summary Output
  As a CI/CD pipeline operator,
  I want the action to produce a markdown summary of skill statistics,
  so that I can review the analysis results directly in the GitHub Actions job summary.

  @SS-012
  Scenario: Generate markdown summary for a single skill
    Given a skill "code-review" has been analyzed with:
      | metric         | value   |
      | tier1_tokens   | 85      |
      | tier2_tokens   | 2400    |
      | tier3_tokens   | 1100    |
      | min_tokens     | 2400    |
      | max_tokens     | 3500    |
      | rating         | moderate|
      | file_count     | 4       |
    When I generate the markdown summary
    Then the summary should contain a table with all metric values
    And the summary should display the context budget rating

  @SS-013
  Scenario: Generate markdown summary for multiple skills
    Given multiple skills have been analyzed
    When I generate the markdown summary
    Then the summary should contain a row for each skill
    And the summary should include a totals row

  @SS-012
  Scenario: Markdown summary includes file inventory
    Given a skill has been analyzed with resource files
    When I generate the markdown summary
    Then the summary should list each file with its token count
    And files should be grouped by directory (scripts, references, assets)
