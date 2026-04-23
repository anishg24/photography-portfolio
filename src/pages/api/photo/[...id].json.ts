import { getCollection } from "astro:content";

export const prerender = true;

export async function getStaticPaths() {
    const photos = await getCollection("portfolio");
    return photos.map(photo => ({
        params: { id: photo.id },
        props: { body: photo.body },
    }));
}

export async function GET({ props }: { props: any }) {
    return new Response(JSON.stringify({ body: props.body }), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
