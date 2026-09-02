# AGENTS.md

Edge Delivery Services. Read a block first. Omissions are in the repo or known.

Coding agents working in this repository should treat **[`.ai/`](./.ai/README.md)** as the canonical location for project AI skills and related configuration. Read [`.ai/README.md`](./.ai/README.md) for the full skill catalog, how to invoke them, and the specs/plans conventions — skills load on demand from `.ai/skills/<skill-name>/SKILL.md` when a task matches their purpose.

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

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those locations are thin adapters that symlink back to `.ai/`. **`.ai/` remains the portable source of truth**. If instructions conflict, prefer **[`.ai/README.md`](./.ai/README.md)** and the files under **`.ai/skills/`**.
