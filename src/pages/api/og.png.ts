import { getCollection } from "astro:content";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

export const prerender = false;

export const GET = async ({ request }: { request: Request }) => {
	try {
        const url = new URL(request.url);
        const origin = url.origin;

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
                                
                                // Ensure the image URL is absolute for Satori
                                let imgUrl = imgUrlRaw;
                                if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('/')) {
                                    imgUrl = `${origin}${imgUrl}`;
                                } else if (imgUrl && typeof imgUrl === 'object') {
                                    // If Astro provides an object (from local import or image optimization)
                                    let src = (imgUrl as any).src;
                                    if (src.startsWith('/')) {
                                        imgUrl = `${origin}${src}`;
                                    } else {
                                        imgUrl = src;
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
            await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
        } catch (e) {
            // May already be initialized in dev mode
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
