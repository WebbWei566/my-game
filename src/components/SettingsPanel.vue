<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from '../stores/game'
const emit = defineEmits<{ close: [] }>()
const g = useGame()
const code = ref('')
const msg = ref('')

async function doExport() {
  code.value = g.exportCode()
  try { await navigator.clipboard.writeText(code.value); msg.value = '存檔碼已複製到剪貼簿' }
  catch { msg.value = '請手動複製下方存檔碼' }
}
function doImport() {
  msg.value = g.importCode(code.value) ? '匯入成功' : '存檔碼無效'
}
async function doReset() {
  if (confirm('確定要散功重修？所有進度將會刪除！')) { await g.reset(); emit('close') }
}
</script>

<template>
  <div class="modal" @click.self="emit('close')">
    <div class="card">
      <h3>設定</h3>
      <p class="note">建議定期匯出存檔碼備份，避免瀏覽器清除資料造成進度遺失。</p>
      <textarea v-model="code" rows="4" placeholder="在此貼上存檔碼以匯入"></textarea>
      <p v-if="msg" class="msg">{{ msg }}</p>
      <div class="row">
        <button class="btn" @click="doExport">匯出存檔</button>
        <button class="btn" @click="doImport">匯入存檔</button>
      </div>
      <button class="btn danger" @click="doReset">散功重修（重置）</button>
      <button class="btn ghost" @click="emit('close')">關閉</button>
    </div>
  </div>
</template>

<style scoped>
textarea { width: 100%; box-sizing: border-box; font: 12px monospace; padding: 8px; border-radius: 8px; border: 1px solid var(--line); background: #fff8; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
.card > .btn { width: 100%; margin-top: 8px; }
.note { font-size: 13px; opacity: .75; }
.msg { color: var(--jade); font-size: 14px; }
</style>
