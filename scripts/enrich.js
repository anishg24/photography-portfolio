import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import exifr from "exifr";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const PORTFOLIO_DIR = path.join(process.cwd(), "src/content/portfolio");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function getOpenRouterStory(base64Image, fileName) {
    if (!OPENROUTER_API_KEY) {
        console.warn("OPENROUTER_API_KEY is not set! Skipping AI generation.");
        return "";
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini", // fast, cheap and visually intelligent 
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "You are an artistic photography assistant. Look closely at this photograph and write a short, single-paragraph editorial story setting the mood and describing the scene aesthetically. Do not sound robotic. Be lyrical and clean." },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            console.error("Failed to fetch openrouter summary for:", fileName, await response.text());
            return "Failed to fetch story.";
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (e) {
        console.error("Openrouter Error:", e);
        return "Failed to fetch story.";
    }
}

async function extractMetadata(buffer) {
    try {
        const metadata = await exifr.parse(buffer, {
            pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'FNumber', 'ISO', 'ExposureTime', 'LensModel'],
        });
        if (!metadata) return {};

        const date = metadata.DateTimeOriginal || metadata.CreateDate;
        
        let dateString = undefined;
        if (date instanceof Date) dateString = date.toISOString().split('T')[0];
        
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
            const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
            const mdPath = path.join(dir, `${baseName}.md`);
            
            let mdRaw = "";
            let hasStory = false;
            let parsed = { data: { image: `./${fileName}`, title: baseName }, content: "" };

            // Check if MD exists
            try {
                mdRaw = await fs.readFile(mdPath, "utf-8");
                parsed = matter(mdRaw);
                if (parsed.content && parsed.content.trim() !== "") {
                    hasStory = true;
                }
            } catch (e) {
                // File does not exist yet! We will create it.
            }

            // Only enrich if there is no story body!
            if (hasStory) {
                console.log(`[SKIP] ${baseName} already has a story and metadata.`);
                return;
            }

            console.log(`[ENRICH] Processing ${baseName}...`);

            let imageBuffer;
            try {
                imageBuffer = await fs.readFile(imagePath);
            } catch (e) {
                console.error(`Could not read image file ${imagePath}. Skipping.`);
                return;
            }

            console.log(`[${baseName}] -> Extracting EXIF...`);
            const meta = await extractMetadata(imageBuffer);
            
            console.log(`[${baseName}] -> Fetching AI Story from OpenRouter...`);
            const base64Image = imageBuffer.toString("base64");
            const aiStory = await getOpenRouterStory(base64Image, baseName);

            const newData = { ...parsed.data, ...meta };
            
            // Remove undefined keys to prevent YAML errors
            Object.keys(newData).forEach(k => newData[k] === undefined && delete newData[k]);

            const newMdContent = matter.stringify("\n" + aiStory + "\n", newData);
            
            await fs.writeFile(mdPath, newMdContent);
            console.log(`[DONE] Finished updating ${baseName}.md`);
            
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
