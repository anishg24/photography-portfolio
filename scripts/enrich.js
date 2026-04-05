import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import exifr from "exifr";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const PORTFOLIO_DIR = path.join(process.cwd(), "src/content/portfolio");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function getEnrichmentData(base64Image, fileName, existingStory = "") {
    if (!OPENROUTER_API_KEY) {
        console.warn("OPENROUTER_API_KEY is not set! Skipping AI generation.");
        return { title: fileName, story: "" };
    }

    const systemPrompt = `You are an artistic photography assistant. 
Look at the photograph and provide:
1. A short, creative title (2-4 words, using spaces, no underscores).
2. A short, single-paragraph editorial story setting the mood and describing the scene aesthetically. 

Your response MUST be a JSON object:
{
  "title": "Creative Title Here",
  "story": "Editorial story here..."
}

Do not sound robotic. Be lyrical and clean.`;

    const userContent = [
        { type: "text", text: "Please enrich this photograph." }
    ];

    if (existingStory) {
        userContent.push({ type: "text", text: `Existing story for context: ${existingStory}` });
    }

    userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } });

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error("Failed to fetch openrouter summary for:", fileName, await response.text());
            return { title: fileName, story: "Failed to fetch story." };
        }

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        return {
            title: content.title || fileName,
            story: content.story || "Failed to fetch story."
        };
    } catch (e) {
        console.error("Openrouter Error:", e);
        return { title: fileName, story: "Failed to fetch story." };
    }
}

function isDefaultName(name) {
    // Matches DSC0001, IMG_1234, _MG_5678, etc.
    return /^(DSC|IMG|_MG)\d+$/i.test(name);
}

async function extractMetadata(buffer) {
    try {
        const metadata = await exifr.parse(buffer, {
            pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'FNumber', 'ISO', 'ExposureTime', 'LensModel'],
        });
        if (!metadata) return {};

        const date = metadata.DateTimeOriginal || metadata.CreateDate;
        
        let dateString = undefined;
        if (date instanceof Date) dateString = date.toISOString();
        
        return {
            date: dateString,
            camera: metadata.Model || metadata.Make,
            lens: metadata.LensModel,
            aperture: metadata.FNumber ? `f/${metadata.FNumber}` : undefined,
            shutter: metadata.ExposureTime ? `1/${Math.round(1/metadata.ExposureTime)}` : undefined,
            iso: metadata.ISO ? `${metadata.ISO}` : undefined,
        };
    } catch (e) {
        return {};
    }
}

async function* walk(dir) {
    const list = await fs.readdir(dir);
    for (let file of list) {
        file = path.join(dir, file);
        const stat = await fs.stat(file);
        if (stat && stat.isDirectory()) {
            yield* walk(file);
        } else {
            yield file;
        }
    }
}

async function start() {
    const allImages = [];
    try {
        for await (const p of walk(PORTFOLIO_DIR)) {
            if (/\.(jpg|jpeg|png|webp|avif)$/i.test(p)) {
                allImages.push(p);
            }
        }
    } catch (e) {
        console.error("Could not read portfolio directory:", e);
        return;
    }

    console.log(`Found ${allImages.length} image files. Checking for missing metadata...`);

    let concurrencyStr = "4";
    const jIndex = process.argv.indexOf("-j");
    if (jIndex !== -1 && process.argv.length > jIndex + 1) {
        concurrencyStr = process.argv[jIndex + 1];
    }
    const CONCURRENCY = parseInt(concurrencyStr, 10) || 4;
    console.log(`Using concurrency: ${CONCURRENCY}`);

    const executing = new Set();

    for (const imagePath of allImages) {
        const task = (async () => {
            const dir = path.dirname(imagePath);
            const fileName = path.basename(imagePath);
            const ext = path.extname(imagePath);
            const baseName = path.basename(imagePath, ext);
            const mdPath = path.join(dir, `${baseName}.md`);
            
            let mdRaw = "";
            let hasStory = false;
            let existingStory = "";
            let parsed = { data: { image: `./${fileName}`, title: baseName }, content: "" };

            // Check if MD exists
            try {
                mdRaw = await fs.readFile(mdPath, "utf-8");
                parsed = matter(mdRaw);
                if (parsed.content && parsed.content.trim() !== "") {
                    hasStory = true;
                    existingStory = parsed.content.trim();
                }
            } catch (e) {
                // File does not exist yet! We will create it.
            }

            const needsRename = isDefaultName(baseName);

            // Skip if it already has a story AND doesn't need a rename
            if (hasStory && !needsRename) {
                console.log(`[SKIP] ${baseName} already has creative name and story.`);
                return;
            }

            console.log(`[PROCESS] ${baseName}... ${needsRename ? "(needs rename)" : ""} ${!hasStory ? "(needs story)" : ""}`);

            let imageBuffer;
            try {
                imageBuffer = await fs.readFile(imagePath);
            } catch (e) {
                console.error(`Could not read image file ${imagePath}. Skipping.`);
                return;
            }

            console.log(`[${baseName}] -> Extracting EXIF...`);
            const meta = await extractMetadata(imageBuffer);
            
            console.log(`[${baseName}] -> Fetching Enrichment from OpenRouter...`);
            const base64Image = imageBuffer.toString("base64");
            const enrichment = await getEnrichmentData(base64Image, baseName, existingStory);

            let finalTitle = enrichment.title;
            let finalStory = enrichment.story;

            // If we already had a story, preserve it unless it was a failure
            if (hasStory && existingStory) {
                finalStory = existingStory;
            }

            let finalBaseName = baseName;
            let finalImageFileName = fileName;

            if (needsRename) {
                // Generate underscore filename from spaced title
                finalBaseName = enrichment.title.toLowerCase().replace(/[\s\W]+/g, '_');
                finalImageFileName = finalBaseName + ext;
                console.log(`[RENAME] ${baseName} -> ${finalBaseName}`);
            }

            const newData = { 
                ...parsed.data, 
                ...meta, 
                image: `./${finalImageFileName}`,
                title: finalTitle // Spaced title for frontmatter
            };
            
            // Remove undefined keys
            Object.keys(newData).forEach(k => newData[k] === undefined && delete newData[k]);

            const newMdContent = matter.stringify("\n" + finalStory + "\n", newData);
            
            const finalMdPath = path.join(dir, `${finalBaseName}.md`);
            const finalImagePath = path.join(dir, finalImageFileName);

            // Write the new or updated MD file
            await fs.writeFile(finalMdPath, newMdContent);

            // If renaming occurred, perform the file system renames
            if (needsRename) {
                await fs.rename(imagePath, finalImagePath);
                // If the old MD path was different from the new one, delete the old one
                if (mdPath !== finalMdPath) {
                    try {
                        await fs.unlink(mdPath);
                    } catch (e) {
                        // Old MD might not have existed
                    }
                }
            }

            console.log(`[DONE] Finished ${finalBaseName}`);
            
            // Add a 500ms delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        })();

        executing.add(task);
        task.finally(() => executing.delete(task));

        if (executing.size >= CONCURRENCY) {
            await Promise.race(executing);
        }
    }

    // Wait for remaining tasks to complete
    await Promise.all(executing);
}

start().catch(console.error);
