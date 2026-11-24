<script setup lang="ts">
import { useGame } from '../stores/game'
import { DAILY_TASKS, DAILY_ALL_REWARD, signInReward } from '../data/daily'
import { itemById } from '../data/items'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const fmtReward = (r: Record<string, number>) => Object.entries(r).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
const nextStreak = () => (g.canSignIn ? (g.p.daily.streak || 0) + 1 : g.p.daily.streak)
const allDone = () => DAILY_TASKS.every((t) => g.dailyProgress(t) >= t.target)
</script>

<template>
  <div class="modal" @click.self="emit('close')">
    <div class="card">
      <h3>📅 每日</h3>
      <div class="sign">
        <div>
          <b>簽到</b>　已連續 {{ g.p.daily.streak }} 天
          <small>今日獎勵：{{ fmtReward(signInReward(nextStreak() || 1)) }}</small>
        </div>
        <button class="btn sm" :disabled="!g.canSignIn" @click="g.signIn()">{{ g.canSignIn ? '簽到' : '已簽到' }}</button>
      </div>

      <h4>每日任務</h4>
      <div v-for="t in DAILY_TASKS" :key="t.id" class="row">
        <div class="info">
          <div>{{ t.name }} <small class="inline">{{ g.dailyProgress(t) }}/{{ t.target }}</small></div>
          <small>獎勵：{{ fmtReward(t.reward) }}</small>
        </div>
        <span v-if="g.p.daily.claimed.includes(t.id)" class="ok">✔</span>
        <button v-else class="btn sm" :disabled="g.dailyProgress(t) < t.target" @click="g.claimDaily(t.id)">領取</button>
      </div>
      <div class="row">
        <div class="info"><div>全部完成</div><small>獎勵：{{ fmtReward(DAILY_ALL_REWARD) }}</small></div>
        <span v-if="g.p.daily.claimed.includes('all')" class="ok">✔</span>
        <button v-else class="btn sm" :disabled="!allDone()" @click="g.claimDaily('all')">領取</button>
      </div>
      <button class="btn ghost full" @click="emit('close')">關閉</button>
    </div>
  </div>
</template>

<style scoped>
.card { max-height: 88dvh; overflow-y: auto; }
.sign { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--gold); border-radius: 10px; }
.sign small { display: block; font-size: 12px; opacity: .7; }
h4 { margin: 14px 0 4px; font-size: 14px; opacity: .7; }
.inline { display: inline !important; margin-left: 6px; }
.ok { color: var(--jade); }
.full { width: 100%; margin-top: 10px; }
</style>
