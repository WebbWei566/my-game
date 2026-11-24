<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { DUNGEONS, dungeonById } from '../data/dungeons'
import { stageInfo } from '../data/realms'
import { itemById } from '../data/items'
import DungeonMapView from '../components/DungeonMapView.vue'
import BattlePanel from '../components/BattlePanel.vue'

const g = useGame()
const run = computed(() => g.p.run)
const dungeon = computed(() => run.value && dungeonById(run.value.dungeonId))
const lootText = computed(() =>
  Object.entries(run.value?.loot ?? {}).map(([id, n]) => `${itemById(id).name}×${n}`).join('、') || '尚無')
const pct = (a: number, m: number) => Math.max(0, (a / m) * 100) + '%'
</script>

<template>
  <template v-if="run && dungeon">
    <div class="head">
      <h2 class="title">{{ dungeon.name }}</h2>
      <button v-if="!run.battle" class="btn sm ghost" @click="g.finishRun('leave')">撤離</button>
    </div>
    <BattlePanel v-if="run.battle" />
    <template v-else>
      <div class="status">
        <span>氣血</span><div class="bar"><div :style="{ width: pct(run.hp, g.combat.maxHp) }"></div></div>
        <small>{{ run.hp }}/{{ g.combat.maxHp }}</small>
      </div>
      <p class="note">{{ g.runNote || '選擇下一個前往的地點（紅框）。' }}</p>
      <DungeonMapView :map="run.map" :at="run.at" :visited="run.visited" @move="g.moveTo" />
      <p class="loot">戰利品：{{ lootText }}</p>
      <p class="tip">撤離可保留全部戰利品；戰敗會失去一半。</p>
    </template>
  </template>

  <template v-else>
    <h2 class="title">秘境</h2>
    <p v-if="g.lastRunSummary" class="summary">{{ g.lastRunSummary }}</p>
    <p class="tip">戰力：氣血 {{ g.combat.maxHp }}．攻擊 {{ g.combat.atk }}．防禦 {{ g.combat.def }}．武技「{{ g.skill.name }}」</p>
    <div v-for="d in DUNGEONS" :key="d.id" class="row">
      <div class="info">
        <div>{{ d.name }} <span v-if="g.p.flags['clear_' + d.id]" class="cleared">✔ 已通關</span></div>
        <small>{{ d.desc }}</small>
        <small>建議境界：{{ stageInfo(d.minStage).label }}以上．共 {{ d.layers }} 層</small>
      </div>
      <button v-if="g.p.stage >= d.minStage" class="btn sm" @click="g.enterDungeon(d.id)">進入</button>
      <small v-else class="lock">需{{ stageInfo(d.minStage).label }}</small>
    </div>
  </template>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.status { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.bar { flex: 1; height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.bar > div { height: 100%; background: var(--cinnabar); transition: width .3s; }
.note { font-size: 14px; color: var(--jade); margin: 4px 0; min-height: 1.4em; }
.loot { font-size: 14px; }
.tip { font-size: 12px; opacity: .6; }
.summary { padding: 10px; border: 1px solid var(--gold); border-radius: 10px; font-size: 14px; }
.cleared { font-size: 12px; color: var(--jade); }
.lock { white-space: nowrap; }
</style>
