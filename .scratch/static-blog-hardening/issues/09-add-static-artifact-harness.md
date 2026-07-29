# Test the generated static artifact

Status: ready-for-agent
Blocked by: 08

## Goal

Build, serve, and verify the actual `out/` artifact under a representative GitHub Pages project path before upload.

## Scope

- Build with an HTTPS origin and non-empty `/blog` base path.
- Serve the generated files with static-host behavior suitable for trailing-slash routes and `404.html`.
- Point Playwright at the static server rather than `next dev` for release tests.
- Verify generated assets, metadata, RSS, sitemap, and 404 files before deployment.
- Add a documented and pinned preview command.

## Dependency Approval

If a new static-server package is required, stop and request explicit user approval before changing `package.json` or the lockfile. Do not rely on an unpinned `npx` download.

## Acceptance Criteria

- The release harness never starts `next dev`.
- Tests access pages through `/blog`.
- Broken unprefixed assets or links cause failure.
- The exact tested `out/` directory is the directory uploaded for deployment.

## Verification

- Run the production build and static artifact suite.
- Inspect generated `404.html`, feed, sitemap, and representative canonical tags.
- Confirm the worktree contains only intended source, snapshot, and lockfile changes.
