// 每日簽到與每日任務：任務進度 = 今日統計 - 當日開始時的統計快照
export interface DailyTask {
  id: string
  name: string
  stat: string
  target: number
  reward: Record<string, number>
}

export const DAILY_TASKS: DailyTask[] = [
  { id: 'dt_tap', name: '打坐 100 次', stat: 'taps', target: 100, reward: { pill_juqi: 1 } },
  { id: 'dt_gather', name: '採藥 3 次', stat: 'gathers', target: 3, reward: { herb_lingcao: 3 } },
  { id: 'dt_craft', name: '煉丹 1 次', stat: 'crafts', target: 1, reward: { pill_huichun: 1 } },
  { id: 'dt_kill', name: '擊敗 5 隻妖獸', stat: 'kills', target: 5, reward: { mat_yaodan: 2 } },
  { id: 'dt_event', name: '經歷 2 次奇遇', stat: 'events', target: 2, reward: { herb_ningxue: 2 } },
]

/** 全部每日任務完成的額外獎勵 */
export const DAILY_ALL_REWARD: Record<string, number> = { pill_break: 1 }

/** 連續簽到第 n 天（1 起算，7 天一輪）的獎勵 */
export function signInReward(streak: number): Record<string, number> {
  const day = ((streak - 1) % 7) + 1
  if (day === 7) return { pill_wuxin: 1, mat_yaodan: 5 }
  return { mat_yaodan: day, herb_lingcao: 2 }
}

/** 本地日期字串 YYYY-MM-DD */
export function dayKey(t = Date.now()): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 兩個日期字串相差幾天 */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000)
}
