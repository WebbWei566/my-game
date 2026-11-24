<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from '../stores/game'
import { BALANCE } from '../core/formulas'
import { RECIPES, craftChance, FIRE_LABEL, type FireResult, type Recipe } from '../data/recipes'
import { itemById, RARITY_NAME } from '../data/items'
import { stageInfo } from '../data/realms'
import FireControl from '../components/FireControl.vue'

const g = useGame()
const brewing = ref<Recipe | null>(null)
const lastResult = ref('')

const nextIn = computed(() => {
  if (g.p.gatherCharges >= BALANCE.gatherMax) return ''
  const s = Math.max(0, Math.ceil(BALANCE.gatherSec - (g.now - g.p.gatherAt) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const visible = computed(() => RECIPES.filter((r) => r.minStage <= g.p.stage + 4))
const pct = (r: Recipe) => Math.round(craftChance(r, 'good', g.tech.alchemy ?? 0) * 100)

function start(r: Recipe) {
  if (g.canCraft(r.id)) { brewing.value = r; lastResult.value = '' }
}
function onFire(fire: FireResult) {
  const r = brewing.value!
  brewing.value = null
  const n = g.craft(r.id, fire)
  lastResult.value = `${FIRE_LABEL[fire]}——` + (n ? `煉成${itemById(r.output).name}×${n}` : '煉丹失敗')
}
</script>

<template>
  <h2 class="title">丹房</h2>

  <section class="gather">
    <div>
      <b>入山採藥</b>　剩餘 {{ g.p.gatherCharges }} / {{ BALANCE.gatherMax }} 次
      <small v-if="nextIn">下次回復 {{ nextIn }}</small>
    </div>
    <button class="btn sm" :disabled="g.p.gatherCharges <= 0" @click="g.gather()">採藥</button>
  </section>

  <p v-if="lastResult" class="result">{{ lastResult }}</p>

  <h3>丹方</h3>
  <div v-for="r in visible" :key="r.id" class="row">
    <div class="info">
      <div><span class="r" :class="'r' + itemById(r.output).rarity">{{ RARITY_NAME[itemById(r.output).rarity] }}</span>{{ itemById(r.output).name }}
        <small class="inline">持有 {{ g.count(r.output) }}</small></div>
      <small>{{ itemById(r.output).desc }}</small>
      <small>
        <span v-for="(n, id) in r.inputs" :key="id" class="need" :class="{ lack: g.count(id) < n }">
          {{ itemById(id).name }} {{ g.count(id) }}/{{ n }}
        </span>
        ．成功率約 {{ pct(r) }}%
      </small>
    </div>
    <button v-if="g.p.stage >= r.minStage" class="btn sm" :disabled="!g.canCraft(r.id)" @click="start(r)">開爐</button>
    <small v-else class="lock">需{{ stageInfo(r.minStage).label }}</small>
  </div>

  <FireControl v-if="brewing" @done="onFire" />
</template>

<style scoped>
.gather { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; margin-top: 8px;
  border: 1px solid var(--line); border-radius: 12px; }
.gather small { display: block; opacity: .6; font-size: 12px; }
.result { color: var(--jade); margin: 8px 0 0; }
.need { margin-right: 8px; }
.need.lack { color: var(--cinnabar); }
.inline { display: inline !important; margin-left: 6px; }
.lock { white-space: nowrap; }
</style>
