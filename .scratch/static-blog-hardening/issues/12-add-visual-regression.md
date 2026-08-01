# Add focused visual regression

Status: resolved

## Goal

Catch major layout and styling regressions without turning every page into a brittle snapshot.

## Scope

- Add Chromium/Linux baselines for stable desktop and mobile views.
- Cover home, post detail, real project detail, and open mobile navigation.
- Stabilize fonts, animation, viewport, color scheme, and content fixture inputs.
- Keep snapshot count intentionally small.
- Document the review process for intentional baseline changes.

## Acceptance Criteria

- Snapshots fail on meaningful layout drift.
- Dynamic or irrelevant pixels are stabilized or narrowly masked.
- Intentional updates require an explicit baseline change visible in review.
- WebKit remains smoke-only and does not duplicate the visual matrix.

## Verification

- Run snapshot comparison twice to check determinism.
- Review generated diffs at desktop and mobile sizes.
- Run the complete Chromium artifact suite.

## Comments

### Implementation and baseline review

Added the isolated `chromium-visual` static project and four strict viewport
assertions for the home page, stable post, real Project Case, and open mobile
navigation. The visual project waits for network idle, fonts, and image decode;
it fixes locale, timezone, color scheme, reduced motion, viewport, and device
scale, and writes failures under `test-results/static-artifact/chromium-visual/`.
The mobile navigation height was corrected so its contact action is not clipped.

The host reports `Darwin`, so no Darwin baseline was generated or accepted.

## Answer

Added the focused `chromium-visual` static Playwright project and four strict
viewport assertions. The project owns only the home desktop view, the stable
post `/posts/2026-04-30/`, the real project `/projects/personal-blog/`, and the
home mobile view with its navigation open. It is excluded from the ordinary
Chromium, accessibility, WebKit, and development projects; WebKit remains
limited to its three smoke tests. Static failures are written under
`test-results/static-artifact/chromium-visual/`, and the deployment workflow
uploads the parent static artifact directory.

The assertions fix viewport dimensions, device scale, light color scheme,
reduced motion, locale, timezone, font readiness, image decoding, scroll
position, focus, hover, animation, and caret state. They use viewport-only
screenshots with exact pixel comparison and no masks or tolerance. The mobile
navigation height was corrected after review so the contact action is not
clipped.

Canonical baselines were generated on Linux/x86_64 with
`mcr.microsoft.com/playwright:v1.59.1-noble` (Playwright 1.59.1, amd64 image
digest
`sha256:eac9b0a5312cdab40ee8c2429df5bf19bffdccf8f3bf3c42268e173f97541645`).
The earlier ARM rendering was discarded. Exactly four PNGs are present under
`e2e/visual-regression.spec.ts-snapshots/`, each with the
`chromium-visual-linux` suffix. Visual review confirmed loaded fonts and
images, complete desktop content, an open and uncropped mobile menu, and no
unexpected overlap. Two consecutive strict amd64 Linux comparison runs passed
all four tests after the representative production build; no diff artifacts
were produced.

Verified with the representative `/blog` build, `CI=1 pnpm test:e2e:static`
(39 passed and the four visual tests explicitly skipped on Darwin), lint,
non-incremental TypeScript, format check, and `git diff --check`. The Linux
container's complete direct run reached 42 passed; its only failure was the
pre-existing fixture-independence test attempting to spawn `pnpm`, which is
absent from the official browser image. The visual project itself passed in
that same Linux environment, and the deployment runner installs pnpm before
running the full gate.
