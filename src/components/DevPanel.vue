<script setup lang="ts">
// 開發者面板：網址加上 ?dev 或在開發模式下顯示，方便測試與數值平衡
import { useGame } from '../stores/game'
import { ITEMS } from '../data/items'
import { pickEvent } from '../data/events'
import { BALANCE } from '../core/formulas'
import { MAX_STAGE } from '../data/realms'

const g = useGame()
const fill = () => g.gain(g.required)
const stageUp = (n: number) => { g.p.stage = Math.min(MAX_STAGE, g.p.stage + n); g.p.cultivation = 0 }
const allItems = () => ITEMS.forEach((i) => g.addItem(i.id, 10))
const offline = (h: number) => g.settleOffline(Date.now() - h * 3600 * 1000)
const event = () => (g.activeEvent = pickEvent(g.p.stage, g.p.flags))
const charges = () => (g.p.gatherCharges = BALANCE.gatherMax)
const speeds = [1, 10, 100]
</script>

<template>
  <section class="dev">
    <h4>🛠 開發者面板</h4>
    <div class="grid">
      <button class="chip" @click="fill">修為填滿</button>
      <button class="chip" @click="stageUp(1)">境界 +1</button>
      <button class="chip" @click="stageUp(4)">境界 +4</button>
      <button class="chip" @click="allItems">全物品 ×10</button>
      <button class="chip" @click="offline(1)">模擬離線 1h</button>
      <button class="chip" @click="offline(24)">模擬離線 24h</button>
      <button class="chip" @click="charges">採藥補滿</button>
      <button class="chip" @click="event">觸發奇遇</button>
    </div>
    <div class="grid">
      <span>時間流速</span>
      <button v-for="s in speeds" :key="s" class="chip" :class="{ on: g.devSpeed === s }" @click="g.devSpeed = s">×{{ s }}</button>
    </div>
    <small>stage {{ g.p.stage }}．perSec {{ g.perSec.toFixed(2) }}．speedMult {{ g.speedMult.toFixed(2) }}．atk {{ g.combat.atk }}</small>
  </section>
</template>

<style scoped>
.dev { margin-top: 12px; padding: 10px; border: 1px dashed var(--cinnabar); border-radius: 10px; }
h4 { margin: 0 0 8px; font-size: 14px; }
.grid { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; font-size: 13px; }
small { opacity: .7; font-size: 11px; }
</style>
