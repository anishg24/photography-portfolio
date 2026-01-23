import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [, , inputDir, outputDir] = process.argv;

if (!inputDir || !outputDir) {
    console.error('Usage: node scripts/resize-images.js <input_dir> <output_dir>');
    process.exit(1);
}

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif']);
const MAX_WIDTH = 2500;

async function resizeImages() {
    try {
        await fs.mkdir(outputDir, { recursive: true });

        const files = await fs.readdir(inputDir);

        console.log(`Processing images from ${inputDir} to ${outputDir}...`);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

            const inputPath = path.join(inputDir, file);
            const outputPath = path.join(outputDir, file);

            console.log(`Optimizing: ${file}`);

            await sharp(inputPath)
                .resize({ width: MAX_WIDTH, withoutEnlargement: true })
                .withMetadata() // Preserve EXIF data (crucial for photography portfolios)
                .toFile(outputPath);
        }

        console.log('✅ Optimization complete!');
    } catch (error) {
        console.error('Error processing images:', error);
    }
}

resizeImages();
