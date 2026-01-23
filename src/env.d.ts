/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
    readonly R2_BUCKET_NAME: string;
    readonly R2_ENDPOINT: string;
    readonly R2_ACCESS_KEY_ID: string;
    readonly R2_SECRET_ACCESS_KEY: string;
    readonly R2_PUBLIC_DOMAIN: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
