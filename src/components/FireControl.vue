<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { FireResult } from '../data/recipes'
import { play } from '../core/sfx'

// 火候小遊戲：指針來回擺動，在金色區間內收丹
const emit = defineEmits<{ done: [r: FireResult] }>()
const pos = ref(0)
const zoneStart = 0.3 + Math.random() * 0.45
const ZONE = 0.16
const PERFECT = 0.05
let dir = 1
let raf = 0
let last = 0
const stopped = ref(false)

function frame(t: number) {
  const dt = last ? (t - last) / 1000 : 0
  last = t
  pos.value += dir * dt * 0.9
  if (pos.value >= 1) { pos.value = 1; dir = -1 }
  if (pos.value <= 0) { pos.value = 0; dir = 1 }
  raf = requestAnimationFrame(frame)
}

function stop() {
  if (stopped.value) return
  stopped.value = true
  cancelAnimationFrame(raf)
  const center = zoneStart + ZONE / 2
  const d = Math.abs(pos.value - center)
  const r: FireResult = d <= PERFECT / 2 ? 'perfect' : d <= ZONE / 2 ? 'good' : 'miss'
  navigator.vibrate?.(r === 'miss' ? 200 : 40)
  play(r === 'miss' ? 'fail' : 'tap')
  setTimeout(() => emit('done', r), 500)
}

onMounted(() => (raf = requestAnimationFrame(frame)))
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="modal">
    <div class="card">
      <h3>🔥 控制火候</h3>
      <p class="hint">在指針進入金色區間時收丹，正中紅線可能丹成雙枚。</p>
      <div class="track">
        <div class="zone" :style="{ left: zoneStart * 100 + '%', width: ZONE * 100 + '%' }">
          <div class="perfect" :style="{ width: (PERFECT / ZONE) * 100 + '%' }"></div>
        </div>
        <div class="needle" :style="{ left: pos * 100 + '%' }"></div>
      </div>
      <button class="btn big" :disabled="stopped" @pointerdown="stop">收丹</button>
    </div>
  </div>
</template>

<style scoped>
.hint { font-size: 13px; opacity: .7; }
.track { position: relative; height: 36px; border-radius: 8px; margin: 20px 0;
  background: linear-gradient(90deg, #3a2a1a, #a33a2b 50%, #f0b040); }
.zone { position: absolute; top: 0; bottom: 0; background: #f3d78c99; border: 2px solid var(--gold);
  box-sizing: border-box; display: flex; justify-content: center; }
.perfect { height: 100%; background: #ff3b3bcc; }
.needle { position: absolute; top: -6px; bottom: -6px; width: 4px; margin-left: -2px; background: var(--ink); border-radius: 2px;
  box-shadow: 0 0 0 2px var(--paper); }
.btn.big { width: 100%; }
</style>
