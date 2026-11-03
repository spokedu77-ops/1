# Stitch design references

The HTML in bodies/ is retained only as a design reference.
Public routes render React components in app/spokedu/website/pages/.
The shared layout owns the header, footer and Pretendard loading.
There is no HTML insertion engine, CDN Tailwind, or ON/OFF flag.
The scoped stylesheet is generated with the project's Tailwind version by scripts/build-website-styles.mjs.
