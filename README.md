# inpage.net

Independent Vue 3 Urdu publishing PWA, developed at E:\inpage.net.

Installed InPage and user-supplied font binaries are kept local and excluded from Git. The font catalog/CSS references remain in source; place licensed copies in `public/fonts/inpage/` to enable those faces. The Unicode Noto fallback is included where available. This repository does not claim full native InPage parity; see `research/MENU-PARITY-AUDIT.md` for current limitations.

## Run

On this PC, run start.ps1 in PowerShell. With Node.js 22+ and pnpm:

    pnpm install
    pnpm dev
    pnpm build
    pnpm test

Local URL: http://127.0.0.1:5173/

## Implemented controls (0.2)

The screenshot reference and installed InPage 3 Professional informed the menu order, compact two-row ribbon, 15-icon tool strip, rulers, page canvas and page navigator.

The ribbon supports paragraph styles, line spacing, English and Urdu font selection, bold/italic, size, tracking, baseline shift, five alignments, RTL/LTR, color, horizontal scaling, superscript, outline, single/double underline, overline, box decoration, language and Unicode Kashida insertion/removal.

All 15 tool-strip buttons operate: selection, text/picture editing, rotation, text linking/unlinking, text/title frames, rectangular/elliptical/rounded picture frames, rectangle/ellipse/rounded-rectangle/line/polygon drawing. Drag to create, arrow-tool drag to move, corner-handle drag to resize, rotation-tool drag to rotate. Shift-click adds selection. Double-click picture frames to embed a local image. F2 edits the full text story. Linked text uses measured overflow and preserves its complete underlying story.

Menus implement local document tabs; open/save/save-as; Unicode import/export; current-page HTML export; all-page PDF export; per-page raster EPS and current-page browser print; clipboard and duplicate; object layering, locking and grouping; find/replace; page addition/deletion/navigation; views and zoom; guides and grid snapping; character/paragraph settings; browser hyphenation; borders/tabs/sort; table insertion, row/column editing and cell backgrounds; object dimensions/colors/inset/runaround/master repetition; custom colors; dates/page numbers/footnotes/index entries; auto-index, index and contents generation; symbols; browser spelling; keyboard preferences; document cascade/tile overviews; help; and closing/reopening the workspace. Selection-dependent actions are disabled until applicable.

Drafts, document tabs, current page, objects, embedded images and formatting are saved on this device. Save .ipdoc files for portable copies. examples/toolbar-demo.ipdoc is the generated two-page test document with tables and every object type.

## Validation

Production build passed. Twenty-five automated tests cover Unicode document round-trip, validation, drawing geometry, frame-chain cycles, link integrity, frame deletion preserving text, Kashida joining, and typography/table attribute serialization.

Browser tests verified numeric formatting, bold/tracking/scaling/outline/double underline, table insertion and cell color, page addition, all frame/drawing creation tools, actual linked overflow, unlinking without lost word count, image placement, movement, rotation, resizing, save/reopen and refresh restoration. The saved test document reopened with both pages, all eleven objects and its embedded image intact.

## Differences still requiring work

This is not complete or pixel-perfect InPage parity. Native Unicode text recovery and limited same-length native text editing are implemented for the inspected AboutFaiz sample; general .inp layout decoding/writing and legacy Noori/Lahori glyph encodings remain under development. The bundled font is Noto Nastaliq Urdu, not Noori Nastaliq. Kashida uses Unicode elongation rather than InPage's font-specific alternates. Automatic document pagination, advanced shaping/kerning and complete InPage dialog parity are pending. Pages are explicit for ordinary documents; the AboutFaiz linked story creates continuation pages automatically. PDF export covers all pages; browser print and HTML/EPS export target the displayed page. Facing-page preview is a plain-text overview. Cascade/tile arrange browser document previews, rather than native operating-system windows. Spelling/hyphenation depend on browser dictionaries; no Urdu spelling dictionary is bundled.

## Fonts, PWA and hosting

public/fonts contains Noto Nastaliq Urdu from the official google/fonts repository and its SIL Open Font License. The 530 installed InPage font files are inventoried in research/font-inventory.json and copied to research/local-fonts for local research. That folder is excluded from Git and the public build. Embedding flags do not prove distribution permission.

research/inp-samples.json and inp-streams.json record vendor sample structures. Native samples are OLE containers with DocumentInfo and InPage300 streams; general document record decoding is pending. See research/ABOUTFAIZ-COMPATIBILITY.md for the verified import/write subset.

The production build includes the PWA manifest, icons, service worker and cached web font. First load the production build before offline use; the Vite development server does not enable the service worker. No domain has been registered and nothing has been published.

### Contextual object controls

Select a text box, picture box or shape with the arrow tool for its object ribbon. Use the editing tool (or Edit text / Edit image) to switch to content controls. Numeric geometry uses mm; borders use pt. Picture content can be positioned, scaled, skewed, rotated and mirrored independently of its frame.

Choose Box runaround or Shape runaround to flow text around an object. Format > Runaround provides separate offsets on all four sides. The main document and linked frames reflow around wrapping objects. examples/object-context-demo.ipdoc demonstrates both. Detailed remaining layout differences are recorded in research/PARITY.md.

### AboutFaiz reconstruction and native interoperability

Open the saved native sample through File > Open. Its full Unicode story and embedded banner are recovered into editable linked columns with colored headings. The sample profile uses Noto 8 pt as a substitute for native Faiz 12 pt; this is not exact native font/layout parity. examples/AboutFaiz-reconstruction.ipdoc is the editable two-page fixture.

File > Save as PDF exports every page, and File > Export Page as EPS exports the selected page. Both preserve the rendered Urdu as raster artwork. File > Export native INP preserves the original file, or patches same-length Unicode text edits while retaining native layout and formatting. It refuses layout/style changes, changed paragraph boundaries and resized stories. Reopen the native file on another device to restore its original bytes before native export.

Documents and original native bytes are stored in IndexedDB. The existing localStorage draft/tabs are migrated on first load. Native files remain local to this browser and are not sent to a server. Detailed evidence and limitations: research/ABOUTFAIZ-COMPATIBILITY.md.
