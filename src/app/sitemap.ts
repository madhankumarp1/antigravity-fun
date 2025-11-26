import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://antigravity.fun',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://antigravity.fun/video',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
    ];
}
