# Repository collaboration rules

## Branches (user preference, 2026-09-28)

- Do not create a new branch for each task. Reuse the existing release/development branches.
- Todosobrealltech: `develop` for integration; `main` for stable; retain existing `alpha`, `beta`, `rc` channels.
- Moonbot: `dev` for integration; `master` for stable; retain `prealfa`, `alfa`, `alpha`, `beta`, `rc`. `alfa` and `alpha` are divergent, not aliases.
- Before integrating, fetch and inspect remote changes. Resolve divergence without force-pushing or discarding others' work.
- Do not delete branches with unintegrated work. Check patch equivalence, pull requests and attached worktrees before retiring completed technical branches.
- A deployed patch does not certify an entire branch as stable. Promote scoped, verified changes with appropriate checks.
- Current inventory and pending consolidation: `docs/BRANCH_MAINTENANCE.md` and `docs/BRANCH_STATUS_20260928.json`.
