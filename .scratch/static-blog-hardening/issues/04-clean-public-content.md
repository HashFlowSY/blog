# Remove public template cases and placeholder content

Status: ready-for-agent
Blocked by: 03

## Goal

Make the checked-in content comply with the accepted public boundary before the Content Catalog makes validation atomic.

## Scope

- Consolidate the two fictional project cases into one neutral authoring template outside scanned content directories.
- Remove the two fictional public project Markdown files.
- Remove template-specific project statistics, labels, notices, and branches.
- Update the remaining real project and posts to satisfy explicit field contracts.
- Remove email CTAs and placeholder replacement text.
- Keep only the centralized GitHub contact.

## Acceptance Criteria

- Only real project cases are discoverable under public project content.
- The authoring template contains prompts or placeholders, not invented outcomes presented as facts.
- No production UI contains a public template branch.
- All current published content satisfies the strict contract.

## Verification

- Run content contract tests.
- Search for the removed template titles, `template`, placeholder result strings, placeholder email, and replacement notes.
- Run affected component and route tests.
