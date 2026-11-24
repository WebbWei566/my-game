<script setup lang="ts">
import { useGame, type Tab } from '../stores/game'
const g = useGame()
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'cultivate', label: '修煉', icon: '☯' },
  { id: 'techniques', label: '功法', icon: '📜' },
  { id: 'alchemy', label: '丹房', icon: '⚗' },
  { id: 'dungeon', label: '秘境', icon: '⚔' },
  { id: 'bag', label: '行囊', icon: '🎒' },
]
</script>

<template>
  <nav class="tabbar">
    <button v-for="t in tabs.filter((x) => g.tabUnlocked(x.id))" :key="t.id" :class="{ on: g.tab === t.id }" @click="g.openTab(t.id)">
      <span class="i">{{ t.icon }}<i v-if="g.p.flags['new_' + t.id]" class="dot"></i></span><span>{{ t.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar { position: sticky; bottom: 0; display: flex; background: var(--paper); border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom); z-index: 10; }
button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0 6px;
  font: inherit; font-size: 12px; background: none; border: none; color: var(--ink); opacity: .5; }
button.on { opacity: 1; color: var(--cinnabar); }
.i { font-size: 20px; line-height: 1; position: relative; }
.dot { position: absolute; top: -2px; right: -6px; width: 8px; height: 8px; border-radius: 50%; background: var(--cinnabar); }
</style>
