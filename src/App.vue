<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from './stores/game'
import { fmt, breakthroughChance } from './core/formulas'
import InstallPrompt from './components/InstallPrompt.vue'
import Tribulation from './components/Tribulation.vue'
import EventModal from './components/EventModal.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const g = useGame()
g.init()

const showSettings = ref(false)
const usePill = ref(false)
const ripples = ref<{ id: number; x: number; y: number; text: string }[]>([])
let rid = 0

function tap(e: PointerEvent) {
  g.meditate()
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const item = { id: ++rid, x: e.clientX - r.left, y: e.clientY - r.top, text: '+' + fmt(g.perSec * 3) }
  ripples.value.push(item)
  setTimeout(() => (ripples.value = ripples.value.filter((x) => x.id !== item.id)), 800)
}

const chance = computed(() =>
  Math.round(breakthroughChance(g.isMajorBreak, usePill.value && g.pills > 0, g.rootId) * 100))
</script>

<template>
  <main v-if="g.loaded" class="app">
    <!-- 開局 -->
    <section v-if="!g.started" class="intro">
      <h1>問道長生</h1>
      <p class="tagline">大道三千，唯問長生</p>
      <button class="btn big" @click="g.newGame()">測靈根．入仙途</button>
    </section>

    <template v-else>
      <header>
        <div>
          <div class="realm">{{ g.info.label }}</div>
          <div class="sub">{{ g.root.name }}．每秒 {{ fmt(g.perSec) }} 修為</div>
        </div>
        <button class="icon" aria-label="設定" @click="showSettings = true">⚙</button>
      </header>

      <section class="progress">
        <div class="bar"><div class="fill" :style="{ width: g.progress * 100 + '%' }"></div></div>
        <div class="nums">{{ fmt(g.cultivation) }} / {{ fmt(g.required) }}</div>
      </section>

      <section class="seat" @pointerdown="tap">
        <div class="aura" :style="{ opacity: 0.3 + g.progress * 0.7 }"></div>
        <div class="avatar">🧘</div>
        <div class="tip">點擊打坐，加速吐納</div>
        <span v-for="r in ripples" :key="r.id" class="float" :style="{ left: r.x + 'px', top: r.y + 'px' }">{{ r.text }}</span>
      </section>

      <section class="actions">
        <p v-if="g.maxed" class="done">你已飛升仙界，大道已成。</p>
        <template v-else>
          <label class="pill" :class="{ disabled: g.pills <= 0 }">
            <input type="checkbox" v-model="usePill" :disabled="g.pills <= 0" />
            服用破境丹（持有 {{ g.pills }}）
          </label>
          <button class="btn big" :disabled="!g.canBreak" @click="g.tryBreak(usePill)">
            {{ g.isMajorBreak ? '⚡ 渡劫突破' : '突破' }}
            <small v-if="g.canBreak">成功率 {{ chance }}%{{ g.isMajorBreak ? '（受渡劫表現影響）' : '' }}</small>
          </button>
        </template>
      </section>

      <section class="log">
        <p v-for="l in g.log" :key="l.id" :class="l.kind">{{ l.text }}</p>
      </section>
    </template>

    <EventModal />
    <Tribulation v-if="g.tribulation" @done="g.finishTribulation" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <InstallPrompt />
  </main>
</template>

<style scoped>
.app { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; gap: 14px;
  padding: calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.intro { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.intro h1 { font-size: 48px; letter-spacing: .3em; margin: 0; font-family: var(--brush); }
.tagline { opacity: .6; letter-spacing: .4em; margin-bottom: 32px; }
header { display: flex; justify-content: space-between; align-items: center; }
.realm { font-size: 28px; font-family: var(--brush); letter-spacing: .1em; }
.sub { font-size: 13px; opacity: .7; }
.icon { font-size: 22px; background: none; border: none; color: inherit; padding: 8px; }
.bar { height: 12px; border-radius: 6px; background: var(--line); overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, var(--jade), var(--gold)); transition: width .25s linear; }
.nums { text-align: right; font-size: 13px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.seat { position: relative; flex: 1; min-height: 220px; border-radius: 20px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; user-select: none; touch-action: manipulation; overflow: hidden;
  background: radial-gradient(circle at 50% 55%, #fff6, transparent 70%); }
.aura { position: absolute; width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(var(--gold), transparent 70%); animation: breathe 4s ease-in-out infinite; }
.avatar { font-size: 80px; position: relative; }
.tip { font-size: 13px; opacity: .5; margin-top: 8px; position: relative; }
.float { position: absolute; pointer-events: none; color: var(--jade); font-weight: bold; animation: up .8s ease-out forwards; }
@keyframes breathe { 0%,100% { transform: scale(.9) } 50% { transform: scale(1.1) } }
@keyframes up { to { transform: translateY(-60px); opacity: 0 } }
.actions { display: grid; gap: 8px; }
.pill { font-size: 14px; display: flex; gap: 6px; align-items: center; }
.pill.disabled { opacity: .4; }
.done { text-align: center; font-size: 18px; color: var(--gold); }
.log { max-height: 26vh; overflow-y: auto; font-size: 14px; line-height: 1.6;
  border-top: 1px solid var(--line); padding-top: 8px; }
.log p { margin: 0 0 4px; }
.log .good { color: var(--jade); }
.log .bad { color: var(--cinnabar); }
</style>
