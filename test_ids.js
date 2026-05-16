import fs from 'fs';

const albumsInfo = fs.readdirSync('src/content/albums');

for (const p of albumsInfo) {
    // How getCollection represents the ID depends on the loader.
    // Let's assume the astro id is the file path relative to the base
    console.log("Album ID representation test:", p.replace(/\.md$/, ""));
}
