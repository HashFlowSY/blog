# Add focused visual regression

Status: ready-for-agent
Blocked by: 10, 11

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
