# Installed InPage font assets

536 distinct font files were copied locally into `public/fonts/inpage`: 530 TrueType files from the installed InPage 3 Professional directory, plus six Urdu fonts installed in Windows Fonts. The source paths, hashes, sizes, font names, Unicode Arabic coverage and embedding flags are recorded in `inpage-font-inventory.json`.

All files have CSS registrations and are listed in both ribbon font selectors. Registrations use unique aliases to avoid collisions between the many font shards. The 530 bundled files have fewer than ten Arabic Unicode code points in their best character map and are marked as legacy encoding in the UI. This is an encoding diagnostic, not a claim that any font is broken. Native InPage maps text to these glyph banks itself; ordinary Unicode browser shaping does not reproduce that mapping. The six Windows Urdu fonts have Arabic Unicode mappings, which still does not guarantee complete Urdu shaping or native layout fidelity.

Files were copied without modification and are currently local project assets. Their presence on this machine does not establish redistribution rights for a future public deployment. Recorded embedding flags are metadata, not a substitute for the font license.
