import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const oldImagePath = process.argv[2];
const newBaseName = process.argv[3];

if (!oldImagePath || !newBaseName) {
    console.error("Usage: node scripts/rename.js <old-image-path> <new-base-name>");
    console.error("Example: node scripts/rename.js \"src/content/portfolio/San Diego Safari/ambitious_elephant.jpg\" \"gentle_giant\"");
    process.exit(1);
}

async function rename() {
    const absoluteOldImagePath = path.isAbsolute(oldImagePath) 
        ? oldImagePath 
        : path.join(process.cwd(), oldImagePath);
    
    try {
        await fs.access(absoluteOldImagePath);
    } catch (e) {
        console.error(`Error: File not found: ${absoluteOldImagePath}`);
        process.exit(1);
    }

    const dir = path.dirname(absoluteOldImagePath);
    const ext = path.extname(absoluteOldImagePath);
    const oldBase = path.basename(absoluteOldImagePath, ext);
    const newFileName = newBaseName + ext;
    const newImagePath = path.join(dir, newFileName);
    const oldMdPath = path.join(dir, `${oldBase}.md`);
    const newMdPath = path.join(dir, `${newBaseName}.md`);

    console.log(`Renaming image: ${oldBase}${ext} -> ${newFileName}`);
    await fs.rename(absoluteOldImagePath, newImagePath);

    try {
        await fs.access(oldMdPath);
        console.log(`Updating enrichment: ${oldBase}.md -> ${newBaseName}.md`);

        const mdRaw = await fs.readFile(oldMdPath, "utf-8");
        const parsed = matter(mdRaw);

        // Update frontmatter
        parsed.data.image = `./${newFileName}`;
        parsed.data.title = newBaseName;

        const updatedContent = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(oldMdPath, updatedContent);
        await fs.rename(oldMdPath, newMdPath);
        
        console.log("Success: Photo and enrichment renamed and updated.");
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log("Warning: No corresponding .md enrichment file found. Only image was renamed.");
        } else {
            console.error("Error updating enrichment:", e);
        }
    }
}

rename().catch(console.error);
