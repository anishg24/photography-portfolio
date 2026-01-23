import { defineCollection } from "astro:content";
import { r2Loader } from "../loaders/r2-loader";

const photos = defineCollection({
    loader: r2Loader({
        bucket: process.env.R2_BUCKET_NAME ?? "",
        endpoint: process.env.R2_ENDPOINT ?? "",
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        publicDomain: process.env.R2_PUBLIC_DOMAIN ?? "",
    }),
});

export const collections = {
    photos,
};
