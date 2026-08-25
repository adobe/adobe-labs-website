# AI and agent documentation

Coding agents should start with [`AGENTS.md`](../AGENTS.md) at the repository root. It summarizes how to use this directory as the canonical source for skills.

This directory contains the skills coding agents use to enforce consistent formatting and structure in our codebase.

## Why `.ai/`

All skills live in **`.ai/`** — a tool-agnostic, plain-markdown directory that any agent or tool can read. IDE-specific directories (e.g. `.claude/`, `.cursor/`) become thin adapters that point back to `.ai/` via symlinks:

- Edit once in `.ai/` → all tools see the update automatically
- No sync step, no duplication, no drift between tools
- New contributors or tools start from `AGENTS.md` at the repo root, which bootstraps everything

## Skills

Skills are used on-demand. When a task matches a skill's purpose, the agent reads the skill file for workflows, patterns, and guidance. Skills live in the `skills` directory; each has a `SKILL.md` and may include references or scripts.

### Available skills

#### Create a new block

- **File**: [`.ai/skills/create-new-block/SKILL.md`](./skills/create-new-block/SKILL.md)
- **Purpose**: Scaffold and implement a new EDS block — covers file structure, the `decorate(block)` function contract, autoblocking, CSS conventions, and when to use per-page authoring vs fragments vs an autoblock.
- **How to invoke**: Ask to create or add a new block (e.g. "create a new block", "scaffold a block for X").

#### Writing block tests

- **File**: [`.ai/skills/write-block-tests/SKILL.md`](./skills/write-block-tests/SKILL.md)
- **Purpose**: Write Jest unit tests for blocks using jsdom fixtures and `decorate` assertions — co-locating `*.test.js` files, mocking `/scripts/` imports, and the project's block testing conventions.
- **How to invoke**: Ask when adding or updating a block's tests (e.g. "write tests for this block", "add a test for the cards block").

#### EDS performance & lifecycle review

- **File**: [`.ai/skills/eds-performance-review/SKILL.md`](./skills/eds-performance-review/SKILL.md)
- **Purpose**: Reviews a diff against the actual page-load lifecycle in `scripts.js`/`aem.js` (`loadEager`/`loadLazy`/`loadDelayed`) — flags fragile, duplicative, or unmeasured "performance" code added to the core loader instead of a block's own `decorate`. Walks the lifecycle step-by-step and gives a ruthless CLS/LCP test for anything proposed ahead of `loadSections`.
- **How to invoke**: Ask before opening a PR that touches `scripts.js` or `aem.js` (e.g. "review this against the performance skill", "does this belong in scripts.js"), or when auditing for CLS/LCP regressions or speculative optimizations.

#### Accessibility compliance

- **File**: [`.ai/skills/accessibility-compliance/SKILL.md`](./skills/accessibility-compliance/SKILL.md)
- **Purpose**: WCAG 2.2 AA guidance, ARIA patterns, and mobile/assistive-technology considerations for implementing accessible markup and interactions.
- **How to invoke**: Ask when auditing accessibility, implementing ARIA patterns, or reviewing a block/page for inclusive design.

#### Writing issues/tickets

- **File**: [`.ai/skills/write-issues-tickets/SKILL.md`](./skills/write-issues-tickets/SKILL.md)
- **Purpose**: Guidelines for drafting and formatting Jira tickets and/or GitHub issues — title format, severity classification, labels, issue types, and templates for general tickets and bugs.
- **How to invoke**: Ask to create or draft a Jira ticket or GitHub issue (e.g. "write a Jira ticket for this bug", "draft a new issue ticket").

#### GitHub pull request descriptions

- **File**: [`.ai/skills/write-pr-description/SKILL.md`](./skills/write-pr-description/SKILL.md)
- **Purpose**: Generates GitHub pull request titles and body following this project's conventions, including description structure, accessibility testing checklist, validation steps, and device review.
- **How to invoke**: Ask to create or draft a PR description (e.g. "write a PR description", "draft a pull request for this branch"). Requires a GitHub issue or Jira ticket number; the agent will prompt if not provided.

#### Writing documentation

- **File**: [`.ai/skills/write-documentation/SKILL.md`](./skills/write-documentation/SKILL.md)
- **Purpose**: Follow Adobe content writing standards when writing documentation — including Markdown formatting, voice and tone, and writing for external or internal audiences.
- **How to invoke**: Auto-triggers when editing `*.md` files, or ask explicitly (e.g. "write the docs for this block", "update the README").

## Specs and plans

Design specs and implementation plans live in [`.ai/docs/`](./docs/):

| What | Location | Filename |
| ---- | -------- | -------- |
| Design specs (brainstorming output) | [`.ai/docs/specs/`](./docs/specs/) | `YYYY-MM-DD-<topic>-design.md` |
| Implementation plans | [`.ai/docs/plans/`](./docs/plans/) | `YYYY-MM-DD-<feature-name>.md` |

The Superpowers plugin skills (`brainstorming`, `writing-plans`, `subagent-driven-development`, `executing-plans`, `requesting-code-review`) default to `docs/superpowers/specs/` and `docs/superpowers/plans/`. In this repository those paths are **overridden** by the convention above — write specs and plans to `.ai/docs/` instead, and do not create a `docs/superpowers/` directory. See [`AGENTS.md`](../AGENTS.md) for the instruction agents load at session start.

## Using skills across tools and IDEs

Canonical content lives in **`.ai/`** (this directory). Tool-specific directories are thin adapters that point back here via symlinks — edit files in `.ai/`, never in the adapter directories.

### Current symlink structure

```text
.ai/skills/
└── <skill-name>/SKILL.md         ← canonical, tool-agnostic source of truth

.claude/skills/ → ../.ai/skills/  (directory symlink; Claude Code reads it directly)
.cursor/skills/ → ../.ai/skills/  (directory symlink; Cursor reads it directly)
```

Editing any `.ai/skills/<skill-name>/SKILL.md` file immediately updates what both Claude Code and Cursor see — no sync step required. There is no `.ai/rules/` directory in this repository today; if that distinction gets introduced later, extend this section and `AGENTS.md` together.

### Adding a new skill

1. Create `.ai/skills/<skill-name>/SKILL.md`.
2. Register it in the skills catalog above and in [`AGENTS.md`](../AGENTS.md) if it should always be checked for a given task type.
3. `.claude/skills/` and `.cursor/skills/` pick it up automatically via their directory symlinks.

### Using skills in other environments

If you use a tool that does not read `.claude/` or `.cursor/`, point it at `.ai/` directly:

- **Start from [`AGENTS.md`](../AGENTS.md)** at the repository root.
- **Reference files when prompting** — for example: "Load `.ai/skills/<skill-name>/SKILL.md` for this task."
- **Copy or adapt** the markdown content into your tool's own config format as needed.
