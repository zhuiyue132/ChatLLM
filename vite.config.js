/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/vite.config.js
 * @Description  : vite配置
 *
 */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import eslintPlugin from 'vite-plugin-eslint'
import legacy from '@vitejs/plugin-legacy'
import { visualizer } from 'rollup-plugin-visualizer'
import { BASE_URL } from './src/config/app'
import ElementPlus from 'unplugin-element-plus/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const env = loadEnv(mode, process.cwd(), '')
  const webdavProxyTarget = env.VITE_WEBDAV_PROXY_TARGET || 'https://webdav.123pan.cn/webdav'
  const mcpProxyTarget = env.VITE_MCP_PROXY_TARGET || 'http://127.0.0.1:3845'
  return {
    base: BASE_URL,
    envDir: './env',

    plugins: [
      // 生产环境开启浏览器兼容性处理
      ...(isProd ? [legacy({ targets: ['defaults'] })] : []),
      vue(),
      // Bundle 分析工具
      visualizer({
        open: false,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true
      }),

      ElementPlus({ useSource: true }),
      AutoImport({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })]
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })]
      }),
      eslintPlugin({
        include: ['src/**/*.js', 'src/**/*.vue', 'src/*.js', 'src/*.vue'],
        lintOnStart: false,
        emitWarning: false,
        emitError: false,
        failOnWarning: false,
        failOnError: false
      })

      // 20251217 发现问题：
      // 前端的gzip的压缩，在nginx中压根没采用。换句话说，环境中有gzip的压缩，但其实是nginx动态压缩的，而不是采用的前端压缩的产物。
      // 所以，前端这套gzip压缩，除了增加包体积，没有其他作用。
      // 综上，没必要继续留着了。

      // compressPlugin({
      //   verbose: false,
      //   ext: '.gz',
      //   algorithm: 'gzip',
      //   deleteOriginFile: false
      // })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/mixins.scss" as *; @use "@/styles/element-plus/index.scss" as *;`,
          javascriptEnabled: true,
          api: 'modern-compiler'
        }
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@img': fileURLToPath(new URL('./src/assets/images', import.meta.url))
      }
    },
    server: {
      port: 3002,
      open: false,
      cors: true,
      allowedHosts: ['.ecbis.com'],
      proxy: {
        '/webdav': {
          target: webdavProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/webdav/, '')
        },
        '/mcp': {
          target: mcpProxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      // 直接关闭，需要的自行打开
      sourcemap: false,
      ...(isProd
        ? {
            minify: 'terser',
            terserOptions: {
              compress: { drop_console: true, drop_debugger: true }
            }
          }
        : {}),
      //指定生成静态资源的存放路径
      assetsDir: 'static/img/',
      target: ['chrome78', 'safari12'],
      rollupOptions: {
        // 配置CDN 确保外部化处理那些你不想打包进库的依赖
        external: ['echarts'],
        output: {
          // 不同类文件分开打包
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
          globals: { echarts: 'echarts' },
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Vue 核心
              if (
                ['vue', 'vue-router', 'pinia'].some(pkg => id.includes(`/node_modules/${pkg}/`))
              ) {
                return 'vendor-vue'
              }
              // Element Plus UI
              if (id.includes('element-plus') || id.includes('@element-plus')) {
                return 'vendor-element'
              }
              // Markdown 处理
              if (
                ['unified', 'remark', 'rehype', 'mdast', 'hast', 'unist', 'micromark'].some(pkg =>
                  id.includes(pkg)
                )
              ) {
                return 'vendor-markdown'
              }
              // 工具库
              if (['lodash-es', 'dayjs'].some(pkg => id.includes(`/node_modules/${pkg}/`))) {
                return 'vendor-utils'
              }
              // 其他依赖单独分包
              return id.toString().split('node_modules/')[1].split('/')[0].toString()
            }
          }
        }
      }
    }
  }
})
