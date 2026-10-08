# Barlow fonts

Self-hosted Barlow (400, 500, 600, 700, 800) and Barlow Condensed (600, 700, 800), sourced from Google Fonts on October 8, 2026. These faces were already used by Stock Car Empire; the redesign serves them locally for consistent typography and offline use.

Source stylesheet: https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap

License: SIL Open Font License, included for both families. `node tools/build_fonts.cjs` generates `fonts.css` with data URLs from the eight TTF files, avoiding Chrome's font CORS restriction on direct `file://` launches. The standalone builder embeds this same stylesheet. Rebuild it after replacing any font file.
