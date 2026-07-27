---
name: show-me
description: Build the current branch, launch a fresh live Foundry world, open a headed Playwright MCP browser on that world, and drive Foundry to the changed system feature so the dev can see it live.
---

# Show me

Use this skill when the dev wants a live demo of the current branch in Foundry.

The goal is to show the **system change itself** in a visible Foundry session.
Do **not** spend time showing tests or Playwright plumbing.

Use the repo's existing Playwright helper modules for setup and repeated
interaction patterns. Their purpose is to save tokens and stop the LLM from
re-inventing the same Foundry-driving process over and over.

## Source of truth

Use these inputs in this order:

1. **Current conversation / task context** — if the dev already told you what
   changed, trust that and go straight there.
2. **Showable changes under `src/` on the branch** — use only as a fallback when
   the conversation is unclear.
3. **Ready-world fallback** — if nothing showable is clear, still launch a fresh
   world and leave it ready for the dev.

## What to ignore for feature inference

These are **not** the thing being demonstrated:

- `tests/**`
- `tools/playwright/**`
- `.mcp.json`
- `shell.nix`
- `package.json` / `package-lock.json`
- docs, schemas, and other tooling-only files

Those files can help you understand **how to drive Playwright**, but they are
not evidence of what feature to show.

## Branch reading

Unless the dev names another ref explicitly, compare the current branch against
`origin/dev`:

```bash
git diff --name-only origin/dev...HEAD
```

Only treat **showable** `src/**` changes as feature hints.

Typical examples:

- `src/modules/item/**`, `src/templates/item/**`, `src/css/**` around item
  sheets -> show an item sheet, and the specific tab/section implied by the work
- `src/modules/actor/**`, `src/templates/actor/**` -> show an actor sheet
- `src/modules/apps/**`, matching templates/styles -> show that application
- roll/chat/runtime behavior under `src/modules/**` -> show the relevant user
  interaction or chat result
- migrations / datamodel changes -> only show them if they result in something
  visible or interactive in Foundry

## World policy

- Default to a **fresh ephemeral** world.
- Do not touch a real saved world unless the dev explicitly asks.
- It is fine to create throwaway demo actors/items in the fresh world.
- Leave Foundry and the browser running by default when you are done.

## Launch flow

Use the new Playwright harness entrypoint, not the old browser/foundry-server
paths.

Start the live server from the repo root:

```bash
npm run playwright:serve
```

This command builds the branch, launches a fresh ephemeral CPR world, and keeps
Foundry running in the foreground. If you need to keep working in the same turn,
run it in the background with the shell tool and capture its log so you can read
back the URL.

Wait until the log shows both lines:

- `Foundry is up at ...`
- `Game URL: ...`

## Browser policy

After the world is up, connect the Playwright MCP and use its **headed** browser
as the shared live surface.

Use the MCP browser to:

1. open the live Foundry URL
2. join the fresh world as `Gamemaster`
3. dismiss tours / overlays if needed
4. unpause the world if needed
5. drive to the changed feature surface

For the fresh world flow, a blank-password GM join is acceptable. If `/game`
lands on the join screen, join there and continue.

## Driving policy

Show the **feature surface**, not the scaffolding.

Good examples:

- item-field work -> open a representative item sheet and the relevant tab,
  usually `Settings` when that is where the changed field lives
- actor-sheet work -> open a representative actor sheet
- document browser work -> launch the document browser and exercise the changed
  visible behavior
- roll behavior work -> perform the roll flow that exposes the changed behavior
- settings-menu work -> open the relevant Foundry settings UI

If the current conversation already names the surface, skip inference and go
straight there.

If the feature is unclear but you still have plausible options, launch the world
and present a short shortlist of likely surfaces instead of guessing wildly.

If you are unclear on the changes, just launch the world and make sure it is
ready for the dev.

## Helper rule

Use the repo's existing Playwright helper modules as your first choice for demo
setup and repeated Foundry-driving steps. Do not burn tokens inventing fresh
setup flows that the repo already has.

Start here, in this order:

1. Read only the helper family you need under `tools/playwright/ui/`,
   `tools/playwright/session/`, and `tools/playwright/setup/`.
2. Reuse those established flows before writing any fresh browser-driving logic.
3. Only inspect more helper modules if the current demo actually needs them.

That means:

- do not grep broadly through tests to rediscover common setup patterns
- prefer the existing helper modules and their established flows
- reuse them for creating documents, opening sheets, switching tabs,
  navigating sidebars, and other repetitive setup actions
- keep the final demo focused on a real user-visible Foundry surface, not on the
  helper itself

For repeated browser-driving steps, it is fine to use MCP code snippets or
automation that operate the same visible headed browser the dev sees.

The final thing you show should be a real user-visible Foundry surface.

## Existing harness patterns

When you need a driving pattern, prefer the repo's current Playwright harness
and helper conventions:

- fresh live world: `npm run playwright:serve`
- browser control: Playwright MCP
- shared helper families: `tools/playwright/ui/`, `tools/playwright/session/`,
  and `tools/playwright/setup/`
- setup and interaction patterns: reuse existing Playwright helper modules
  rather than inventing new ones

Use those as implementation patterns only. Do not treat them as the feature
being demoed.

## End state

Finish with:

- the world running
- the headed browser left open
- the changed feature surface visible, or the world clearly ready if no surface
  was safely identifiable
- a short note telling the dev what is currently on screen and any throwaway
  demo documents you created
