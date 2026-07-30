import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vedant.greenguard',
  appName: 'GreenGuard AI',

  // Required even when using server.url
  webDir: 'dist',

  server: {
    url: 'https://gg-ai-woad.vercel.app',
    cleartext: false,
    allowNavigation: [
      'gg-ai-woad.vercel.app',
      '*.vercel.app',
      'gg-ai-11ja.onrender.com',
      '*.onrender.com',
    ],
  },
};

export default config;