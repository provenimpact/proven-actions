@skill-stats
Feature: Skill Metadata Validation
  As a skill author,
  I want the action to validate my SKILL.md frontmatter against the Agent Skills specification,
  so that I can catch formatting errors before publishing.

  @SS-006
  Scenario: Valid skill with all required fields
    Given a SKILL.md with valid frontmatter:
      | field       | value                                         |
      | name        | code-review                                   |
      | description | Reviews code for quality and best practices   |
    When I validate the skill metadata
    Then validation should pass with no errors

  @SS-006
  Scenario: Valid skill with optional fields
    Given a SKILL.md with valid frontmatter including optional fields:
      | field         | value                    |
      | name          | code-review              |
      | description   | Reviews code             |
      | license       | MIT                      |
      | compatibility | Requires git and docker  |
    When I validate the skill metadata
    Then validation should pass with no errors

  @SS-007
  Scenario: Missing required name field
    Given a SKILL.md with frontmatter missing the "name" field
    When I validate the skill metadata
    Then validation should report an error for the missing "name" field

  @SS-007
  Scenario: Missing required description field
    Given a SKILL.md with frontmatter missing the "description" field
    When I validate the skill metadata
    Then validation should report an error for the missing "description" field

  @SS-008
  Scenario: Name does not match directory name
    Given a skill in directory "code-review" with SKILL.md name "pdf-processing"
    When I validate the skill metadata
    Then validation should report a warning that name does not match directory name

  @SS-008
  Scenario: Name contains uppercase characters
    Given a SKILL.md with name "Code-Review"
    When I validate the skill metadata
    Then validation should report a warning about uppercase characters in the name

  @SS-008
  Scenario: Name exceeds maximum length
    Given a SKILL.md with a name longer than 64 characters
    When I validate the skill metadata
    Then validation should report a warning about name length

  @SS-008
  Scenario: Name contains consecutive hyphens
    Given a SKILL.md with name "code--review"
    When I validate the skill metadata
    Then validation should report a warning about consecutive hyphens

  @SS-007
  Scenario: Missing or unparseable YAML frontmatter
    Given a SKILL.md file with no YAML frontmatter delimiters
    When I validate the skill metadata
    Then validation should report an error that frontmatter is missing
