// ⭐ 所有數值公式集中於此，方便平衡調整
export const BALANCE = {
  baseRequired: 100,
  requiredGrowth: 1.55,
  baseGain: 1,
  gainGrowth: 1.32,
  /** 點擊打坐一次等於幾秒的自然修煉 */
  tapSeconds: 3,
  /** 離線收益上限（小時） */
  offlineCapHours: 12,
  /** 離線收益效率 */
  offlineRate: 0.5,
  minorBreakChance: 0.9,
  majorBreakChance: 0.55,
  /** 採藥：幾秒回復一次機會、最多累積幾次 */
  gatherSec: 300,
  gatherMax: 5,
  failLossPct: 0.3,
  /** 靈田：各稀有度生長秒數、收成數量 */
  growSec: { 1: 600, 2: 1800, 3: 3600, 4: 10800, 5: 21600 } as Record<number, number>,
  harvestMin: 2,
  harvestMax: 4,
  /** 平均幾秒觸發一次奇遇 */
  eventIntervalSec: 90,
}

/** 突破到下一階所需修為 */
export const requiredFor = (stage: number) =>
  Math.floor(BALANCE.baseRequired * Math.pow(BALANCE.requiredGrowth, stage))

/** 每秒修為 */
export const gainPerSec = (stage: number, rootSpeed: number) =>
  BALANCE.baseGain * Math.pow(BALANCE.gainGrowth, stage) * rootSpeed

/** 突破基礎成功率；bonus 為丹藥、功法等加成總和 */
export function breakthroughChance(isMajor: boolean, bonus: number, rootId: string) {
  let c = isMajor ? BALANCE.majorBreakChance : BALANCE.minorBreakChance
  if (isMajor && rootId === 'thunder') c += 0.15
  c += bonus
  return Math.min(c, 0.98)
}

const UNITS = ['', '萬', '億', '兆', '京', '垓', '秭', '穰', '溝', '澗', '正', '載']
export function fmt(n: number): string {
  // 小於 10 時保留一位小數，避免開局顯示「每秒 0」
  if (n < 10) return (Math.floor(n * 10) / 10).toString()
  if (n < 10000) return Math.floor(n).toString()
  const i = Math.min(Math.floor(Math.log10(n) / 4), UNITS.length - 1)
  return (n / Math.pow(10000, i)).toFixed(2) + UNITS[i]
}

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分鐘`
}

/** 轉世永久加成 */
export const rebirthSpeed = (n: number) => 1 + 0.5 * n
export const rebirthCombat = (n: number) => 1 + 0.25 * n

/** 靈田格數：初始 2 格，每個大境界 +1，最多 6 格 */
export const plotCount = (stage: number) => Math.min(6, 2 + Math.floor(stage / 4))
