<script setup lang="ts">
import { computed } from 'vue'
import { NODE_INFO, findNode, type DungeonMap } from '../core/dungeonMap'

const props = defineProps<{ map: DungeonMap; at: string; visited: string[] }>()
const emit = defineEmits<{ move: [id: string] }>()

const ROW = 64
const height = computed(() => props.map.layers.length * ROW)
const x = (i: number, len: number) => ((i + 1) / (len + 1)) * 100
const y = (layer: number) => layer * ROW + ROW / 2
const nodes = computed(() => props.map.layers.flatMap((l) => l.map((n, i) => ({ ...n, x: x(i, l.length), y: y(n.layer) }))))
const pos = computed(() => new Map(nodes.value.map((n) => [n.id, n])))
const reachable = computed(() => new Set(findNode(props.map, props.at).next))
const edges = computed(() => nodes.value.flatMap((n) => n.next.map((t) => ({
  from: n, to: pos.value.get(t)!,
  walked: props.visited.includes(n.id) && props.visited.includes(t),
  open: n.id === props.at,
}))))
</script>

<template>
  <div class="map" :style="{ height: height + 'px' }">
    <svg :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none">
      <line v-for="(e, i) in edges" :key="i" :x1="e.from.x" :y1="e.from.y" :x2="e.to.x" :y2="e.to.y"
        :class="{ walked: e.walked, open: e.open }" vector-effect="non-scaling-stroke" />
    </svg>
    <button v-for="n in nodes" :key="n.id" class="node"
      :class="[n.type, { here: n.id === at, done: visited.includes(n.id) && n.id !== at, can: reachable.has(n.id) }]"
      :style="{ left: n.x + '%', top: n.y + 'px' }" :disabled="!reachable.has(n.id)"
      :aria-label="NODE_INFO[n.type].label" @click="emit('move', n.id)">
      {{ NODE_INFO[n.type].icon }}
    </button>
  </div>
</template>

<style scoped>
.map { position: relative; margin: 8px 0; }
svg { position: absolute; inset: 0; width: 100%; height: 100%; }
line { stroke: var(--line); stroke-width: 2; stroke-dasharray: 4 4; }
line.walked { stroke: var(--gold); stroke-dasharray: none; }
line.open { stroke: var(--cinnabar); }
.node { position: absolute; transform: translate(-50%, -50%); width: 42px; height: 42px; border-radius: 50%;
  border: 2px solid var(--line); background: var(--paper); font-size: 20px; padding: 0; color: var(--ink); }
.node.boss { width: 52px; height: 52px; font-size: 26px; }
.node:disabled { opacity: .45; }
.node.done { opacity: .3; }
.node.here { opacity: 1; border-color: var(--gold); box-shadow: 0 0 0 4px #c9a45c55; }
.node.can { opacity: 1; border-color: var(--cinnabar); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 6px #a33a2b33; } }
</style>
