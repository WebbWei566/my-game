<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../stores/game'
import { itemById, RARITY_NAME, type Item } from '../data/items'

const g = useGame()
const groups = computed(() => {
  const list = Object.keys(g.p.inventory).filter((id) => g.count(id) > 0).map(itemById)
  const by = (k: Item['kind']) => list.filter((i) => i.kind === k).sort((a, b) => b.rarity - a.rarity)
  return [
    { title: '丹藥', items: by('pill') },
    { title: '靈草', items: by('herb') },
    { title: '材料', items: by('material') },
  ].filter((x) => x.items.length)
})
const usable = (i: Item) => !!(i.effect?.cultivationPct || i.effect?.buff)
</script>

<template>
  <h2 class="title">行囊</h2>
  <p v-if="!groups.length" class="empty">行囊空空如也。</p>
  <section v-for="grp in groups" :key="grp.title">
    <h3>{{ grp.title }}</h3>
    <div v-for="it in grp.items" :key="it.id" class="row">
      <div class="info">
        <div><span class="r" :class="'r' + it.rarity">{{ RARITY_NAME[it.rarity] }}</span>{{ it.name }} <b>×{{ g.count(it.id) }}</b></div>
        <small>{{ it.desc }}</small>
      </div>
      <button v-if="usable(it)" class="btn sm" @click="g.useItem(it.id)">服用</button>
    </div>
  </section>
</template>
