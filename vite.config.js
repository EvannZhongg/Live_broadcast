import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      entry: 'electron/main.js', // 告诉 Vite 入口在哪里
    }),
    renderer(), // 让 Vue 组件内可以直接使用 ipcRenderer
  ],
})