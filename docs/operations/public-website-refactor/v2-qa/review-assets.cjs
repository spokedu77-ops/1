const sharp = require('sharp');
(async () => {
  const paths = ['home/field-editorial/home-case-general.webp', 'home/field-editorial/home-case-adapted-p05.webp', 'home/field-editorial/home-case-spomove-p05.webp', 'records/yangcheon-paps.jpg', 'records/gangdong-health-pe.jpg', 'records/shinwol-integrated-pe.jpg', 'records/seodaemun.jpg'];
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    parts.push({ input: await sharp('public/images/spokedu/' + paths[i]).resize(320, 240, { fit: 'contain', background: '#fff' }).toBuffer(), left: i % 3 * 320, top: Math.floor(i / 3) * 270 });
    parts.push({ input: Buffer.from(`<svg width="320" height="30"><text x="8" y="20" font-size="11">${paths[i]}</text></svg>`), left: i % 3 * 320, top: Math.floor(i / 3) * 270 + 240 });
  }
  await sharp({ create: { width: 960, height: 810, channels: 3, background: '#fff' } }).composite(parts).png().toFile('docs/operations/public-website-refactor/v2-qa/assets-review.png');
})();
