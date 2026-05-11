import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Familien-Essensplaner',
    short_name: 'Essensplan',
    description: 'Wöchentlicher Essensplan für die Familie',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f8f3',
    theme_color: '#4d7c4a',
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
