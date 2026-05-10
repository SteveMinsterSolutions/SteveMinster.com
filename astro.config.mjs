import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://steveminster.com',
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), react()],
});
