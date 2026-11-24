<script setup lang="ts">
import { useGame } from '../stores/game'
import { ACHIEVEMENTS } from '../data/achievements'
import { itemById } from '../data/items'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const done = (id: string) => g.p.achievements.includes(id)
const prog = (a: (typeof ACHIEVEMENTS)[number]) => {
  const [c, t] = a.progress(g.p)
  return `${Math.min(c, t)}/${t}`
}
const reward = (r?: Record<string, number>) =>
  Object.entries(r ?? {}).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
</script>

<template>
  <div class="modal" @click.self="emit('close')">
    <div class="card list">
      <h3>成就 {{ g.p.achievements.length }} / {{ ACHIEVEMENTS.length }}</h3>
      <div class="scroll">
        <div v-for="a in ACHIEVEMENTS" :key="a.id" class="row" :class="{ off: !done(a.id) }">
          <span class="ic">{{ a.icon }}</span>
          <div class="info">
            <div>{{ a.name }}</div>
            <small>{{ a.desc }}<template v-if="a.reward">．獎勵 {{ reward(a.reward) }}</template></small>
          </div>
          <small class="p">{{ done(a.id) ? '✔' : prog(a) }}</small>
        </div>
      </div>
      <button class="btn ghost full" @click="emit('close')">關閉</button>
    </div>
  </div>
</template>

<style scoped>
.list { max-height: 85dvh; display: flex; flex-direction: column; }
.scroll { overflow-y: auto; flex: 1; }
.ic { font-size: 24px; width: 32px; text-align: center; }
.off .ic { filter: grayscale(1); opacity: .5; }
.off .info { opacity: .6; }
.p { white-space: nowrap; font-variant-numeric: tabular-nums; }
.full { width: 100%; margin-top: 8px; }
</style>
