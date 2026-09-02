import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://kushumpoudel.com.np',
  output: 'static',
  integrations: [sitemap(), mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
