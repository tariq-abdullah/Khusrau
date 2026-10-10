# AboutFaiz compatibility check — 2026-10-10

The installed InPage 3 Professional sample was inspected in the native app, saved under a new filename, and printed to a two-page A4 reference PDF. The original vendor sample was left unchanged.

## Reconstructed document

- Complete Unicode story recovered: 10,185 source UTF-16 code units, 41 paragraphs including leading/trailing blanks. The editable story retains 10,182 units after trimming three empty boundary paragraphs.
- Original embedded JPEG banner, clipped with the observed native picture origin and frame dimensions.
- A4 pages, 12.7 mm margins, two right-to-left columns, 4.233 mm gutter, linked text frames, justified body, eight red heading/link runs, black closing motto.
- Automatic continuation frames/pages prevent lost overflow. Paragraph colors survive frame transitions and text edits.
- IndexedDB stores documents and native sources, avoiding localStorage's small quota for embedded pictures.

The editable reconstruction has two pages, but is **not an exact native layout**. Noto Nastaliq Urdu at 8 pt is used to approximate the physical size of native Faiz Nastaliq at 12 pt. Glyphs, line endings, paragraph positions and justification differ. The AboutFaiz layout is a manually inspected sample profile, not a general native layout decoder. Other supported native files currently recover text only, with explicit warnings; the Unicode reader selects the longest supported story rather than decoding every frame/story.

## Export/import results

| Path | Verification | Limits |
| --- | --- | --- |
| Native Save As → web Open | Entire source story and banner recovered; two-page reconstruction | General layout/character records are not decoded |
| Web Save → web Open `.ipdoc` | Complete story, two pages, five objects, colors and embedded banner retained | Native source bytes are held on the originating browser/device |
| Web PDF | Both A4 pages exported, reopened and rendered with PyMuPDF; visually inspected | 192 dpi raster pages; text is not searchable/editable |
| Web EPS | Separate page-one/page-two EPS exports rendered successfully by InPage's installed Ghostscript 9.00 DLL; visuals inspected | Raster RGB artwork; no vector text or editable objects |
| Unchanged web INP → original InPage | Byte-identical original source reopened with its original two-page layout | The web reconstruction is not serialized as a new native layout |
| Edited web INP → original InPage | Replaced the first `فیض` with `راز`; changed exactly three bytes in the original OLE file. InPage opened it and visibly rendered the changed word, with its original layout | Experimental Unicode text patching only; same UTF-16 counts and paragraph boundaries required; formatting/layout changes rejected |
| Native edited test → web Open | Recovered the changed word and rebuilt the two-column sample | Same sample-profile/font limitations |

Original native source SHA-256: `cbaf4b83c15e1539a04e0ae7e326939a9577fbbfd7653bf40bc5a44b1f5580e1`.

Native writing patches existing FAT-sector story bytes without changing file size, stream metadata, fonts, images or unknown records. It refuses new documents, changed native formatting/layout, resized stories, moved paragraph breaks and unsupported stream storage. This is **not general InPage round-trip writing**.

## Remaining compatibility work

1. Decode native page/frame/column geometry and character/paragraph style records generally.
2. Map the installed legacy Faiz/Noori/Lahori glyph collections to Unicode shaping, including Kashida and kerning.
3. Update native lengths, formatting offsets and other dependent records so text can grow/shrink and layout can change.
4. Implement vector/searchable PDF and EPS export and broader native-version/sample tests.

Technical references: [inpage-format source and partial specification](https://github.com/iamahsanmehmood/inpage-format), [Ghostscript interpreter API](https://ghostscript.readthedocs.io/en/latest/API.html). The published V3 decoder truncated this sample; the project uses its own contiguous-Unicode recovery fix. The decoder package's formatting estimates were not used as proof of native layout.
