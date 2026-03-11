import { Given, When, Then } from "@cucumber/cucumber";

Given("a directory containing a SKILL.md file at the root", async function () {
  // TODO: implement during needs-implementation
});

Given("a directory containing subdirectories:", async function (dataTable) {
  // TODO: implement during needs-implementation
});

Given("a parent directory containing subdirectories where some lack a SKILL.md file", async function () {
  // TODO: implement during needs-implementation
});

Given("a directory that contains no SKILL.md file at any level", async function () {
  // TODO: implement during needs-implementation
});

When("I run skill-stats with that directory as input", async function () {
  // TODO: implement during needs-implementation
});

When("I run skill-stats with that parent directory as input", async function () {
  // TODO: implement during needs-implementation
});

Then("it should analyze exactly one skill", async function () {
  // TODO: implement during needs-implementation
});

Then("the results should contain stats for that skill", async function () {
  // TODO: implement during needs-implementation
});

Then("it should discover and analyze {int} skills", async function (count: number) {
  // TODO: implement during needs-implementation
});

Then("the results should contain stats for {string}, {string}, and {string}", async function (s1: string, s2: string, s3: string) {
  // TODO: implement during needs-implementation
});

Then("subdirectories without SKILL.md should be silently skipped", async function () {
  // TODO: implement during needs-implementation
});

Then("the action should report an error indicating no skills were found", async function () {
  // TODO: implement during needs-implementation
});
