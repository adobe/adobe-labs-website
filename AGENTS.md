# AGENTS.md

Edge Delivery Services. Read a block first. Omissions are in the repo or known.

Coding agents working in this repository should treat **`.ai/`** as the canonical location for project AI rules, skills, and related configuration. This file is a **bootstrap**: read it first, then follow the detailed catalog and paths below.

## First steps

1. **Read** [`.ai/README.md`](./.ai/README.md) for the full list of rules, skills, when they apply, and how to invoke skills.
2. **Load** a skill when the task matches its purpose: each skill lives under `.ai/skills/<skill-name>/SKILL.md`.

## Avoid
- `scripts/aem.js` is vendored. Never edit.
- Markup comes from the backend. `curl localhost:3000/x.plain.html` first.
- `buildAutoBlocks` rewrites content before your block runs.
- Authors omit and add cells. Decorate defensively.
- No build step; devDependencies only.
- Scope CSS to `.blockname`; `-wrapper`/`-container` are section classes.
- `fragment/fragment.js` is the only cross-block import. Otherwise use `/scripts/`.

## Outdated
- `fstab.yaml`, `helix-query.yaml`, `paths.json` are retired. Config lives at tools.aem.live.

## Remember
- `npx -y @adobe/aem-cli up`: local code, previewed content.
- Merging `main` ships code; content publishes separately.
- A PR without a `{branch}--{repo}--{owner}.aem.page/{path}` link is rejected.
- All committed files are served. Use `.hlxignore`.
- Skills: `/plugin marketplace add adobe/skills`, then `aem-edge-delivery-services` (24 skills, incl. `docs-search`).

## Where things live

| What                         | Location                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Skill catalog and usage      | [`.ai/README.md`](./.ai/README.md)                                                                 |
| Task workflows (skills)      | [`.ai/skills/`](./.ai/skills/) — each skill is typically `SKILL.md` in a subfolder                 |
| Design specs                 | [`.ai/docs/specs/`](./.ai/docs/specs/) — `YYYY-MM-DD-<topic>-design.md`                            |
| Implementation plans         | [`.ai/docs/plans/`](./.ai/docs/plans/) — `YYYY-MM-DD-<feature-name>.md`                            |

Everything in `.ai/` today is a **skill** — an on-demand playbook loaded when a task matches its
description (documentation shape, PR descriptions, ticket formatting, block scaffolding, and
similar). There is no separate `.ai/rules/` split in this repo; if that distinction gets introduced
later, update this file and `.ai/README.md` together.

## Specs and plans

Design specs and implementation plans live under **`.ai/docs/`**, alongside the rest of the project's agent documentation:

- **Specs** (brainstorming output, design docs): `.ai/docs/specs/YYYY-MM-DD-<topic>-design.md`
- **Plans** (implementation plans): `.ai/docs/plans/YYYY-MM-DD-<feature-name>.md`

This **overrides** the default paths used by the Superpowers plugin skills (`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and `superpowers:requesting-code-review`), which write to `docs/superpowers/specs/` and `docs/superpowers/plans/`. When any of those skills instruct you to save to `docs/superpowers/…`, save to the matching `.ai/docs/…` path instead. Do not create a `docs/superpowers/` directory in this repository.

## Skill index

When a task matches one of the following, read and apply the corresponding skill before responding:

| Task | Skill file |
| ---- | --------- |
| Writing or editing `.md` files | [`.ai/skills/write-documentation/SKILL.md`](./.ai/skills/write-documentation/SKILL.md) |
| Drafting a PR description | [`.ai/skills/write-pr-description/SKILL.md`](./.ai/skills/write-pr-description/SKILL.md) |
| Drafting a Jira ticket or GitHub issue | [`.ai/skills/write-issues-tickets/SKILL.md`](./.ai/skills/write-issues-tickets/SKILL.md) |

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those locations are thin adapters that symlink back to `.ai/`. **`.ai/` remains the portable source of truth** for skills documented here. If instructions conflict, prefer **`.ai/README.md`** and the files under **`.ai/skills/`**.
