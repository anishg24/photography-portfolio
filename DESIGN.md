# Design System Strategy: Anish Govind Portfolio

## 1. Overview & Creative North Star: "The Kinetic Engineer"
This design system is built to balance the raw, high-octane energy of high-performance computing with the editorial precision of a world-class health diagnostic. The Creative North Star is **"The Kinetic Engineer."** It represents a visual language that is simultaneously technical and expansive.

Unlike standard portfolios that rely on centered grids and predictable cards, this system utilizes **intentional asymmetry** and **tonal depth**. We break the "template" look by treating the viewport as a tactical HUD (Heads-Up Display). Elements are often offset, overlapping, or anchored to unconventional grid lines to create a sense of forward motion. Large-scale typography serves as both content and architectural texture, ensuring that the "high-performance" personality is felt in every interaction.

## 2. Colors
The palette is rooted in a deep, obsidian foundation with high-visibility accents that mimic tactical displays and futuristic interfaces.

### Core Palette
- **Background (`#0e0e0e`)**: The absolute base. All content emerges from this void.
- **Primary (`#f4ffc8`) & Primary Container (`#cffc00`)**: Our signature "Hyper-Lime." Use this for critical actions and data highlights.
- **Surface Tiers**: 
    - `surface-container-lowest` (`#000000`)
    - `surface-container-low` (`#131313`)
    - `surface-container-high` (`#201f1f`)
    - `surface-container-highest` (`#262626`)

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Visual separation must be achieved through background shifts. For example, a project case study should sit on a `surface-container-low` section, while the main feed rests on the `surface`. This creates a sophisticated, seamless flow rather than a boxed-in layout.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested tactical layers. An inner card component should use a tier one step higher or lower than its parent container (e.g., a `surface-container-highest` card placed inside a `surface-container-low` section). This creates depth through value contrast rather than artificial styling.

### The "Glass & Gradient" Rule
To add soul to the technicality, use subtle gradients for CTAs transitioning from `primary` to `primary-container`. For floating navigational elements or tactical overlays, employ **Glassmorphism**: use `surface` colors at 60-80% opacity with a `backdrop-blur` of 20px-40px.

## 3. Typography
The typography strategy pairs technical modernism with clean, humanistic readability.

- **Display & Headlines (`Space Grotesk`)**: This is the "Technical" voice. Its wide apertures and geometric construction feel like code headers or futuristic signage. Use `display-lg` (3.5rem) for hero statements to command immediate authority.
- **Body & Titles (`Manrope`)**: This is the "Professional" voice. Manrope provides the airiness and elegance required for long-form reading of technical projects. 
- **Labels (`Space Grotesk`)**: Use `label-md` and `label-sm` in uppercase with letter-spacing (+5% to +10%) for "data-driven" moments, like dates, categories, or technical specs.

## 4. Elevation & Depth
In this system, elevation is a product of light and layering, not shadows.

- **Tonal Layering:** Depth is achieved by stacking surface tokens. Higher-importance content sits on lighter surfaces (`surface-container-highest`), while background information recedes into `surface-container-lowest`.
- **Ambient Shadows:** Standard drop shadows are forbidden. If a floating effect is required (e.g., a modal), use a shadow with a 60px-100px blur at 5% opacity, using a tinted color derived from `on-surface` to simulate light dispersion in a dark environment.
- **The "Ghost Border" Fallback:** For interactive states or accessibility, use a "Ghost Border." This is a 1px stroke using the `outline-variant` token at **15% opacity**. It should be felt, not seen.
- **Geometric Sharpening:** Set all corner radii to `0px`. This design system rejects "soft" corners in favor of the precision and brutalism seen in high-end hardware and technical instrumentation.

## 5. Components

### Buttons
- **Primary**: Solid `primary-container` background with `on-primary-container` text. High-contrast, no border, sharp 0px corners.
- **Secondary**: Ghost style. `outline` stroke at 20% opacity. On hover, fills to 100% `secondary-container`.
- **Tertiary**: Text-only using `label-md` in `primary` color with a custom "bracket" icon (e.g., `[ Explore ]`).

### Chips
- **Technical Chips**: Used for skills (e.g., "Verilog", "CUDA"). Use `surface-container-high` background with `label-sm` text. No borders. Use the `spacing-1` for vertical and `spacing-3` for horizontal padding.

### Input Fields
- Underline-only style. Use `outline-variant` for the base state and `primary` for the active focus state. Helper text must be in `label-sm`.

### Cards & Projects
- **Forbid Dividers:** Do not use lines to separate projects. Use `spacing-16` or `spacing-20` to create massive "breathing room" between entries.
- **Asymmetric Layout:** Place the project title (Headline-LG) on the left of the grid and the technical specs (Labels) on the right, leaving a deliberate "void" in the middle of the container to mimic high-end editorial layouts.

### Additional Component: "The Data Ribbon"
A scrolling ticker or static bar using `primary-container` background with `on-primary-fixed-variant` text. Use this for "Current Status" or "Latest Tech Stack" to add a sense of real-time performance.

## 6. Do's and Don'ts

### Do:
- Use **massive spacing** (`spacing-24`) to separate major narrative shifts.
- Use **Hyper-Lime (`#cffc00`)** sparingly—only for the most important interactive elements.
- Lean into **vertical typography**. Rotated labels (90 degrees) can be used for section markers to break the horizontal flow.
- Ensure all images/project screenshots use a subtle **grayscale or high-contrast filter** to maintain the "Kinetic Engineer" aesthetic.

### Don't:
- **Never use rounded corners.** Everything must be strictly geometric (`0px`).
- **Do not use 100% white for body text.** Use `on-surface-variant` (`#adaaaa`) for body text to reduce eye strain against the black background, reserving `on-surface` (`#ffffff`) for headlines.
- **Avoid "The Grid" trap.** Don't center-align everything. If an image is on the right, try placing the caption far-left, off-axis.
- **No divider lines.** If you feel the need for a line, increase the spacing by 2x instead.
