import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({
 base: './',
 plugins: [react(),tsconfigPaths(),VitePWA({
  registerType:'autoUpdate',scope:'./',base:'./',
  workbox:{globPatterns:['**/*.{js,css,html,ico,png,svg,webmanifest,txt}'],navigateFallback:'index.html',cacheId:'mathphysics-sudoku'},
  manifest:{id:'./',lang:'zh',name:'科学小岛 · 数独',short_name:'数独',description:'3014道数独、五档难度与自建题，完整离线游戏。',theme_color:'#315d4b',background_color:'#f5f3e9',display:'standalone',start_url:'./',scope:'./',icons:[{src:'./android-chrome-192x192.png',sizes:'192x192',type:'image/png'},{src:'./android-chrome-512x512.png',sizes:'512x512',type:'image/png'}]},
 })],
});
