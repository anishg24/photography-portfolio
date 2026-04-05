import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/portfolio" }),
    schema: ({ image }) => z.object({
        image: image(),
        title: z.string().optional(),
        date: z.string().optional(),
        camera: z.string().optional(),
        lens: z.string().optional(),
        aperture: z.string().optional(),
        shutter: z.string().optional(),
        iso: z.string().optional(),
    }),
});

export const collections = {
    portfolio,
};
