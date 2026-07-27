# Design QA

## Comparison target

- Source visual truth: local ImageGen source (not committed)
- Normalized implementation comparison: `qa-evidence/home-864x1821.png`
- Desktop implementation evidence:
  - `qa-evidence/home-desktop-viewport.png`
  - `qa-evidence/projects-desktop.png`
  - `qa-evidence/project-detail-desktop.png`
  - `qa-evidence/posts-desktop.png`
  - `qa-evidence/post-detail-desktop-fixed.png`
  - `qa-evidence/about-desktop.png`
- Mobile implementation evidence:
  - `qa-evidence/home-mobile.png`
  - `qa-evidence/projects-mobile.png`
  - `qa-evidence/project-detail-mobile.png`
  - `qa-evidence/posts-mobile.png`
  - `qa-evidence/post-detail-mobile.png`
  - `qa-evidence/about-mobile.png`
- State: light theme, menu closed, page at scroll position 0 unless an interaction is named below.

## Viewport and normalization

- Source pixels: `864 × 1821`, PNG.
- Normalized implementation CSS viewport and screenshot: `864 × 1821`.
- Source and implementation density: `1x`; no downsampling or device-frame crop was required.
- The live home document is `864 × 2606` CSS pixels. The normalized capture therefore compares the same visible viewport and scale rather than claiming that the conceptual source board and live page have identical document height.
- Desktop checks used `1440 × 1000` where supported; the fresh final console pass used the browser default `1280px` viewport.
- Mobile checks used `390 × 844`, `1x`.

## Full-view comparison evidence

The source and normalized implementation were opened together in one comparison input. Both use the same core direction: warm off-white canvas, thin engineering rules, black condensed display type, monospaced labels, yellow active/action accents, a numbered left rail, real raster workbench imagery, project-first hierarchy, and squared controls without generic rounded-card treatment.

The implementation intentionally uses more vertical space than the concept board so the real project description and portfolio proof remain readable. This is treated as an expected content adaptation rather than an actionable mismatch because hierarchy, region order, palette, image direction, and component language remain consistent.

## Focused region comparison evidence

Focused evidence was required because the full-page source makes article text, project facts, and mobile states too small to judge:

1. Hero and CTA: `home-desktop-viewport.png` and `home-mobile.png` confirm heading hierarchy, yellow project CTA, outlined contact CTA, concise collaboration copy, and the workbench asset.
2. Project archive and case study: `projects-desktop.png`, `project-detail-desktop.png`, and their mobile counterparts confirm image crop, real/template labels, role/result facts, and stacked mobile behavior.
3. Writing archive and reader: `posts-desktop.png` and `post-detail-desktop-fixed.png` confirm a single scannable archive, readable metadata, table of contents, prose width, and related-reading structure.
4. About and contact: `about-desktop.png` and `about-mobile.png` confirm profile hierarchy, four capability cards, three experience entries, and the placeholder contact route.

## Required fidelity surfaces

- Fonts and typography: condensed display hierarchy, monospaced system labels, body line height, Chinese wrapping, and title scale are consistent with the source direction. The article hero conflict found in pass 2 was fixed.
- Spacing and layout rhythm: shared page shell, hairline borders, section padding, facts rows, archive rows, and contact bands align across all routes. No tested desktop or mobile route has horizontal overflow.
- Colors and visual tokens: `#f5f3ed` canvas, near-black text, gray rules, white content surfaces, and yellow active/action states are used consistently. No new gradients were introduced in the portfolio layer.
- Image quality and asset fidelity: all visible hero/project media use real raster assets. Images load at intrinsic quality with intentional crops; no CSS art, placeholder boxes, handcrafted SVGs, or emoji substitutes were introduced.
- Copy and content: the site now prioritizes hiring and project work, keeps writing as supporting proof, removes negative self-description, clearly marks two template cases, and labels `hello@example.com` as a placeholder.
- Responsiveness and accessibility: navigation, headings, labels, alt text, focusable links, mobile menu state, tap targets, table of contents, and reduced-width wrapping were checked. `390px` routes report `scrollWidth === viewportWidth`.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3 follow-up: replace the two clearly marked template cases with real delivery evidence as future projects become available.
- P3 follow-up: replace `hello@example.com` with the final email or preferred contact channel.

## Primary interactions tested

- Featured project card navigates from `/projects/` to `/projects/personal-blog/`.
- Mobile menu expands, exposes all primary routes, navigates to `/about/`, and closes after navigation.
- Real project source/demo links and project/contact mail links expose the expected destinations.
- All six primary route types render their expected H1, load all images, and show no horizontal overflow:
  `/`, `/projects/`, real project detail, template project detail, `/posts/`, article detail, and `/about/`.
- Fresh final browser console pass: no errors or warnings.

## Comparison history

### Pass 1 — homepage responsive composition

- Earlier finding: at the reference-width capture, the hero and featured project stacked earlier than the source visual (`P2`).
- Fix made: lowered the workbench two-column breakpoint so narrow desktop/tablet keeps the selected composition while mobile remains single-column.
- Post-fix evidence: `qa-evidence/home-864x1821.png` and `qa-evidence/home-mobile.png`.

### Pass 2 — inherited article hero grid

- Earlier finding: the redesigned article detail inherited the old `.detail-hero` two-column grid, squeezing the H1 into a narrow vertical block (`P1`).
- Fix made: the portfolio article hero now explicitly resets the legacy grid with `display: block !important` and `grid-template-columns: initial !important`.
- Post-fix evidence:
  - Before: `qa-evidence/post-detail-desktop.png`
  - After: `qa-evidence/post-detail-desktop-fixed.png`
  - Mobile: `qa-evidence/post-detail-mobile.png`
- Post-fix measurement: desktop title width increased from about `305px` to `1000px`; mobile title width is `354px` with no overflow.

### Pass 3 — final full-site verification

- Rechecked desktop and mobile project, article, detail, and about pages after the article fix.
- Added eager preload for the featured project cover to remove the earlier LCP warning.
- Fresh-tab evidence reports all images loaded and no browser console warnings or errors.

## Implementation checklist

- [x] Source visual and normalized implementation opened in one comparison input.
- [x] Desktop and mobile evidence captured for every primary route type.
- [x] Project, writing, about, contact, and mobile-menu interactions tested.
- [x] P1 article-title layout conflict fixed and re-captured.
- [x] No horizontal overflow at tested desktop and mobile widths.
- [x] Browser console errors and warnings checked on a fresh tab.
- [x] Lint, 240 unit tests, and production build passed.

final result: passed
