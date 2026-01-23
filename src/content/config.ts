import { defineCollection } from "astro:content";
import { r2Loader } from "../loaders/r2-loader";

const photos = defineCollection({
    loader: r2Loader({
        bucket: import.meta.env.R2_BUCKET_NAME,
        endpoint: import.meta.env.R2_ENDPOINT,
        accessKeyId: import.meta.env.R2_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY,
        publicDomain: import.meta.env.R2_PUBLIC_DOMAIN,
    }),
});

export const collections = {
    photos,
};
