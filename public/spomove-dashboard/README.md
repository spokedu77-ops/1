# SPOMOVE dashboard reference assets

These assets support only `/admin/spomove/training`.

- `fonts/noto-*.ttf`: Noto Sans KR, weights 400–900, downloaded from Google Fonts with a character subset covering the supplied desktop HTML. Licensed under the SIL Open Font License in `fonts/OFL.txt`.
- `webfonts/fa-{regular-400,solid-900}.woff2`: Font Awesome Free 6.4.0, the version used by the supplied desktop HTML. License: `webfonts/LICENSE.txt`.
- The mobile reference uses its original system font stack and inline SVGs.

Production does not load the reference Tailwind CDN. Its generated v3 declarations are scoped in the dashboard CSS Modules; their custom properties have separate prefixes to avoid Tailwind v4 registered-property collisions.
