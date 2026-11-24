import { ITEMS } from './items'

export interface Recipe {
  id: string
  output: string
  inputs: Record<string, number>
  /** 基礎成功率 */
  base: number
  minStage: number
}

export const RECIPES: Recipe[] = [
  { id: 'r_juqi', output: 'pill_juqi', inputs: { herb_lingcao: 3 }, base: 0.8, minStage: 0 },
  { id: 'r_huichun', output: 'pill_huichun', inputs: { herb_lingcao: 2, herb_ningxue: 1 }, base: 0.75, minStage: 0 },
  { id: 'r_break', output: 'pill_break', inputs: { herb_lingcao: 3, herb_zhuguo: 1 }, base: 0.6, minStage: 2 },
  { id: 'r_wuxin', output: 'pill_wuxin', inputs: { herb_zhuguo: 2, herb_xuanbing: 1 }, base: 0.5, minStage: 4 },
  { id: 'r_dujie', output: 'pill_dujie', inputs: { herb_leiji: 2, herb_xuanbing: 1, herb_longxian: 1 }, base: 0.4, minStage: 10 },
]

export type FireResult = 'perfect' | 'good' | 'miss'
export const FIRE_BONUS: Record<FireResult, number> = { perfect: 0.25, good: 0.1, miss: -0.15 }
export const FIRE_LABEL: Record<FireResult, string> = { perfect: '火候絕佳', good: '火候尚可', miss: '火候失準' }

export function craftChance(r: Recipe, fire: FireResult, alchemyBonus: number) {
  return Math.max(0.05, Math.min(0.98, r.base + alchemyBonus + FIRE_BONUS[fire]))
}

const HERB_WEIGHT: Record<number, number> = { 1: 60, 2: 25, 3: 10, 4: 4, 5: 1 }

/** 採藥一次：回傳 { herbId: 數量 } */
export function rollGather(stage: number, rand = Math.random): Record<string, number> {
  const pool = ITEMS.filter((i) => i.kind === 'herb' && (i.minStage ?? 0) <= stage)
  const total = pool.reduce((s, i) => s + HERB_WEIGHT[i.rarity], 0)
  const out: Record<string, number> = {}
  const picks = 2 + Math.floor(rand() * 3) + Math.floor(stage / 8)
  for (let n = 0; n < picks; n++) {
    let x = rand() * total
    for (const i of pool) {
      if ((x -= HERB_WEIGHT[i.rarity]) < 0) { out[i.id] = (out[i.id] ?? 0) + 1; break }
    }
  }
  return out
}
