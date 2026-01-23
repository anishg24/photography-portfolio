import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_DOMAIN
} = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    define: {
      'process.env.R2_BUCKET_NAME': JSON.stringify(R2_BUCKET_NAME || ""),
      'process.env.R2_ENDPOINT': JSON.stringify(R2_ENDPOINT || ""),
      'process.env.R2_ACCESS_KEY_ID': JSON.stringify(R2_ACCESS_KEY_ID || ""),
      'process.env.R2_SECRET_ACCESS_KEY': JSON.stringify(R2_SECRET_ACCESS_KEY || ""),
      'process.env.R2_PUBLIC_DOMAIN': JSON.stringify(R2_PUBLIC_DOMAIN || ""),
    }
  },

  image: {
    domains: ["r2.photos.govind.cc", "placehold.co"],
  },

  adapter: cloudflare({
    imageService: "compile",
  })
});