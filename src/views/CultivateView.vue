<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGame } from '../stores/game'
import { fmt } from '../core/formulas'
import { itemById } from '../data/items'

const g = useGame()
const breakItem = ref<string | null>(null)
const ripples = ref<{ id: number; x: number; y: number; text: string }[]>([])
let rid = 0

watch(() => g.breakItems, (list) => { if (breakItem.value && !list.includes(breakItem.value)) breakItem.value = null })

function tap(e: PointerEvent) {
  g.meditate()
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const item = { id: ++rid, x: e.clientX - r.left, y: e.clientY - r.top, text: '+' + fmt(g.tapGain) }
  ripples.value.push(item)
  setTimeout(() => (ripples.value = ripples.value.filter((x) => x.id !== item.id)), 800)
}

// 新手提示：前幾個境界依情境提示下一步
const hint = computed(() => {
  if (g.p.stage >= 5 || g.maxed) return ''
  if (g.canBreak && g.isMajorBreak) return '大境界突破需要渡劫：天雷落下前看準紅光，點擊其他位置閃避。服用破境丹可以提高成功率。'
  if (g.canBreak) return '修為已滿！點擊下方「突破」晉升境界。'
  if (g.p.stage === 0) return '修為會自動累積，點擊中間的修士打坐可以加快速度。'
  if (g.p.stage === 1 && !g.p.stats.crafts) return '丹房已開放：入山採藥，再用靈草煉製聚氣丹。'
  if (g.p.stage >= 2 && !g.p.stats.dungeonRuns) return '秘境已開放：擊敗妖獸取得妖丹，可在功法頁的藏經閣兌換功法。'
  return ''
})

const chance = computed(() => Math.round(g.breakChance(breakItem.value) * 100))
const buffLeft = computed(() => {
  const until = Math.max(0, ...g.p.buffs.map((b) => b.until))
  return Math.max(0, Math.ceil((until - g.now) / 1000))
})
</script>

<template>
  <section class="progress">
    <div class="bar"><div class="fill" :style="{ width: g.progress * 100 + '%' }"></div></div>
    <div class="nums">
      <span v-if="buffLeft" class="buff">⚡ 修煉 ×{{ g.buffMult }}（{{ Math.floor(buffLeft / 60) }}:{{ String(buffLeft % 60).padStart(2, '0') }}）</span>
      {{ fmt(g.p.cultivation) }} / {{ fmt(g.required) }}
    </div>
  </section>

  <p v-if="hint" class="hint">💡 {{ hint }}</p>

  <section class="seat" @pointerdown="tap">
    <div class="aura" :style="{ opacity: 0.3 + g.progress * 0.7 }"></div>
    <div class="avatar">🧘</div>
    <div class="tip">點擊打坐，加速吐納</div>
    <span v-for="r in ripples" :key="r.id" class="float" :style="{ left: r.x + 'px', top: r.y + 'px' }">{{ r.text }}</span>
  </section>

  <section class="actions">
    <p v-if="g.maxed" class="done">你已飛升仙界，大道已成。</p>
    <template v-else>
      <div v-if="g.breakItems.length" class="pills">
        <span>輔助丹藥：</span>
        <button class="chip" :class="{ on: !breakItem }" @click="breakItem = null">不用</button>
        <button v-for="id in g.breakItems" :key="id" class="chip" :class="{ on: breakItem === id }" @click="breakItem = id">
          {{ itemById(id).name }} ×{{ g.count(id) }}
        </button>
      </div>
      <button class="btn big" :disabled="!g.canBreak" @click="g.tryBreak(breakItem)">
        {{ g.isMajorBreak ? '⚡ 渡劫突破' : '突破' }}
        <small v-if="g.canBreak">成功率 {{ chance }}%{{ g.isMajorBreak ? '（受渡劫表現影響）' : '' }}</small>
      </button>
    </template>
  </section>

  <section class="log">
    <p v-for="l in g.log" :key="l.id" :class="l.kind">{{ l.text }}</p>
  </section>
</template>

<style scoped>
.bar { height: 12px; border-radius: 6px; background: var(--line); overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, var(--jade), var(--gold)); transition: width .25s linear; }
.nums { display: flex; justify-content: flex-end; gap: 8px; font-size: 13px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.buff { margin-right: auto; color: var(--gold); }
.seat { position: relative; flex: 1; min-height: 200px; border-radius: 20px; display: flex; flex-direction: column;
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
.pills { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 14px; }
.hint { margin: 0; font-size: 13px; padding: 8px 10px; border-radius: 10px; background: #c9a45c22; border: 1px dashed var(--gold); }
.done { text-align: center; font-size: 18px; color: var(--gold); }
.log { max-height: 24vh; overflow-y: auto; font-size: 14px; line-height: 1.6; border-top: 1px solid var(--line); padding-top: 8px; }
.log p { margin: 0 0 4px; }
.log .good { color: var(--jade); }
.log .bad { color: var(--cinnabar); }
</style>
