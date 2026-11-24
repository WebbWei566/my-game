// 每日簽到與每日任務
import type { useGame } from './game'
import { DAILY_TASKS, DAILY_ALL_REWARD, signInReward, dayKey, dayDiff } from '../data/daily'
import { play } from '../core/sfx'

type Game = ReturnType<typeof useGame>

/** 換日：重設每日任務快照 */
export function checkDaily(g: Game): void {
  const today = dayKey(g.now)
  const d = g.p.daily
  if (d.date === today) return
  d.date = today
  d.base = { ...g.p.stats }
  d.claimed = []
  if (g.started && d.signedDate !== today) g.toast('新的一天，記得簽到與完成每日任務', '📅', 4000)
}

export function signIn(g: Game): string | null {
  const today = dayKey(g.now)
  const d = g.p.daily
  if (d.signedDate === today) return null
  d.streak = d.signedDate && dayDiff(d.signedDate, today) === 1 ? d.streak + 1 : 1
  d.signedDate = today
  const text = g.grant(signInReward(d.streak))
  g.addLog(`簽到第 ${d.streak} 天，獲得 ${text}`, 'good')
  play('coin')
  g.save()
  return text
}

export function claimDaily(g: Game, id: string): string | null {
  const d = g.p.daily
  if (d.claimed.includes(id)) return null
  let reward: Record<string, number>
  if (id === 'all') {
    if (!DAILY_TASKS.every((t) => g.dailyProgress(t) >= t.target)) return null
    reward = DAILY_ALL_REWARD
  } else {
    const t = DAILY_TASKS.find((x) => x.id === id)
    if (!t || g.dailyProgress(t) < t.target) return null
    reward = t.reward
  }
  d.claimed.push(id)
  const text = g.grant(reward)
  g.addLog(`完成每日任務，獲得 ${text}`, 'good')
  play('coin')
  g.save()
  return text
}
