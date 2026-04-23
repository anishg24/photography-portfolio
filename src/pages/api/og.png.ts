import { getCollection } from "astro:content";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import fs from "fs/promises";
import path from "path";

export const prerender = true;

const findLocalImage = async (urlPath: string) => {
    // Satori needs raw bas64 data urls or ArrayBuffers if it cannot directly fetch
    // During typical Astro SSG, things mapped to `/_astro/file.hash.avif` don't physically exist 
    // on a live localhost server if we haven't written them out yet.
    // So we will try to look up the original from the source content map!
    return null;
}

export const GET = async ({ request, url }: { request: Request, url: URL }) => {
	try {
        const origin = url.origin || "http://localhost:4321";

        const photos = await getCollection("portfolio");

        // Group photos by folder (album) instead of year
        const groupedPhotos: Record<string, typeof photos> = {};

        photos.forEach((photo) => {
            const folderParts = photo.id.split("/");
            const folderRaw = folderParts.length > 1 ? folderParts[0] : "Ungrouped";
            const folder = folderRaw.replace(/-/g, ' ');

            if (!groupedPhotos[folder]) {
                groupedPhotos[folder] = [];
            }
            groupedPhotos[folder].push(photo);
        });

        const getFolderDate = (folder: string) => {
            const dates = groupedPhotos[folder].map(p => p.data.date ? new Date(p.data.date).getTime() : 0);
            return Math.max(...dates);
        };

        const sortedFolders = Object.keys(groupedPhotos).sort((a, b) => {
            if (a === "Ungrouped") return 1;
            if (b === "Ungrouped") return -1;
            return getFolderDate(b) - getFolderDate(a);
        });

        sortedFolders.forEach((folder) => {
            groupedPhotos[folder].sort(
                (a, b) => {
                    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
                    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
                    return dateB - dateA;
                }
            );
        });

        // Get the latest images overall
        const allSortedPhotos = photos.sort((a, b) => {
            const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
            const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
            return dateB - dateA;
        });

        // Use standard Astro image resolution logic if hosted on R2
        // We'll extract image paths and apply Cloudflare scaling, similar to ReactGallery prep
        
        // Let's just use the raw image URLs and let Satori scale them.
        const latestImages = allSortedPhotos.slice(0, 9).map(p => p.data.image);
        const latestAlbumName = sortedFolders.length > 0 && sortedFolders[0] !== "Ungrouped" ? sortedFolders[0] : "the archive";

        // Colors based on global.css
        const bgSurface = "#0e0e0e";
        const colorPrimaryContainer = "#cffc00";
        const colorOnSurface = "#ffffff";

        // Setup HTML for Satori
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
                    // Grid of 9 images (3x3), max 8 used, center is empty
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
                            children: Array.from({ length: 9 }).map((_, i) => {
                                // Empty center
                                if (i === 4) {
                                    return {
                                        type: "div",
                                        props: {
                                            style: {
                                                width: "386px",
                                                height: "196px",
                                                backgroundColor: bgSurface,
                                            }
                                        }
                                    };
                                }

                                const imgIndex = i > 4 ? i - 1 : i;
                                const imgUrlRaw = latestImages[imgIndex];
                                
                                // Instead of letting Satori blindly fetch (which fails on prerender because 
                                // the image isn't optimized or served locally until post-build),
                                // we will just pass Satori the actual local base64 data string from the raw image!
                                
                                let imgBase64Pattern = imgUrlRaw;
                                
                                // If it's a content collection object, that raw file exists in process.cwd().
                                if (imgUrlRaw && typeof imgUrlRaw === 'object') {
                                    const rawSrc = (imgUrlRaw as any).src; // something like /_astro/...
                                    // Satori supports background-image data uris nicely.
                                    // To make this work dynamically without a complex resolver, we'll try to guess 
                                    // its source. Actually, Astro exposes the raw OS path in `fsPath` during dev/build!
                                    const fsPath = (imgUrlRaw as any).fsPath;
                                    
                                    if (fsPath) {
                                        try {
                                            // Make sure we just use synchronous fs reads for Satori to prevent nested async issues inside Array.map
                                            const buf = require("fs").readFileSync(fsPath);
                                            const ext = fsPath.split('.').pop() || 'jpg';
                                            imgUrl = `data:image/${ext};base64,${buf.toString('base64')}`;
                                        } catch (e) {
                                            console.log("Could not read fsPath", fsPath);
                                        }
                                    }
                                }

                                return {
                                    type: "div",
                                    props: {
                                        style: {
                                            width: "386px",
                                            height: "196px",
                                            backgroundColor: "#131313", // fallback
                                            display: "flex",
                                            overflow: "hidden",
                                        },
                                        children: imgUrl ? {
                                            type: "img",
                                            props: {
                                                src: imgUrl,
                                                style: {
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }
                                            }
                                        } : null
                                    }
                                };
                            })
                        }
                    },
                    // Text Overlay
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
                                        children: "ANISH PHOTOGRAPHY"
                                    }
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
                                            textTransform: "uppercase",
                                        },
                                        children: latestAlbumName.toUpperCase()
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        };

        // NOTE: Actually deploying to Cloudflare implies using an Edge-compatible Resvg library 
        // or a remote API. For Satori we need a font face.
        
        const [fontPlayfair, fontJetBrains] = await Promise.all([
            fetch("https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-800-normal.ttf").then((res) => {
                if (!res.ok) throw new Error("Failed to fetch Playfair Display");
                return res.arrayBuffer();
            }),
            fetch("https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf").then((res) => {
                if (!res.ok) throw new Error("Failed to fetch JetBrains Mono");
                return res.arrayBuffer();
            })
        ]);

        // Initialize WASM
        try {
            // Because we set `prerender = true`, Astro executes this script at BUILD time inside Node.js
            // rather than at request time on Cloudflare's Edge. Node.js has no problem with fetching
            // and instantiating WASM modules dynamically from a URL.
            await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
        } catch (e) {
            console.error("WASM init error:", e);
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
			fitTo: {
				mode: "width",
				value: 1200,
			},
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
		return new Response(e.message, { status: 500 });
	}
};
