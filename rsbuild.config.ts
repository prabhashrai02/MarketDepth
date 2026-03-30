import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  resolve: {
    alias: {
      '@': './src',
      '@/components': './src/components',
      '@/features': './src/features',
      '@/services': './src/services',
      '@/types': './src/types',
      '@/utils': './src/utils',
      '@/constants': './src/constants',
      '@/contexts': './src/contexts',
      '@/styles': './src/styles',
    },
  },
});
