import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteObfuscateFile } from 'vite-plugin-obfuscator'

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
  plugins: [
    react(),
    viteObfuscateFile({
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.5,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.2,
      stringArray: true,
      stringArrayThreshold: 0.5,
      stringArrayEncoding: ['base64'],
      renameGlobals: false,
      selfDefending: false,
    }),
  ],
})
