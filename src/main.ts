import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { useGame } from './stores/game'
import './style.css'

const app = createApp(App).use(createPinia())

// 全域錯誤處理：顯示錯誤畫面而不是整頁卡住，方便玩家回報
function report(err: unknown) {
  console.error(err)
  const g = useGame()
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
  if (!g.fatal) g.fatal = msg.slice(0, 2000)
}
app.config.errorHandler = (err) => report(err)
window.addEventListener('error', (e) => report(e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => report(e.reason))

app.mount('#app')

// 有新版本時由玩家決定何時更新，避免渡劫、戰鬥途中被強制重新整理
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const g = useGame()
    g.updateReady = async () => {
      await g.save()
      await updateSW(true)
    }
  },
})
