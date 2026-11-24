<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useGame } from '../stores/game'

const g = useGame()
// 秘境結束時 run 會先變成 null，這裡全部用可選鏈避免卸載前報錯
const run = computed(() => g.p.run)
const b = computed(() => run.value?.battle ?? null)
const logEl = ref<HTMLElement>()
const shake = ref(false)

watch(() => b.value?.log.length, async () => {
  await nextTick()
  logEl.value?.scrollTo({ top: logEl.value.scrollHeight })
})
watch(() => run.value?.hp, (now, before) => {
  if (now !== undefined && before !== undefined && now < before) { shake.value = true; setTimeout(() => (shake.value = false), 300) }
})
const pct = (a: number, m: number) => Math.max(0, (a / m) * 100) + '%'
</script>

<template>
  <div v-if="run && b" class="battle">
    <div class="foe" :class="b.foe.kind">
      <div class="icon" :class="{ dead: b.foe.hp <= 0 }">{{ b.foe.icon }}</div>
      <div class="name">{{ b.foe.name }}</div>
      <div class="bar hp"><div :style="{ width: pct(b.foe.hp, b.foe.maxHp) }"></div></div>
      <small>{{ b.foe.hp }} / {{ b.foe.maxHp }}</small>
    </div>

    <div ref="logEl" class="blog">
      <p v-for="(l, i) in b.log" :key="i">{{ l }}</p>
      <p v-if="!b.log.length" class="hint">{{ b.foe.name }}擋住了去路！</p>
    </div>

    <div class="me" :class="{ shake }">
      <div class="stat"><span>氣血</span><div class="bar hp"><div :style="{ width: pct(run.hp, g.combat.maxHp) }"></div></div>
        <small>{{ run.hp }}/{{ g.combat.maxHp }}</small></div>
      <div class="stat"><span>靈力</span><div class="bar mp"><div :style="{ width: pct(run.mp, g.combat.maxMp) }"></div></div>
        <small>{{ run.mp }}/{{ g.combat.maxMp }}</small></div>
    </div>

    <div v-if="!b.over" class="acts">
      <button class="btn" @click="g.battleAction('attack')">⚔ 攻擊</button>
      <button class="btn" :disabled="run.mp < g.skill.cost" @click="g.battleAction('skill')">
        ✨ {{ g.skill.name }}<small>（{{ g.skill.cost }} 靈力）</small></button>
      <button class="btn" :disabled="g.count('pill_huichun') <= 0" @click="g.battleAction('pill')">
        💊 回春丹 ×{{ g.count('pill_huichun') }}</button>
      <button class="btn ghost" :disabled="b.foe.kind === 'boss'" @click="g.battleAction('flee')">🏃 逃跑</button>
    </div>
    <button v-else class="btn big" @click="g.closeBattle()">
      {{ b.over === 'win' ? (b.foe.kind === 'boss' ? '通關！帶著戰利品離開' : '繼續前進') : b.over === 'fled' ? '繼續前進' : '敗退……' }}
    </button>
  </div>
</template>

<style scoped>
.battle { display: flex; flex-direction: column; gap: 10px; }
.foe { text-align: center; padding: 12px; border-radius: 16px; background: radial-gradient(#a33a2b22, transparent 70%); }
.foe.boss { background: radial-gradient(#c9a45c44, transparent 70%); }
.icon { font-size: 64px; transition: transform .3s, opacity .3s; }
.icon.dead { transform: rotate(90deg) scale(.6); opacity: .3; }
.name { font-family: var(--brush); font-size: 22px; }
.bar { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; flex: 1; }
.bar > div { height: 100%; transition: width .3s; }
.bar.hp > div { background: var(--cinnabar); }
.bar.mp > div { background: #4a6fc1; }
.foe .bar { max-width: 240px; margin: 6px auto 2px; }
.blog { height: 120px; overflow-y: auto; font-size: 13px; line-height: 1.6; padding: 8px; border: 1px solid var(--line); border-radius: 10px; }
.blog p { margin: 0; }
.hint { opacity: .6; }
.me { display: grid; gap: 6px; }
.me.shake { animation: shake .3s; }
.stat { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.stat small { width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
.acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.acts small { font-size: 11px; opacity: .7; }
@keyframes shake { 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
</style>
