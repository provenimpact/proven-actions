@skill-stats
Feature: Context Budget Rating
  As a skill consumer,
  I want to see a human-readable rating of how much context a skill uses,
  so that I can quickly assess whether a skill fits within my context budget.

  @SS-009
  Scenario Outline: Classify skill by maximum token count
    Given a skill with a maximum token count of <max_tokens>
    When I calculate the context budget rating
    Then the rating should be "<rating>"
    And the badge color should be "<color>"

    Examples:
      | max_tokens | rating       | color       |
      | 500        | lightweight  | brightgreen |
      | 999        | lightweight  | brightgreen |
      | 1000       | moderate     | yellow      |
      | 3500       | moderate     | yellow      |
      | 4999       | moderate     | yellow      |
      | 5000       | heavy        | orange      |
      | 12000      | heavy        | orange      |
      | 19999      | heavy        | orange      |
      | 20000      | very heavy   | red         |
      | 50000      | very heavy   | red         |
