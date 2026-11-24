<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from '../stores/game'

const g = useGame()
const copied = ref(false)
const reload = () => location.reload()

async function copy() {
  const info = [
    `版本：${__APP_VERSION__}`,
    `時間：${new Date().toISOString()}`,
    `裝置：${navigator.userAgent}`,
    `錯誤：${g.fatal}`,
  ].join('\n')
  try { await navigator.clipboard.writeText(info); copied.value = true } catch { /* ignore */ }
}
</script>

<template>
  <div v-if="g.fatal" class="modal err">
    <div class="card">
      <h3>⚠ 發生錯誤</h3>
      <p class="note">遊戲遇到問題。你的進度已自動存檔，重新整理通常就能恢復。</p>
      <pre>{{ g.fatal }}</pre>
      <div class="row2">
        <button class="btn ghost" @click="copy">{{ copied ? '已複製' : '複製錯誤資訊' }}</button>
        <button class="btn" @click="reload">重新整理</button>
      </div>
      <button class="btn ghost full" @click="g.fatal = ''">先繼續玩</button>
    </div>
  </div>
</template>

<style scoped>
.err { z-index: 50; }
pre { font-size: 11px; max-height: 30vh; overflow: auto; white-space: pre-wrap; word-break: break-all;
  background: #0001; padding: 8px; border-radius: 8px; }
.note { font-size: 13px; opacity: .8; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.full { width: 100%; margin-top: 8px; }
</style>
