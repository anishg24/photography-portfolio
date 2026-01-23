# Anish Photography Portfolio

A high-performance, dark-themed photography portfolio built with Astro and powered by Cloudflare R2. This project features a modern, grid-based layout with deep metadata extraction and a seamless lightbox experience.

## 🚀 Key Features

- **Astro 5.0**: Leverages the latest Astro features for optimal performance.
- **Cloudflare R2**: Hosted images on Cloudflare's object storage for scalability and low latency.
- **Dynamic Collection**: Images are automatically fetched and grouped by folder using a custom R2 loader.
- **Rich Metadata**: Displays Camera, Lens, ISO, Shutter Speed, and Aperture extracted from EXIF data.
- **Responsive Design**: Tailored experiences for mobile (horizontal ticker) and desktop (vertical sidebar).
- **Masonry Grid**: Beautifully organized image layouts.

## 🛠️ Development

### Prerequisites

- [pnpm](https://pnpm.io/) installed.
- Cloudflare R2 bucket with images.

### Setup

1.  Clone the repository.
2.  Install dependencies:
    ```sh
    pnpm install
    ```
3.  Configure environment variables (copy `.env.example` to `.env`):
    ```env
    R2_ACCOUNT_ID=your_account_id
    R2_ACCESS_KEY_ID=your_access_key
    R2_SECRET_ACCESS_KEY=your_secret_key
    R2_BUCKET_NAME=your_bucket_name
    R2_PUBLIC_URL=your_public_url
    ```
4.  Run local development server:
    ```sh
    pnpm dev
    ```

## ☁️ Hosting on Cloudflare Pages

This project is optimized for deployment on **Cloudflare Pages**.

### 1. Connect to GitHub
Connect your repository to Cloudflare Pages via the Cloudflare Dashboard (**Workers & Pages > Create application > Pages > Connect to Git**).

### 2. Configure Build Settings
Set the following build settings:
- **Framework preset**: `Astro`
- **Build command**: `pnpm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

### 3. Environment Variables
Add the R2 environment variables mentioned in the Setup section to your Pages project settings (**Settings > Variables and Secrets**).

### 4. Custom Domains (Optional)
Configure your custom domain in the **Custom domains** tab of your Pages project.

## 🧞 Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `pnpm install`    | Installs dependencies                        |
| `pnpm dev`        | Starts local dev server at `localhost:4321`  |
| `pnpm build`      | Build your production site to `./dist/`      |
| `pnpm preview`    | Preview your build locally                   |
| `pnpm astro check`| Run type checks                              |

---

Built with ❤️ using [Astro](https://astro.build).
