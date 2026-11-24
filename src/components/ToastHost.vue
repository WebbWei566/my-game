<script setup lang="ts">
import { useGame } from '../stores/game'
const g = useGame()
</script>

<template>
  <div class="toasts">
    <TransitionGroup name="t">
      <div v-for="t in g.toasts" :key="t.id" class="toast" @click="g.toasts = g.toasts.filter((x) => x.id !== t.id)">
        <span class="i">{{ t.icon }}</span>{{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; top: calc(8px + env(safe-area-inset-top)); left: 0; right: 0; z-index: 40;
  display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; padding: 0 16px; }
.toast { pointer-events: auto; max-width: 440px; background: var(--ink); color: var(--paper); border: 1px solid var(--gold);
  border-radius: 12px; padding: 10px 14px; font-size: 14px; box-shadow: 0 6px 20px #0005; }
.i { margin-right: 8px; }
.t-enter-active, .t-leave-active { transition: all .3s; }
.t-enter-from, .t-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
