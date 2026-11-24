<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Android/Chrome：攔截 beforeinstallprompt，iOS：顯示「加入主畫面」教學
const deferred = ref<any>(null)
const showIosGuide = ref(false)
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const visible = ref(!isStandalone && isIos)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred.value = e
    visible.value = true
  })
  window.addEventListener('appinstalled', () => (visible.value = false))
})

async function install() {
  if (deferred.value) {
    deferred.value.prompt()
    await deferred.value.userChoice
    deferred.value = null
    visible.value = false
  } else if (isIos) {
    showIosGuide.value = true
  }
}
</script>

<template>
  <button v-if="visible" class="install" @click="install">📲 安裝到桌面</button>
  <div v-if="showIosGuide" class="modal" @click.self="showIosGuide = false">
    <div class="card">
      <h3>加入主畫面</h3>
      <ol>
        <li>請用 <b>Safari</b> 開啟本頁</li>
        <li>點下方工具列的 <b>分享</b> 按鈕（方框加向上箭頭）</li>
        <li>選擇 <b>「加入主畫面」</b></li>
      </ol>
      <button class="btn" @click="showIosGuide = false">知道了</button>
    </div>
  </div>
</template>

<style scoped>
.install {
  position: fixed; right: 12px; bottom: calc(72px + env(safe-area-inset-bottom));
  z-index: 20; padding: 10px 14px; border-radius: 999px; border: 1px solid var(--gold);
  background: var(--ink); color: var(--paper); font: inherit; box-shadow: 0 4px 12px #0004;
}
ol { padding-left: 1.2em; line-height: 1.9; }
</style>
