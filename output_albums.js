import fs from 'fs';

const p = fs.readFileSync('src/pages/index.astro', 'utf8');
console.log(p.includes('albumHtml={renderedAlbumDocs}'));
