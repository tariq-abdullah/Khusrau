# Menu parity audit — 10 October 2026

The web menu sweep covers all 87 current menu entries. Coverage means each entry was clicked in an appropriate context or its dialog opened; it does **not** mean every option has functional or native parity. The raw per-action evidence is in `web-menu-audit.json`, and the full menu inventory is in `menu-inventory.json`.

All eight native InPage menu headings were inspected. Native dialogs inspected included New, Character, Paragraph, Style Sheets, Find/Replace, Date/Time, Insert Page, Word Count, Application Preferences, Document Preferences, Typographic Preferences, Duplicate, Object and Print. The native Tabs ribbon was also inspected. Other native commands and all dialog permutations remain to be audited.

## Implemented from observed differences

- New document paper, orientation, columns, gutter, page count and direction.
- Duplicate rows/columns grid with independent gaps and original selection included in the grid count. Browser verification: a 180 × 140 px object produced copies at +180 px across and +140 px down in a 2 × 2 grid.
- Paragraph beginning/end/first-line indents and paragraph spacing in editor and frame stories.
- Unicode whole-word matching, case matching, and selected frame story search/replacement. Two occurrences of beta were replaced with omega in the test frame.
- Story word, character and paragraph statistics; additional date formats.
- Dedicated Tabs ribbon, custom style creation/application/modification/removal and persistence.
- Object geometry in millimetres, text frame gutter/direction, fill patterns, lock and nonprinting behavior.
- Relevant keyboard shortcuts and a staged Print dialog, so opening File → Print does not immediately block the embedded browser.

## Function checks

Browser checks exercised object clipboard actions, undo/redo, selection, layering, lock/unlock, grouping/ungrouping, guide locking, view toggles, document switching, page insertion, grid duplication, text/frame search, paragraph formatting, custom style application, table insertion/splitting, picture placement/import, index generation and contents generation. File commands produced project, text, HTML, PDF and EPS downloads. The test PDF was rendered for inspection. Native INP import/export was exercised again.

Production build passes. Automated suite: 33 passing tests. A build size warning remains for large JavaScript chunks.

## Remaining differences / incomplete validation

| Area | Remaining work |
| --- | --- |
| Native audit | Not every native command/modal has been opened, applied and compared. All 87 web entries being clicked is not a completed native audit. |
| New/document setup | Four independent margins, arbitrary page size, automatic text box, double-sided pages and default setup persistence. |
| Character typography | Native Urdu glyph alternates, kerning/Kashida behavior, separate Latin/Urdu formatting and exact font metrics. Existing controls do not establish equivalent shaping. |
| Paragraphs | Keep/break/widow/orphan controls, native spacing units, character alignment and per-paragraph frame formatting. |
| Tabs | Explicit positioned/aligned tab stops and leaders; current ribbon only exposes default spacing. |
| Object formatting | Border inside/outside, advanced column dividers, templates and complete master-page behavior. |
| Preferences | Native preferences have multiple subdialogs and many settings not implemented in the simplified web dialog. |
| Window/help menus | Native Close All and Ribbon/Page/View entries and exact native Help organization differ. |
| Search/statistics | Native Find What modes, precise frame caret/highlight and wrapped line counts. Frame insertion currently appends to the story. |
| Styles | Native inheritance and per-paragraph style identity are not reproduced. |
| Proofing/indexing | Dedicated Urdu spelling/hyphenation and complete native index/contents options remain unverified. |
| Printing | Opening the original immediate browser print action blocked embedded browser automation; recovered by reload. New staging dialog was tested, but actual system printing was not reverified and no print job was submitted. |
| Native INP writing | Preserved source round trips and constrained text patching work; arbitrary new native INP document/layout generation is not implemented. |
| Output fidelity | PDF is rasterized and EPS uses image data; successful downloads do not establish native vector/font fidelity. |

User documents were preserved. Tests used separate scratch documents and a local audit fixture.

## Per-entry web sweep evidence

| Menu | Entry | Recorded observation |
| --- | --- | --- |
| File | New… | dialog |
| File | Open… | native opened |
| File | Close | dialog |
| File | Save… | downloaded |
| File | Save As… | dialog |
| File | Save as PDF… | downloaded |
| File | Export native INP… | downloaded |
| File | Place… | image loaded |
| File | Import… | text imported |
| File | Export All Text… | downloaded |
| File | Export Page… | downloaded |
| File | Export Page as EPS… | downloaded |
| File | Print… | dialog tested; native print blocked automation |
| File | Exit | dialog |
| Edit | Undo | clicked; clicked |
| Edit | Redo | clicked |
| Edit | Cut | clicked |
| Edit | Copy | clicked |
| Edit | Paste Special… | dialog |
| Edit | Paste | clicked; clicked |
| Edit | Duplicate… | dialog and duplication tested; final grid offsets covered by unit test; verified final grid; 2 rows × 2 columns produced original plus three copies with width/height spacing |
| Edit | Clear | clicked |
| Edit | Select All | verified; selected six objects |
| Edit | Find and Replace… | dialog |
| Edit | Top Most | clicked |
| Edit | Send To Back | clicked |
| Edit | Bring To Front | clicked |
| Edit | Lock Guides | toggled and restored |
| Edit | Lock/Unlock Objects | clicked; clicked |
| Edit | Story Editor | dialog |
| Edit | Delete Page… | dialog |
| Edit | Preferences… | dialog |
| View | Fit in Window | clicked and viewport changed |
| View | 50% | clicked |
| View | Actual | clicked |
| View | 200% | clicked |
| View | Facing Pages | clicked |
| View | Hide Ribbon | clicked |
| View | Hide Tools | clicked |
| View | Hide Rulers | clicked |
| View | Hide Guides | clicked |
| View | Show Invisibles | clicked |
| View | Show Index Entries | clicked |
| View | Snap To Guides | clicked |
| Format | Character… | dialog |
| Format | Paragraph… | dialog |
| Format | Hyphenation… | dialog |
| Format | Borders… | dialog |
| Format | Tabs… | dialog |
| Format | Text Wrap | toggled and restored |
| Format | Sort Text… | dialog |
| Format | Table Format… | dialog |
| Format | Table Layout… | dialog |
| Format | Object… | dialog |
| Format | Runaround… | dialog |
| Format | Inset… | dialog |
| Format | Master Page Objects… | dialog |
| Format | Document… | dialog |
| Format | Guides… | dialog |
| Format | Style Sheets… | dialog |
| Format | Define Colors… | dialog |
| Insert | Date & Time… | dialog |
| Insert | Page… | dialog |
| Insert | Page Number… | dialog |
| Insert | Picture… | image loaded |
| Insert | Table… | dialog |
| Insert | Split Table | verified |
| Insert | Index Entry… | dialog |
| Insert | Object Lock… | verified; selected object locked and unlocked |
| Insert | Footnote… | dialog |
| Utilities | Spelling… | dialog |
| Utilities | Word Count | dialog |
| Utilities | Group | verified; six objects |
| Utilities | Ungroup | verified; six objects |
| Utilities | Auto Index… | dialog |
| Utilities | Generate Index | verified; Alpha … 2 added |
| Utilities | Table of Contents | clicked |
| Utilities | Symbols… | dialog |
| Window | Cascade | dialog |
| Window | Tile | dialog |
| Window | Next Document | verified |
| Window | Document list… | dialog |
| Help | Help Topics… | dialog |
| Help | Short Cuts… | dialog |
| Help | Using help… | dialog |
| Help | Keyboard Layout… | dialog |
| Help | About inpage.net… | dialog |
