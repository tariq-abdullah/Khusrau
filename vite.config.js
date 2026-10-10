import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({server:{watch:{ignored:['**/research/**','**/scripts/**','**/examples/**']}},plugins:[vue(),VitePWA({registerType:'prompt',manifest:{name:'inpage.net Urdu Publisher',short_name:'inpage.net',description:'Urdu publishing workspace',theme_color:'#d4d0c8',background_color:'#ffffff',display:'standalone',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]},workbox:{maximumFileSizeToCacheInBytes:10000000,globPatterns:['**/*.{js,css,html,svg,png,woff,woff2,ttf,otf}']}})]})


