import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
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
    await fs.mkdir(outDir, { recursive: true });

    console.log(`Fetching from bucket: ${bucketName}`);
    const command = new ListObjectsV2Command({ Bucket: bucketName });
    const response = await client.send(command);
    const contents = response.Contents || [];

    for (const item of contents) {
        if (!item.Key) continue;
        if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(item.Key)) continue;

        const fileName = path.basename(item.Key);
        const imagePath = path.join(outDir, fileName);
        
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        const mdPath = path.join(outDir, `${baseName}.md`);
        
        console.log(`Downloading ${item.Key} -> ${imagePath}`);
        
        const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: item.Key,
        });

        const objectData = await client.send(getCommand);
        if (objectData.Body) {
            const byteArray = await objectData.Body.transformToByteArray();
            await fs.writeFile(imagePath, Buffer.from(byteArray));
            
            // Try to fetch EXIF to dump into Markdown maybe? 
            // We can just dump a minimal markdown for now and let the `enrich` script handle the rest!
            const mdContent = `---
image: "./${fileName}"
title: "${baseName}"
---
`;
            
            try { await fs.access(mdPath); } 
            catch { await fs.writeFile(mdPath, mdContent); }
        }
    }
    console.log("Migration complete!");
}

run().catch(console.error);
