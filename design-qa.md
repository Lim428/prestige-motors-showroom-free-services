# Prestige Motors design QA

## Visual truth and capture state

- Selected source visual: `C:\Users\user\.codex\generated_images\019fa790-5eaa-7550-9582-51b2564aac35\exec-ee805e18-22dc-496e-95a5-4fe9ea43ab29.png`
- Source pixels: 1487 × 1058.
- Final implementation capture: `C:\Users\user\.codex\visualizations\2026\07\28\019fa790-5eaa-7550-9582-51b2564aac35\prestige-motors-design-qa\implementation-desktop-1440x1024-final.png`
- Implementation capture pixels: 1425 × 1013 from a 1440 × 1024 CSS viewport at DPR 1. The small pixel difference is the browser capture area and scrollbar.
- Compared state: public home page, development-only showroom preview catalog, desktop navigation, filters closed, assistant closed.
- Normalization: source and implementation were both resized to 1440 × 1024 before comparison.
- Same-input comparison: `C:\Users\user\.codex\visualizations\2026\07\28\019fa790-5eaa-7550-9582-51b2564aac35\prestige-motors-design-qa\comparison-final-source-left-implementation-right.png` (source left, implementation right, 2880 × 1024).
- Mobile menu evidence: `C:\Users\user\.codex\visualizations\2026\07\28\019fa790-5eaa-7550-9582-51b2564aac35\prestige-motors-design-qa\implementation-mobile-menu-390x844-final.png`.

The final combined image keeps the navigation, hero, assurance strip, filter dock, heading rail and inventory rows legible at once, so separate focused crops were not needed. The hero and navigation form the first focused region; the assurance, filter and inventory areas form the second.

## Comparison history and fixes

1. Remote preview photography failed locally because the development server could not fetch the remote image host. Replaced preview-only photography with local real image assets; production listings continue to use their stored Cloudinary images.
2. The first implementation left too much space before inventory. Tightened the desktop header, hero padding, trust strip, filter dock and inventory top spacing while preserving the chosen editorial composition.
3. Inventory rows were too tall and showed too little stock above the fold. Reduced the desktop image row height, moved save to an icon control, removed redundant desktop metadata and aligned the three-row rhythm with the source.
4. The assistant falsely treated the one-letter Mercedes variant `S` as a vehicle mention inside normal questions. Replaced substring matching with token and token-sequence matching. Browser retests now return the Toyota Camry for an automatic car below RM 200,000 and the Audi RS6 for an Audi availability question.
5. Final accessibility review found weak supporting-text contrast, unclear filter focus, unnamed hidden file inputs, missing mobile primary navigation, incomplete admin tab keyboard behavior and lost focus after closing the vehicle editor. Added a contrast floor, visible focus treatment, accessible names, a focus-safe mobile menu, roving tab stops and trigger-focus restoration.
6. Rapidly switching vehicles in the trust-pack editor could allow an older request to overwrite the newly selected vehicle. Added latest-request sequencing and disabled vehicle switching while a trust pack is saving.
7. The growth workspace mounted every manager and triggered all data requests immediately. Managers now load as separate client chunks and mount only after their workspace is visited. Appointment sorting no longer mutates React state, and car detail metadata/page queries share a request memo.

## Interaction and responsive verification

- Mobile viewport: 390 × 844, no horizontal overflow.
- Mobile navigation opens with focus on Inventory, locks background scrolling, closes with Escape and restores focus to the trigger.
- Mobile inventory filter opens, advanced filters expand, Audi filtering returns one vehicle, and Clear all restores all three preview listings.
- Filter inputs expose a visible red focus outline in computed browser styles.
- The header assistant deep link opens the dialog and focuses its question field.
- Assistant fallback answers materially different questions with matching inventory results.
- Save and compare persists a selected Camry, opens the comparison table and renders the correct specifications; the temporary shortlist item was removed after verification.
- Dealer sign-in renders labelled email/password controls, password visibility control and submit action.
- Final browser console check: no warnings or errors.

## Automated verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.3.1 production compilation.
- `git diff --check`: passed.
- The local catalog is gated by `SHOWROOM_PREVIEW=true`; production should keep `SHOWROOM_PREVIEW=false` so Neon/Cloudinary inventory remains authoritative.

## Result

Final result: passed. No actionable P0, P1 or P2 visual, interaction, accessibility or build findings remain in the reviewed scope.
