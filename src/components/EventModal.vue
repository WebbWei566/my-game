<script setup lang="ts">
import { useGame } from '../stores/game'
const g = useGame()
</script>

<template>
  <div v-if="g.activeEvent" class="modal">
    <div class="card">
      <h3>✦ 奇遇：{{ g.activeEvent.title }}</h3>
      <p>{{ g.activeEvent.body }}</p>
      <div class="choices">
        <button v-for="(c, i) in g.activeEvent.choices" :key="i" class="btn" :disabled="!g.canChoose(c)" @click="g.chooseEvent(i)">
          {{ c.label }}<small v-if="c.chance !== undefined">（{{ Math.round(c.chance * 100) }}%）</small>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.choices { display: grid; gap: 10px; margin-top: 16px; }
small { opacity: .6; }
</style>
