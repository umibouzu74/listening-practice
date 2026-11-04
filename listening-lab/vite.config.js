import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = fileURLToPath(new URL('./src/data', import.meta.url))
const VIRTUAL_ID = 'virtual:exam-index'
const RESOLVED_ID = '\0' + VIRTUAL_ID

/**
 * src/data/{examType}/*.json から一覧表示用の軽い目次（問題本文を含まない）を作る。
 * 問題本文は回ごとに別チャンクとして、演習画面を開いたときに読み込む。
 */
function buildExamIndex() {
  const index = []
  for (const dir of readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    for (const file of readdirSync(join(DATA_DIR, dir.name))) {
      if (!file.endsWith('.json')) continue
      let data
      try {
        data = JSON.parse(readFileSync(join(DATA_DIR, dir.name, file), 'utf-8'))
      } catch {
        continue // 構文エラーは npm run validate で検出する
      }
      if (!data?.examType || !data.id || !Array.isArray(data.sections)) continue
      index.push({
        path: `./${dir.name}/${file}`,
        examType: data.examType,
        id: data.id,
        meta: data.meta || {},
        instructions: data.instructions,
        sections: data.sections.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          description: s.description,
          playCount: s.playCount,
          questionCount: s.questions?.length || 0,
        })),
      })
    }
  }
  return index
}

function examIndexPlugin() {
  return {
    name: 'exam-index',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) return `export default ${JSON.stringify(buildExamIndex())}`
    },
    configureServer(server) {
      // データの追加・変更・削除で目次を作り直してリロード
      const onChange = (file) => {
        if (!file.startsWith(DATA_DIR + sep) || !file.endsWith('.json')) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), examIndexPlugin()],
  base: command === 'serve' ? '/' : '/listening-practice/',
}))
