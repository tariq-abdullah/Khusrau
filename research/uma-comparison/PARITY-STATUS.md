# InPage parity audit — 11 October 2026

**Status: incomplete. Exact editor/PDF rendering and rich native INP writing have not been achieved.**

Repository pulled from 42404b1 to ab56924; development server runs at http://127.0.0.1:5173/.

## Source integrity and roundtrip

Original: `E:/UMA-Vision Doc P.inp`, 1,778,176 bytes.

SHA-256: `a19cdec9db2aab40a33122d1bdcd29064f14efcde8ace8bdc465e5bf2464191e`.

The original remains unchanged. A web export made after browsing every imported page has the same hash. The byte-identical web export was also opened in installed InPage; it shows the same 16-page document and the same missing Arial Unicode MS font reference as the original. This verifies unchanged-source preservation, **not writing edited native documents**.

`source-integrity.json` records the final hash check. `UMA-web-roundtrip.inp` contains the earlier verified byte-identical export.

## UMA editor and PDF comparison

All 16 pages were browsed in installed InPage. All initially imported 18 web pages and all updated 23 web pages were browsed. Native PDF pages 1–16 and web PDF pages 1–23 were rendered and visually inspected using contact sheets.

| Artifact | Pages | Result |
| --- | ---: | --- |
| UMA-native-reference.pdf | 16 | Reference exported by installed InPage |
| UMA-web-comparison.pdf | 23 | Diagnostic export before later crop/runaround/fill fixes; known incorrect layout and clipped text |
| Current web import | 23 | Still differs substantially from native; PDF export now rejects clipped default-frame text |

The initial importer capped pagination and placed more than 8,000 characters on its final page. That cap was removed. Current text remains present in the document model, but estimated pagination still leaves text outside some visible page boxes. `web-after-audit.json` records the actual DOM checks. The old diagnostic PDF is retained as evidence and is **not a successful final export**.

Corrected eight referenced picture boxes on native pages 1, 1, 1, 7, 7, 8, 15 and 16, excluding unused embedded images. Native image dimensions, independent horizontal/vertical scale, RTL offset, top offset and crop are now decoded. Several coordinates were independently checked against native PDF image bounds.

## Two-page fixture

`../fixtures/two-page-native.inp` was authored and saved in installed InPage:

- A4 portrait, two pages, RTL, two columns, 4.23 mm gutter, 12.7 mm margins.
- Noori Nastaliq; 20 pt bold blue heading; 12 pt bold black body.
- Heading and 22 numbered Urdu paragraphs; source text in `two-page-text.txt`.
- Page 2 stamp picture: x approximately 20 mm, y 119.46255 mm, width 40 mm, height 53.28461 mm, native-sized picture cropped from the left.
- Picture runaround enabled; left/top/right/bottom offsets 2/1/3/4 mm.
- Repeating master picture frame: x 13.743869 mm, y 153.858383 mm, 81.227083 × 100.0125 mm; image scaled to 25%, RTL anchored; white fill.

The independent editable web reconstruction is `../fixtures/two-page-web.ipdoc`. It uses four linked text frames, the same full text, two page columns, the same picture geometry and a repeating master image. The JSON was authored with inspected native settings and then opened, browsed and exported through the application. It was not typed entirely through the web UI.

| Artifact | Pages | Result |
| --- | ---: | --- |
| two-page-native-final.pdf | 2 | Native reference including images/master settings |
| two-page-web-verified.pdf | 2 | Successfully exported through web UI; both pages inspected |

Both PDFs have two pages, but they are **not visually identical**. Native page 2 begins in paragraph 16; the web reconstruction begins near the end of paragraph 17. Font shaping, line breaks, heading/body metrics and paragraph flow differ. Picture crop and master masking now follow the inspected native behavior. The original two-page native PDF under `../fixtures/` predates the pictures/master; use `two-page-native-final.pdf` for comparison.

Native `two-page-wrap-on.inp`, `two-page-wrap-off.inp` and `two-page-master-red.inp` are controlled variants used to identify runaround and fill tags. They did not modify the original UMA file or the saved final native fixture.

## Implementation changes

- Added bounded native page/picture record parsing, native page count, picture stream-name lookup, transforms/crop, runaround flag/offsets and partial fill-color decoding.
- Corrected native master picture stacking for the inspected fixture and enabled master runaround in text-frame measurement.
- Matched linked-frame measurement line spacing to the visible editor; fixed zero insets and pixel rounding that could leave a wrapped column empty.
- Preserved rich inline marks, paragraph attributes and whitespace during page splits; included columns and gutter in estimated pagination.
- Added heading font/size/leading/bold/alignment to linked-frame paragraph runs, shared by measurement and visible rendering.
- Expanded native change detection to include margins, paper geometry, columns and master/typographic settings.
- Normalize every page before the native baseline is recorded, so visiting pages does not create false edits from automatic links/trailing paragraphs.
- Cancel stale page-overflow checks when navigating/switching documents and suppress them during export.
- Reject unsupported edits to imported native files rather than silently replacing them with a lossy text-only INP file. Basic new-document writing remains available, with its limitations stated.
- Reject raster PDF/EPS captures that would clip default-frame text. This protects exports; it does **not fix the remaining layout differences**.
- Raised the PWA precache file limit to 50 MB so the existing 38.6 MB Faiz font no longer fails the production build.

## Remaining work required for exact interoperability

1. Decode native story/frame boundaries, actual paragraph/style/character runs, header/footer/master inheritance and original page breaks. Current paragraph formatting and UMA cover reconstruction still contain heuristics.
2. Implement native Noori glyph-bank shaping and metrics. The web `Noori Nastaliq` alias currently uses the Unicode Jameel font, which is not identical to native shaping.
3. Replace estimated root pagination with measured flow across columns and exclusions, preserving all rich content. Global CSS floats across multiple columns are not equivalent to separate native column flow.
4. Implement complete edited/new INP serialization of styles, objects, images, master pages and stories. The existing template writer only writes text and basic page geometry.
5. Implement vector/glyph PDF and EPS output. Current web exports are raster pages; native output is glyph curves with different print/color behavior.
6. Decode custom fill palettes and remaining object styles; current picture fill decoding covers only a small set of indices.

## Validation

141 tests pass (`node --test scripts/*.test.mjs`). Production build succeeds with the corrected PWA font limit. Logs: `test-results.txt`, `build-results.txt`.

The pre-existing change to `../fixtures/AboutFaiz-native-saved.inp` was preserved. Changes are local and uncommitted. Passing tests do not establish full InPage parity.

## Follow-up: native text styles and measured flow

Decoded the complete 590-span UMA character-format table, including its initial sentinel offset, font sizes, weights, explicit leading, and document color indices. Decoded all 100 named palette entries from the source RGB/CMYK records. Native text and picture fills now use source colors, rather than generic web colors. Paragraph font size is represented on the block as well as inline spans, so heading line boxes use the source size.

Native imports now use browser-measured pagination with the editor schema and loaded fonts. Empty paragraphs reproduce ProseMirror's trailing break line boxes. Multicolumn native stories use distinct linked frames, which keeps each column's runaround exclusions local. Automatic line spacing follows the typography preference.

The native two-page fixture imports as two pages and exports as a two-page A4 PDF, visually reviewed on both pages: two-page-native-import-verified.pdf. Its unchanged native export is byte identical. The original Desktop UMA SHA-256 remains unchanged.

Exact parity is still incomplete. UMA requires 20 browser pages after accounting for blank paragraph line boxes, versus 16 native pages. The intermediate 18-page result undercounted blank paragraphs and must not be treated as successful parity. Separate native header, caption, footer, and body stories are still concatenated; frame/story assignments and Noori glyph-bank shaping remain undecoded. Native writing of edited objects and formatting remains unsupported. The fixture's paragraph breaks still differ from the native reference.

145 tests pass. See test-results.txt and build-results.txt.
