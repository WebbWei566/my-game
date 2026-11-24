import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { useGame } from './stores/game'
import './style.css'

const app = createApp(App).use(createPinia())
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
