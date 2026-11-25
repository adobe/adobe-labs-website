---
name: write-issues-tickets
description: Guidelines for drafting and formatting Jira tickets and GitHub issues
---

# Writing tickets/issues guidelines

When prompted to create a Jira ticket, output the following:

- Title
- Severity
- Description

Output results in the chat window in a way that can be copied and pasted into Jira.

## Markdown formatting rules

Write Jira tickets in Markdown, not Jira wiki markup (`h2.`, `{{code}}`, `[text|url]`). The Jira editor converts pasted Markdown.

- `##` through `######` - Headings (use `##` for main, `###` for secondary, etc. - avoid `#` in descriptions)
- `**text**` - Bold text (see **Bold usage** below; do not pepper bold across the description)
- `` `code` `` - Inline code
- ` ```language ` fenced blocks - Language-specific code blocks, as in ` ```js ` for JavaScript and TypeScript code blocks
- `[text](url)` - Links
- `-` - Bullet points
- `1.` - Numbered list items

### Bold usage

- Default to **no** bold in Overview, Technical notes, Open questions, QA, Source, and other sections. Keep those sections plain text (plus inline code and links as needed).
- In the **Acceptance criteria** section **only**, use `**text**` to bold the three BDD keywords **Given**, **When**, and **Then** at the start of each clause. Do not bold the rest of the sentence, random nouns, or every other word.
- Use consistent casing in the written criteria (e.g. sentence case after each keyword; match your team’s style). Only wrap the three keywords: `**Given**`, `**When**`, `**Then**`.
- **Bad:** `**Given** **light** **mode** **and** **dark** **mode**, **when** a **page** **loads**...` (over-bold)
- **Good:** `**Given** light and dark site themes are available, **when** a page loads in each theme, **then** background gradients match the spec without harsh banding.`

## Title format

- Use the format: `[Component] Brief description of change or issue`
- Keep titles concise but descriptive (under 80 characters)
- Use present tense for the description (e.g., "Add" not "Added")

## Description structure

- Present title, labels, and severity before description content
- Include links to GitHub pull requests or RFCs when applicable (prompt if not provided)
- All tickets must include acceptance criteria
- Provide enough context so anyone can understand the objective
- Use prefixes in titles: [Bug], [Fix], [Docs], [Refactor], [Spike], [Test]

Examples:

- [Bug(component)]:
- [bug]:
- [Fix(component)]:
- [fix]:
- [Docs(component)]:
- [docs]:
- [Documentation]:
- [Refactor(component)]:
- [Spike(component)]:
- [discovery]:
- [Test(component)]:

## More specific templates

### General issue/ticket template

```markdown
## Overview
(plain language explaining the ticket)

## Acceptance criteria
(how we ensure that the work is complete)

## Technical notes/resources
(any technical notes/links/etc)

## QA
(steps someone will use to be sure that the work fulfills the ticket's request and that everything's working properly)

## Design specs
(are there any design specs/files/mock-ups we can include here? Any other design notes?)
```

### Bug reporting template

```markdown
**Link to original issue:** (Add a link to the original issue if applicable)

## Expected behavior
(Description of what the user would expect to happen)

## Actual behavior
(The actual behavior observed by the user)

## Screenshots
(Screenshots of the problem if applicable)

## How can we reproduce the issue?

1. Go to '...'
2. Click on '....'
3. Scroll to '....'
4. Check console
5. See error
<!-- add more reproduction steps if applicable-->

## Sample code or abstract reproduction which illustrates the problem
(are there any design specs/files/mock-ups we can include here? Any other design notes?)

## Severity
(The severity of the issue according to the classification below)
```

## Severity classification

- SEV1: Critical - System down, data loss, security breach
- SEV2: High - Major feature broken, significant user impact
- SEV3: Medium - Feature partially broken, moderate impact
- SEV4: Low - Minor issues, minimal user impact
- SEV5: Trivial - Cosmetic issues, no functional impact

## Best practices

- Link to relevant GitHub issues or pull requests using the format: `GH-{number}`
- Include the block name in brackets if applicable: `[cards]`, `[header]`
- Add relevant labels for easier filtering
- Attach screenshots or videos for visual changes
- Reference design specs or documentation when available

## Agent criteria for writing tickets/issues

- Write the overviews in plain language as user stories (i.e. "As a user, I want to...")
- Write acceptance criteria in "Given/When/Then" format, and bold **only** those three keywords in each criterion (see **Bold usage** under Markdown formatting rules).
- Make acceptance criteria specific and testable
- Include edge cases and error scenarios
- Document accessibility requirements and testing steps

<!-- TODO: define any labels -->
<!-- ## Labels -->

## Issue type

Jira includes the following issue types:

- Bug: For something in the code that needs to be fixed.
- Epic: For tickets that are larger than 8 story points and need to be broken up into multiple issues.
- Story: For tickets that tie to code deliverables. Whether that's research, an RFC, or a pull request, it counts! If you don't know what your issue type should be, this is a safe bet.
- Task: For work that doesn't relate to a code deliverable.
