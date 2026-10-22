import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://steveminster.com',
  output: 'static',
  adapter: vercel(),
  integrations: [tailwind(), react()],
  redirects: {
    // Short link for the Bandits group text. 302 so it can be repointed after the season.
    '/bandits': { status: 302, destination: '/sandbox/bandits' },
  },
});
