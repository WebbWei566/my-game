<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { play } from '../core/sfx'

// 渡劫小遊戲：天雷預警後落下，點擊切換位置閃避
const emit = defineEmits<{ done: [score: number] }>()
const LANES = 3
const ROUNDS = 8
const pos = ref(1)
const round = ref(0)
const hits = ref(0)
const warn = ref<number[]>([])
const strike = ref<number[]>([])
const hurt = ref(false)
let timers: number[] = []
const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))

function nextRound() {
  if (round.value >= ROUNDS) {
    later(() => emit('done', 1 - hits.value / ROUNDS), 600)
    return
  }
  round.value++
  const count = round.value > 4 ? 2 : 1
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count)
  warn.value = lanes
  const warnMs = Math.max(1100 - round.value * 70, 550)
  later(() => {
    warn.value = []
    strike.value = lanes
    play('thunder')
    if (lanes.includes(pos.value)) {
      hits.value++
      hurt.value = true
      navigator.vibrate?.(150)
    }
    later(() => { strike.value = []; hurt.value = false; later(nextRound, 250) }, 350)
  }, warnMs)
}

onMounted(() => later(nextRound, 1200))
onUnmounted(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="trib" :class="{ flash: strike.length > 0 }">
    <h2>⚡ 天劫降臨 ⚡</h2>
    <p class="hint">看準紅光預警，點擊下方位置閃避天雷！</p>
    <p>第 {{ round }} / {{ ROUNDS }} 道雷劫　受創 {{ hits }}</p>
    <div class="field">
      <div v-for="i in LANES" :key="i" class="lane"
        :class="{ warn: warn.includes(i - 1), strike: strike.includes(i - 1) }"
        @pointerdown="pos = i - 1">
        <svg v-if="strike.includes(i - 1)" class="bolt" viewBox="0 0 40 200" preserveAspectRatio="none">
          <polyline points="22,0 12,60 26,70 10,130 24,138 16,200" />
        </svg>
        <div v-if="pos === i - 1" class="me" :class="{ hurt }">🧘</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trib { position: fixed; inset: 0; z-index: 30; background: radial-gradient(#2a2440, #0b0a10);
  color: #eee; display: flex; flex-direction: column; align-items: center; padding: 24px 16px; text-align: center; }
h2 { letter-spacing: .3em; margin: 8px 0; }
.hint { opacity: .7; font-size: 14px; }
.field { flex: 1; width: 100%; max-width: 420px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.lane { position: relative; border-radius: 12px; background: #ffffff0d; display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: 24px; transition: background .15s; touch-action: manipulation; }
.lane.warn { background: #ff3b3b33; box-shadow: inset 0 0 30px #ff3b3b88; }
.lane.strike { background: linear-gradient(#ffffff55, #9ad7ff55 40%, #6c5cff88); animation: flash .35s; }
.me { font-size: 44px; position: relative; }
.bolt { position: absolute; inset: 0; width: 100%; height: 100%; }
.bolt polyline { fill: none; stroke: #fff; stroke-width: 4; filter: drop-shadow(0 0 6px #9ad7ff); vector-effect: non-scaling-stroke; }
.trib.flash { animation: screen .35s; }
@keyframes screen { 0% { background: #fff } 100% { background: radial-gradient(#2a2440, #0b0a10) } }
.me.hurt { animation: shake .3s; filter: drop-shadow(0 0 8px red); }
@keyframes flash { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
@keyframes shake { 0%,100% { transform: none } 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
</style>
