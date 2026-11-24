<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { TECHNIQUES, GRADE_NAME, techEffectText, techPrice } from '../data/techniques'
import { stageInfo } from '../data/realms'

const g = useGame()
const owned = computed(() => TECHNIQUES.filter((t) => g.p.techniques.includes(t.id)))
// 藏經閣只陳列境界接近的功法，太高階的保持神秘
const shop = computed(() => TECHNIQUES.filter((t) => !g.p.techniques.includes(t.id) && t.grade < 5 && t.minStage <= g.p.stage + 4))
const hidden = computed(() => TECHNIQUES.length - owned.value.length - shop.value.length)
</script>

<template>
  <h2 class="title">功法</h2>
  <p class="meta">已收集 {{ owned.length }} / {{ TECHNIQUES.length }}．同時只能主修一部</p>

  <div v-for="t in owned" :key="t.id" class="row" :class="{ main: g.p.mainTech === t.id }">
    <div class="info">
      <div><span class="r" :class="'r' + t.grade">{{ GRADE_NAME[t.grade] }}</span>《{{ t.name }}》</div>
      <small>{{ t.desc }}</small>
      <small class="fx">{{ techEffectText(t).join('．') }}</small>
    </div>
    <span v-if="g.p.mainTech === t.id" class="tag">主修中</span>
    <button v-else-if="g.p.stage >= t.minStage" class="btn sm" @click="g.setMainTech(t.id)">主修</button>
    <small v-else class="lock">需{{ stageInfo(t.minStage).label }}</small>
  </div>

  <h3>藏經閣（以妖丹兌換）　持有妖丹 {{ g.count('mat_yaodan') }}</h3>
  <p v-if="!shop.length" class="empty sm">暫無可兌換的功法。</p>
  <div v-for="t in shop" :key="t.id" class="row">
    <div class="info">
      <div><span class="r" :class="'r' + t.grade">{{ GRADE_NAME[t.grade] }}</span>《{{ t.name }}》</div>
      <small class="fx">{{ techEffectText(t).join('．') }}</small>
    </div>
    <button class="btn sm" :disabled="g.count('mat_yaodan') < techPrice(t)" @click="g.buyTechnique(t.id)">
      {{ techPrice(t) }} 妖丹
    </button>
  </div>
  <p v-if="hidden > 0" class="meta">尚有 {{ hidden }} 部功法未曾聽聞，或許機緣會引你相遇……</p>
</template>

<style scoped>
.meta { font-size: 13px; opacity: .6; margin: 4px 0 8px; }
.row.main { background: linear-gradient(90deg, #c9a45c22, transparent); }
.fx { color: var(--jade); opacity: 1 !important; }
.tag { font-size: 13px; color: var(--cinnabar); white-space: nowrap; }
.lock { white-space: nowrap; }
.empty.sm { margin: 8px 0; font-size: 14px; }
</style>
