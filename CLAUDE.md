# LLM Configuration

This file provides guidance for AI assistants working on this codebase.

- **Base branch is `dev`**: When comparing against remote, creating PRs, or referencing the base branch, always use `dev` — never `main`.
- **Raising bugs/issues**: when you (an LLM agent) file an issue, label it with the existing **`Bug::LLM Discovered`** label. Do not create new label variants (e.g. a bare `LLM Discovered`) — use the scoped label that already exists.
- **Opening merge requests**: open them as **Draft**, with **no labels**. Wait for the pipeline to finish, and only then add the **`Review::Ready for Review`** label. Do **not** remove the Draft status — leave that for a human.
- **Commits**: structure a branch's commits as clean, logical units that make review easier — group related changes together regardless of the order they were actually developed in. Do **not** mirror the development process ("how the sausage was made") with fix-up, step-by-step, or "regenerate X" follow-up commits. The reviewer should see the final logical shape of the change, not the path taken to get there.
**Before writing or changing any code, read [`STYLE_GUIDE.md`](STYLE_GUIDE.md).** It documents the conventions and patterns for this system — directory layout, ApplicationV2 sheets/apps, documents and data models, JavaScript patterns, styling (including CI-enforced template rules), hooks, localization, and `fallow` static analysis. Follow it, and keep it updated when conventions change.
