import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

const bucketName = process.env.R2_BUCKET_NAME;

async function run() {
    const outDir = path.join(process.cwd(), "src/content/portfolio");

    console.log(`Fetching from bucket: ${bucketName}`);
    const command = new ListObjectsV2Command({ Bucket: bucketName });
    const response = await client.send(command).catch(e => {
        console.error("Failed to connect to R2:", e);
        process.exit(1);
    });
    
    const contents = response.Contents || [];

    for (const item of contents) {
        if (!item.Key) continue;
        if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(item.Key)) continue;

        // E.g. "San Diego Zoo/DSC00035.jpg" -> "San Diego Zoo"
        // If it's just "DSC00035.jpg", folderName is "."
        const folderName = path.dirname(item.Key);
        
        if (folderName === ".") continue; // Top level file, ignore

        const fileName = path.basename(item.Key);
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        
        // Old flat paths
        const oldImagePath = path.join(outDir, fileName);
        const oldMdPath = path.join(outDir, `${baseName}.md`);

        // New folder target
        const targetDir = path.join(outDir, folderName);
        const newImagePath = path.join(targetDir, fileName);
        const newMdPath = path.join(targetDir, `${baseName}.md`);

        // Check if old image path actually exists
        try {
            await fs.access(oldImagePath);
            
            // Create folder
            await fs.mkdir(targetDir, { recursive: true });
            
            console.log(`Moving ${fileName} -> ${folderName}/`);
            await fs.rename(oldImagePath, newImagePath);
            
            // Move markdown if exists
            try {
                await fs.access(oldMdPath);
                await fs.rename(oldMdPath, newMdPath);
            } catch (e) {
                // Ignore missing MD
            }
        } catch (e) {
            // Already moved or doesn't exist
        }
    }
    console.log("Migration and re-organization complete!");
}

run().catch(console.error);
