# Baseline parity tracker — 0.2

Reference: installed InPage 3 Professional and the user's toolbar screenshot, inspected 2026-10-10.

## Screenshot controls implemented

- All eight menus in the observed order, with selection-aware command enablement.
- Two-row text ribbon: styles, leading, Latin/Urdu font controls, bold/italic, size, tracking, baseline, alignments, direction, color, scale, superscript, outline, decoration, language and Kashida.
- All fifteen tool-strip functions: select, edit, rotate, link, unlink, text frame, title frame, three picture frames and five drawing shapes.
- Rulers, draggable margin guides, object grid snapping, canvas and page navigation.

## Functional menu baseline

File/document tabs, save/open/import/export, clipboard, find/replace, object layering/grouping/locking/duplication, view toggles/zoom, paragraph and object properties, tables/cells, manual pages/columns, images, master objects, footnotes, index/contents generation, symbols, custom colors, keyboard preferences, browser spelling/hyphenation, document overview windows and help.

## Verification

Eleven automated tests pass. Browser tests cover every creation tool, moving/resizing/rotation, picture placement, text-chain overflow/unlinking, table insertion/cell color, page insertion, selected-text metrics, selected-frame color/size, file save/reopen and refresh. The demo file reopens with two pages and eleven objects.

## Remaining parity gaps

- Native .inp record decoding and round-trip writing; two sample OLE containers are inventoried.
- Noori/Lahori legacy font mapping and distribution permission. Current web font is Noto Nastaliq Urdu.
- Font-specific Kashida alternates, kerning and exact shaping. Current Kashida controls insert/removes Unicode tatweel while avoiding lam-alef ligatures.
- Automatic pagination and exact frame layout across multiple InPage versions. Pages are manually added.
- Complete detail-for-detail parity of every native dialog and advanced print/export option. Print and HTML export currently target the displayed page.
- Browser spelling/hyphenation uses browser dictionaries; no dedicated Urdu spellcheck dictionary is bundled.
- Browser cascade/tile previews and facing-page plain-text overview differ from native windows and fully rendered facing pages.
- Text-frame formatting currently applies to the frame as a whole; rich character runs inside frame stories remain to be implemented.

No claim of 100% InPage compatibility is made. Full baseline parity remains the project objective before custom features.

## Object contexts and runaround (2026-10-10)

Inspected InPage 3 Professional directly, including the bundled AboutFaiz sample. Selection of text frames exposes geometry, border/background, column count/gap, angle and hatch controls. Picture selection exposes geometry, border/background and rectangular/elliptical/rounded shape controls. Editing a picture switches to origin X/Y, scale X/Y, skew X/Y and angle. Lines use endpoint coordinates and border controls. The native Text Run Around Offset dialog has Run Around and separate Left/Top/Right/Bottom fields; observed defaults were 0.71/0.35/0.71/0.35 mm. Native drawing through the automation drag API did not create or move objects, so no native drag/reflow result is claimed.

Implemented separate contextual ribbons, millimetre geometry fields, point border widths, border colors and dash/dot styles, hatch patterns, shape conversion, corner radius, frame columns/gaps, image transforms and clipping, line arrowheads, and runaround controls. Selection-tool mode edits a box; editing-tool mode edits its content.

Runaround exclusions are now in the ProseMirror text flow rather than outside the editor wrapper. The same outlines are used to measure and display linked frame stories. Box, ellipse and rounded contour runaround, side-specific wrapping, above/below, and independent clearances are available. Reflow follows movement and resizing and is preserved in .ipdoc.

Remaining layout differences: the browser chooses one available span per line, rather than text on both sides of a central obstacle on the same line; opposing masks may choose a conservative consistent side. Rotated shapes use their bounding rectangle. Polygon contour, rotated story coordinates, multi-column exclusions and mixed rich typography inside linked stories need further parity work. No claim of exact native layout is made.

Verification: 18 automated tests, production build, browser checks of object-type contexts, millimetre sizing, borders, image origin/scale/skew/mirror/reset, asymmetric offsets, and Urdu flow around a picture and ellipse inside linked text frames. Demo fixtures: examples/runaround-demo.ipdoc and examples/object-context-demo.ipdoc.

## AboutFaiz import/export (2026-10-10)

Added full contiguous-Unicode story recovery for the inspected InPage300 sample, embedded JPEG recovery, manually inspected AboutFaiz geometry, colored paragraph runs in linked frames, continuation-page creation, all-page raster PDF, per-page raster EPS, IndexedDB persistence and native-source preservation. Native text edits that preserve character counts and paragraph boundaries can be patched into the original FAT sectors; tested with an actual web export reopened in InPage. General native record writing and exact Faiz shaping remain unresolved. See ABOUTFAIZ-COMPATIBILITY.md for the precise tested subset.

The earlier remaining-gap bullets describe the baseline before this addition. PDF now exports all pages; native text recovery/limited patching and colored frame runs now exist. Frame character formatting is still not a full rich-text editor, and continuation pagination is currently implemented for the AboutFaiz story profile.

## Menu audit update — 10 October 2026

All 87 current web menu entries were clicked or their dialogs opened, with per-entry evidence in MENU-PARITY-AUDIT.md and web-menu-audit.json. This is not full native parity: fourteen native dialogs and the Tabs ribbon were inspected; other native commands/options remain. New setup, grid duplication, paragraph indents, whole-word/frame search, styles, object formatting and Print staging were expanded. Production build passes and 33 automated tests pass. Latest preserved native export SHA256 matches the recorded source baseline CBAF4B83C15E1539A04E0AE7E326939A9577FBBFD7653BF40BC5A44B1F5580E1. Original fixture is currently locked by InPage, so the comparison uses the previously recorded baseline. See the audit for outstanding work.
