import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import exifr from 'exifr';

export interface R2LoaderConfig {
    bucket: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicDomain: string;
}

export const r2Schema = z.object({
    key: z.string(),
    url: z.string(),
    size: z.number(),
    lastModified: z.date(),
    dateTaken: z.date(),
    width: z.number().optional(),
    height: z.number().optional(),
    etag: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    fNumber: z.number().optional(),
    iso: z.number().optional(),
    exposureTime: z.number().optional(),
    lensModel: z.string().optional(),
    focalLength: z.number().optional(),
});

export type R2Image = z.infer<typeof r2Schema>;

// Helper to extract metadata from buffer
async function extractMetadata(buffer: Buffer) {
    try {
        const metadata = await exifr.parse(buffer, {
            pick: [
                'DateTimeOriginal', 'CreateDate', 'DateCreated',
                'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
                'Make', 'Model', 'FNumber', 'ISO', 'ExposureTime', 'LensModel', 'FocalLength', 'FocalLengthIn35mmFormat'
            ],
            // translateValues: true, // Let exifr process values (e.g. Ratios to numbers)
        });

        if (!metadata) return null;

        // Date extraction
        let dateTaken: Date | null = null;
        const date = metadata.DateTimeOriginal || metadata.CreateDate || metadata.DateCreated;

        if (date instanceof Date && !isNaN(date.getTime())) {
            dateTaken = date;
        } else if (typeof date === 'string') {
            const parts = date.split(/[:\s]/);
            if (parts.length >= 6) {
                dateTaken = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}`);
            }
        }

        // Helper to safely parse numbers from strings/numbers
        const parseNum = (val: any) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val);
            return undefined;
        };

        // Dimension extraction
        const width = parseNum(metadata.ImageWidth) || parseNum(metadata.ExifImageWidth) || undefined;
        const height = parseNum(metadata.ImageHeight) || parseNum(metadata.ExifImageHeight) || undefined;

        // Prefer 35mm equivalent if available, otherwise standard focal length
        const focalLength = parseNum(metadata.FocalLength) || parseNum(metadata.FocalLengthIn35mmFormat) || undefined;

        return {
            dateTaken,
            width,
            height,
            make: metadata.Make,
            model: metadata.Model,
            fNumber: parseNum(metadata.FNumber),
            iso: parseNum(metadata.ISO),
            exposureTime: parseNum(metadata.ExposureTime),
            lensModel: metadata.LensModel,
            focalLength: focalLength,
        };
    } catch (e) {
        // console.warn("Failed to parse EXIF", e);
        return null;
    }
}

export function r2Loader(config: R2LoaderConfig): Loader {
    return {
        name: "r2-loader",
        load: async (context: LoaderContext) => {
            // Check for missing credentials and provide mock data in DEV mode
            if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
                if (import.meta.env.DEV) {
                    context.logger.warn("R2 Credentials missing. Using mock data for development.");
                    const mockImages = [
                        { key: "Nature/forest.jpg", size: 1024 * 500, lastModified: new Date('2023-01-15'), width: 800, height: 600 },
                        { key: "Nature/mountains.jpg", size: 1024 * 800, lastModified: new Date('2023-01-16'), width: 1200, height: 800 },
                        { key: "Cities/tokyo.jpg", size: 1024 * 300, lastModified: new Date('2022-11-01'), width: 600, height: 400 },
                    ];
                    for (const item of mockImages) {
                        const url = `https://placehold.co/${item.width}x${item.height}?text=${item.key.split('/').pop()}`;
                        await context.store.set({
                            id: item.key,
                            data: {
                                key: item.key,
                                url,
                                size: item.size,
                                lastModified: item.lastModified,
                                dateTaken: item.lastModified, // fallback for mock
                                width: item.width,
                                height: item.height,
                            },
                        });
                    }
                    return;
                } else {
                    const missing = [];
                    if (!config.bucket) missing.push("R2_BUCKET_NAME");
                    if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
                    if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");

                    context.logger.error(`R2 Credentials missing in production build: ${missing.join(", ")}`);
                    throw new Error(`Missing R2 Credentials: ${missing.join(", ")}`);
                }
            }

            const client = new S3Client({
                region: "auto",
                endpoint: config.endpoint,
                credentials: {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                },
            });

            // Get existing keys in store to handle deletions later
            const existingKeys = new Set<string>();
            for (const [id] of context.store.entries()) {
                existingKeys.add(id);
            }

            const command = new ListObjectsV2Command({
                Bucket: config.bucket,
            });

            try {
                const response = await client.send(command);
                const contents = response.Contents || [];

                context.logger.info(`Found ${contents.length} images in R2 bucket`);

                const bucketKeys = new Set<string>();

                // Process images
                const promises = contents.map(async (item) => {
                    if (!item.Key) return;
                    if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(item.Key)) return;

                    const id = item.Key; // Use the file path/key as the ID
                    bucketKeys.add(id);

                    const url = `${config.publicDomain}/${item.Key}`;
                    const lastModified = item.LastModified || new Date();
                    const etag = item.ETag?.replace(/"/g, "");

                    // Check if we already have this item and if it has changed
                    const existing = context.store.get(id);
                    if (existing && existing.data.etag === etag) {
                        return; // Skip re-fetching metadata for unchanged files
                    }

                    let dateTaken = lastModified;
                    let width: number | undefined;
                    let height: number | undefined;
                    let make: string | undefined;
                    let model: string | undefined;
                    let fNumber: number | undefined;
                    let iso: number | undefined;
                    let exposureTime: number | undefined;
                    let lensModel: string | undefined;
                    let focalLength: number | undefined;

                    try {
                        context.logger.info(`Fetching metadata for ${item.Key}...`);
                        // Fetch first 64KB for header/EXIF
                        const getCommand = new GetObjectCommand({
                            Bucket: config.bucket,
                            Key: item.Key,
                            Range: "bytes=0-65535"
                        });

                        const objectData = await client.send(getCommand);
                        if (objectData.Body) {
                            const byteArray = await objectData.Body.transformToByteArray();
                            const metadata = await extractMetadata(Buffer.from(byteArray));
                            if (metadata) {
                                if (metadata.dateTaken) dateTaken = metadata.dateTaken;
                                width = metadata.width;
                                height = metadata.height;
                                make = metadata.make;
                                model = metadata.model;
                                fNumber = metadata.fNumber;
                                iso = metadata.iso;
                                exposureTime = metadata.exposureTime;
                                lensModel = metadata.lensModel;
                                focalLength = metadata.focalLength;
                            }
                        }
                    } catch (err) {
                        context.logger.warn(`Failed to fetch metadata for ${item.Key}: ${err}`);
                    }

                    context.store.set({
                        id,
                        data: {
                            key: item.Key,
                            url,
                            size: item.Size || 0,
                            lastModified,
                            dateTaken,
                            width,
                            height,
                            etag,
                            make,
                            model,
                            fNumber,
                            iso,
                            exposureTime,
                            lensModel,
                            focalLength,
                        },
                    });
                });

                await Promise.all(promises);

                // Delete items that are no longer in the bucket
                for (const key of existingKeys) {
                    if (!bucketKeys.has(key)) {
                        context.logger.info(`Removing deleted file from store: ${key}`);
                        context.store.delete(key);
                    }
                }

            } catch (error) {
                context.logger.error(`Error loading from R2: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        },
        schema: r2Schema,
    };
}
