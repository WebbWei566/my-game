<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from '../stores/game'
import { ITEMS, itemById } from '../data/items'
import { BALANCE } from '../core/formulas'

const g = useGame()
const choosing = ref<number | null>(null)
const seeds = computed(() => ITEMS.filter((i) => i.kind === 'herb' && g.count(i.id) > 0))

function left(readyAt: number) {
  const s = Math.max(0, Math.ceil((readyAt - g.now) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}時${m}分` : `${m}:${String(s % 60).padStart(2, '0')}`
}
const pct = (p: { plantedAt: number; readyAt: number }) =>
  Math.min(100, ((g.now - p.plantedAt) / (p.readyAt - p.plantedAt)) * 100)
const growText = (r: number) => {
  const s = BALANCE.growSec[r]
  return s >= 3600 ? `${s / 3600} 小時` : `${s / 60} 分鐘`
}
function plant(herb: string) {
  if (choosing.value !== null) g.plant(choosing.value, herb)
  choosing.value = null
}
</script>

<template>
  <h3>靈田（{{ g.plotList.filter(Boolean).length }} / {{ g.plotList.length }}）</h3>
  <div class="field">
    <div v-for="(p, i) in g.plotList" :key="i" class="plot" :class="{ ready: p && g.now >= p.readyAt }">
      <template v-if="p">
        <div class="name">{{ itemById(p.herb).name }}</div>
        <div class="grow"><div :style="{ width: pct(p) + '%' }"></div></div>
        <button v-if="g.now >= p.readyAt" class="btn sm" @click="g.harvest(i)">收成</button>
        <small v-else>{{ left(p.readyAt) }}</small>
      </template>
      <button v-else class="empty-plot" :disabled="!seeds.length" @click="choosing = i">＋ 種植</button>
    </div>
  </div>
  <p class="tip">以一株靈草為種，成熟後收成 {{ BALANCE.harvestMin }}～{{ BALANCE.harvestMax }} 株。境界越高靈田越多。</p>

  <div v-if="choosing !== null" class="modal" @click.self="choosing = null">
    <div class="card">
      <h3>選擇種子</h3>
      <div v-for="it in seeds" :key="it.id" class="row">
        <div class="info">
          <div><span class="r" :class="'r' + it.rarity"></span>{{ it.name }} ×{{ g.count(it.id) }}</div>
          <small>生長 {{ growText(it.rarity) }}</small>
        </div>
        <button class="btn sm" @click="plant(it.id)">種下</button>
      </div>
      <button class="btn ghost full" @click="choosing = null">取消</button>
    </div>
  </div>
</template>

<style scoped>
.field { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.plot { border: 1px solid var(--line); border-radius: 10px; padding: 8px; min-height: 76px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px; font-size: 13px; background: #2f7d6d0d; }
.plot.ready { border-color: var(--jade); background: #2f7d6d22; }
.grow { width: 100%; height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
.grow > div { height: 100%; background: var(--jade); }
.empty-plot { font: inherit; font-size: 13px; background: none; border: none; color: var(--ink); opacity: .6; width: 100%; height: 100%; }
.empty-plot:disabled { opacity: .3; }
.tip { font-size: 12px; opacity: .6; }
.full { width: 100%; margin-top: 8px; }
.r:empty { display: none; }
</style>
