import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      R2_BUCKET_NAME: envField.string({ context: 'server', access: 'secret' }),
      R2_ENDPOINT: envField.string({ context: 'server', access: 'secret' }),
      R2_ACCESS_KEY_ID: envField.string({ context: 'server', access: 'secret' }),
      R2_SECRET_ACCESS_KEY: envField.string({ context: 'server', access: 'secret' }),
      R2_PUBLIC_DOMAIN: envField.string({ context: 'server', access: 'secret' }),
    }
  },
  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    domains: ["r2.photos.govind.cc", "placehold.co"],
  },

  adapter: cloudflare({
    imageService: "compile",
  })
});