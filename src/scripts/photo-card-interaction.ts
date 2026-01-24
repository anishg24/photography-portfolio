const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const unscrambleText = (element: HTMLElement) => {
    const originalText = element.getAttribute("data-real-value");
    if (!originalText) return;

    let iterations = 0;
    const interval = setInterval(() => {
        element.innerText = originalText
            .split("")
            .map((char, index) => {
                if (index < iterations) {
                    return originalText[index];
                }
                return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join("");

        if (iterations >= originalText.length) {
            clearInterval(interval);
            element.innerText = originalText;
        }

        iterations += 1 / 3;
    }, 30);
};

export const initCards = () => {
    // Scramble Logic
    document
        .querySelectorAll(".photo-card-wrapper")
        .forEach((cardWrapper) => {
            const wrapper = cardWrapper as HTMLElement;
            const filenameEl = wrapper.querySelector(
                ".filename-scramble",
            ) as HTMLElement;

            if (filenameEl) {
                const onMouseEnter = () => {
                    unscrambleText(filenameEl);
                    wrapper.removeEventListener("mouseenter", onMouseEnter);
                };
                wrapper.addEventListener("mouseenter", onMouseEnter);
            }
        });

    // Loupe & HUD Logic
    document
        .querySelectorAll(".photo-card-wrapper")
        .forEach((cardWrapper) => {
            if (cardWrapper.hasAttribute("data-loupe-init")) return;
            cardWrapper.setAttribute("data-loupe-init", "true");

            const wrapper = cardWrapper as HTMLElement;
            const link = wrapper.querySelector("a");
            const img = wrapper.querySelector("div.z-0 img");
            const loupeContainer = wrapper.querySelector(
                ".loupe-container",
            ) as HTMLElement;
            const loupeImg = loupeContainer?.querySelector(
                "img",
            ) as HTMLImageElement;
            const hud = wrapper.querySelector(".hud-overlay");

            if (!link || !img || !loupeContainer || !loupeImg) return;

            let isShiftPressed = false;
            let zoomLevel = 1;
            let lastX = 0;
            let lastY = 0;

            // Touch interaction state
            let isTouchInteraction = false;
            link.addEventListener(
                "touchstart",
                () => {
                    isTouchInteraction = true;
                },
                { passive: true },
            );

            const checkShift = (e: KeyboardEvent) => {
                isShiftPressed = e.shiftKey;
                if (!isShiftPressed) {
                    loupeContainer.style.display = "none";
                    link.style.cursor = "crosshair";
                } else if (link.matches(":hover")) {
                    link.style.cursor = "none";
                }
            };

            window.addEventListener("keydown", checkShift);
            window.addEventListener("keyup", checkShift);

            link.addEventListener("mousemove", (e) => {
                // Cast e to MouseEvent explicitly if needed, but standard listener usually infers
                const mouseEvent = e as MouseEvent;

                if (!mouseEvent.shiftKey) {
                    loupeContainer.style.display = "none";
                    link.style.cursor = "crosshair";
                    return;
                }

                if (!loupeImg.src) {
                    loupeImg.src = loupeImg.getAttribute("data-src") || "";
                }

                loupeContainer.style.display = "block";
                link.style.cursor = "none";

                loupeContainer.style.left = `${mouseEvent.clientX}px`;
                loupeContainer.style.top = `${mouseEvent.clientY}px`;

                const rect = img.getBoundingClientRect();
                const x = mouseEvent.clientX - rect.left;
                const y = mouseEvent.clientY - rect.top;

                lastX = x / rect.width;
                lastY = y / rect.height;

                const realWidth = parseInt(
                    link.dataset.pswpWidth || "2500",
                );
                const realHeight = parseInt(
                    link.dataset.pswpHeight || "1667",
                );

                loupeImg.style.width = `${realWidth * zoomLevel}px`;
                loupeImg.style.height = `${realHeight * zoomLevel}px`;

                loupeImg.style.left = `-${lastX * realWidth * zoomLevel - 128}px`;
                loupeImg.style.top = `-${lastY * realHeight * zoomLevel - 128}px`;
            });

            link.addEventListener(
                "wheel",
                (e) => {
                    if (!isShiftPressed) return;
                    e.preventDefault();

                    const delta = -Math.sign(e.deltaY) * 0.5;
                    zoomLevel = Math.max(1, Math.min(5, zoomLevel + delta));

                    if (loupeContainer.style.display !== "none") {
                        const realWidth = parseInt(
                            link.dataset.pswpWidth || "2500",
                        );
                        const realHeight = parseInt(
                            link.dataset.pswpHeight || "1667",
                        );

                        loupeImg.style.width = `${realWidth * zoomLevel}px`;
                        loupeImg.style.height = `${realHeight * zoomLevel}px`;

                        loupeImg.style.left = `-${lastX * realWidth * zoomLevel - 128}px`;
                        loupeImg.style.top = `-${lastY * realHeight * zoomLevel - 128}px`;
                    }
                },
                { passive: false },
            );

            link.addEventListener("mouseleave", () => {
                loupeContainer.style.display = "none";
            });

            link.addEventListener(
                "click",
                (e) => {
                    const mouseEvent = e as MouseEvent;
                    if (mouseEvent.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    // Mobile "Tap to Peek" Logic
                    if (isTouchInteraction) {
                        const isActive =
                            wrapper.classList.contains("mobile-active");

                        if (!isActive) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            wrapper.classList.add("mobile-active");
                            // Fallback for styling
                            if (hud)
                                (hud as HTMLElement).style.opacity = "1";
                        }
                        // If active, let event bubble to PhotoSwipe
                    }
                },
                true,
            );
        });
};
