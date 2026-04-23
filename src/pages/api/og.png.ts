import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

export const prerender = true;

export const GET = async () => {
    try {
        const photos = await getCollection("portfolio");

        // Group photos by folder (album)
        const groupedPhotos: Record<string, typeof photos> = {};
        photos.forEach((photo) => {
            const folderParts = photo.id.split("/");
            const folderRaw = folderParts.length > 1 ? folderParts[0] : "Ungrouped";
            const folder = folderRaw.replace(/-/g, " ");
            if (!groupedPhotos[folder]) groupedPhotos[folder] = [];
            groupedPhotos[folder].push(photo);
        });

        const getFolderDate = (folder: string) => {
            const dates = groupedPhotos[folder].map((p) =>
                p.data.date ? new Date(p.data.date).getTime() : 0,
            );
            return Math.max(...dates);
        };

        const sortedFolders = Object.keys(groupedPhotos).sort((a, b) => {
            if (a === "Ungrouped") return 1;
            if (b === "Ungrouped") return -1;
            return getFolderDate(b) - getFolderDate(a);
        });

        sortedFolders.forEach((folder) => {
            groupedPhotos[folder].sort((a, b) => {
                const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
                const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
                return dateB - dateA;
            });
        });

        // Get the 8 latest images (for the 3x3 grid minus center)
        const allSortedPhotos = [...photos].sort((a, b) => {
            const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
            const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
            return dateB - dateA;
        });

        const latestAlbumName =
            sortedFolders.length > 0 && sortedFolders[0] !== "Ungrouped"
                ? sortedFolders[0]
                : "the archive";

        // Use Astro's getImage to produce small JPEG thumbnails at build time.
        // This writes real files to disk and gives us working src paths.
        const latestPhotos = allSortedPhotos.slice(0, 8);
        const thumbnails = await Promise.all(
            latestPhotos.map(async (photo) => {
                const optimized = await getImage({
                    src: photo.data.image,
                    width: 400,
                    height: 210,
                    format: "jpg",
                    quality: 70,
                });
                return optimized.src; // e.g. "/_astro/foo.hash.jpg"
            }),
        );

        // Now read the generated files from disk as base64 data URIs.
        // At prerender time, Astro has already written these into the dist output,
        // but we can also find them via the node_modules/.astro cache or just
        // use sharp directly to produce buffers.
        //
        // Actually the cleanest approach: use sharp to resize the SOURCE images
        // (which definitely exist on disk) into small JPEG buffers, then base64 them.
        const sharp = (await import("sharp")).default;
        const nodeFs = await import("node:fs");
        const nodePath = await import("node:path");

        const imageDataUris: string[] = [];
        for (const photo of latestPhotos) {
            const imgObj = photo.data.image as any;
            // Astro image objects have a `src` like "/_astro/foo.hash.jpg"
            // but the ORIGINAL file path is derived from the content collection id
            // e.g. photo.id = "Around San Diego/silent_mechanisms.jpg" but that's the .md id
            // The image is referenced in frontmatter and Astro resolves it.
            // We need the actual filesystem path. Let's reconstruct it.
            const photoId = photo.id; // e.g. "around-san-diego/silent_mechanisms"
            // The folder in the filesystem uses the original casing with spaces
            // Let's find it by scanning the portfolio directory
            const portfolioDir = nodePath.join(process.cwd(), "src/content/portfolio");
            const folders = nodeFs.readdirSync(portfolioDir);

            let found = false;
            for (const folder of folders) {
                const folderPath = nodePath.join(portfolioDir, folder);
                if (!nodeFs.statSync(folderPath).isDirectory()) continue;
                const files = nodeFs.readdirSync(folderPath);
                // Look for image files that match the photo's basename
                // photo.id is like "around-san-diego/silent_mechanisms"
                const baseName = photoId.split("/").pop()!;
                for (const file of files) {
                    const fileBase = nodePath.parse(file).name;
                    const fileExt = nodePath.parse(file).ext.toLowerCase();
                    if (
                        fileBase === baseName &&
                        [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(fileExt)
                    ) {
                        const fullPath = nodePath.join(folderPath, file);
                        try {
                            const buf = await sharp(fullPath)
                                .resize(400, 210, { fit: "cover" })
                                .jpeg({ quality: 70 })
                                .toBuffer();
                            imageDataUris.push(
                                `data:image/jpeg;base64,${buf.toString("base64")}`,
                            );
                            found = true;
                        } catch (e) {
                            console.error("Sharp resize failed for", fullPath, e);
                        }
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                console.warn("Could not find source image for", photoId);
                imageDataUris.push(""); // empty fallback
            }
        }

        // Colors
        const bgSurface = "#0e0e0e";
        const colorPrimaryContainer = "#cffc00";
        const colorOnSurface = "#ffffff";

        // Build the Satori virtual DOM
        const gridChildren = Array.from({ length: 9 }).map((_, i) => {
            if (i === 4) {
                return {
                    type: "div",
                    props: {
                        style: {
                            width: "386px",
                            height: "196px",
                            backgroundColor: bgSurface,
                        },
                    },
                };
            }

            const imgIndex = i > 4 ? i - 1 : i;
            const dataUri = imageDataUris[imgIndex] || "";

            return {
                type: "div",
                props: {
                    style: {
                        width: "386px",
                        height: "196px",
                        backgroundColor: "#131313",
                        display: "flex",
                        overflow: "hidden",
                    },
                    children: dataUri
                        ? {
                              type: "img",
                              props: {
                                  src: dataUri,
                                  style: {
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                  },
                              },
                          }
                        : null,
                },
            };
        });

        const html = {
            type: "div",
            props: {
                style: {
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    backgroundColor: bgSurface,
                    fontFamily: "sans-serif",
                    position: "relative",
                    overflow: "hidden",
                },
                children: [
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                padding: "10px",
                                opacity: 0.4,
                            },
                            children: gridChildren,
                        },
                    },
                    {
                        type: "div",
                        props: {
                            style: {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                            },
                            children: [
                                {
                                    type: "div",
                                    props: {
                                        style: {
                                            fontSize: "72px",
                                            fontWeight: 800,
                                            fontFamily: '"Playfair Display"',
                                            color: colorOnSurface,
                                            marginBottom: "16px",
                                            letterSpacing: "-0.02em",
                                        },
                                        children: "ANISH PHOTOGRAPHY",
                                    },
                                },
                                {
                                    type: "div",
                                    props: {
                                        style: {
                                            fontSize: "32px",
                                            fontWeight: 400,
                                            fontFamily: '"JetBrains Mono"',
                                            color: colorPrimaryContainer,
                                            letterSpacing: "0.1em",
                                        },
                                        children: latestAlbumName.toUpperCase(),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        };

        // Load fonts
        const [fontPlayfairRes, fontJetBrainsRes] = await Promise.all([
            fetch(
                "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-800-normal.ttf",
            ),
            fetch(
                "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf",
            ),
        ]);
        const fontPlayfair = await fontPlayfairRes.arrayBuffer();
        const fontJetBrains = await fontJetBrainsRes.arrayBuffer();

        // Initialize resvg WASM
        try {
            await initWasm(
                fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"),
            );
        } catch {
            // Already initialized
        }

        const svg = await satori(html as any, {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: "Playfair Display",
                    data: fontPlayfair,
                    weight: 800,
                    style: "normal",
                },
                {
                    name: "JetBrains Mono",
                    data: fontJetBrains,
                    weight: 400,
                    style: "normal",
                },
            ],
        });

        const resvg = new Resvg(svg, {
            fitTo: { mode: "width", value: 1200 },
        });

        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        return new Response(pngBuffer as any, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (e: any) {
        console.error("OG image generation failed:", e);
        return new Response(e.message || "OG generation failed", { status: 500 });
    }
};
