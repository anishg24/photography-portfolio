import { defineCollection } from "astro:content";
import { r2Loader } from "../loaders/r2-loader";
import {
    R2_BUCKET_NAME,
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_PUBLIC_DOMAIN,
} from "astro:env/server";

const photos = defineCollection({
    loader: r2Loader({
        bucket: R2_BUCKET_NAME,
        endpoint: R2_ENDPOINT,
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        publicDomain: R2_PUBLIC_DOMAIN,
    }),
});

export const collections = {
    photos,
};
