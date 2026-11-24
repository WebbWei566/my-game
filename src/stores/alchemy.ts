// 丹房：採藥、靈田、煉丹
import type { useGame } from './game'
import { BALANCE, plotCount } from '../core/formulas'
import { itemById } from '../data/items'
import { RECIPES, craftChance, rollGather, type FireResult } from '../data/recipes'
import { play } from '../core/sfx'

type Game = ReturnType<typeof useGame>

/** 採藥：消耗一次機會 */
export function gather(g: Game): Record<string, number> | null {
  if (g.p.gatherCharges <= 0) return null
  if (g.p.gatherCharges >= BALANCE.gatherMax) g.p.gatherAt = Date.now()
  g.p.gatherCharges--
  const got = rollGather(g.p.stage)
  for (const [id, n] of Object.entries(got)) g.addItem(id, n)
  play('coin')
  g.addLog('入山採藥，得 ' + Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、'), 'good')
  g.stat('gathers')
  g.save()
  return got
}

/** 以一株靈草為種，種在第 i 格 */
export function plant(g: Game, i: number, herbId: string): boolean {
  const it = itemById(herbId)
  if (it.kind !== 'herb' || i >= plotCount(g.p.stage) || g.p.plots[i] || g.count(herbId) <= 0) return false
  g.addItem(herbId, -1)
  const now = Date.now()
  g.p.plots[i] = { herb: herbId, plantedAt: now, readyAt: now + BALANCE.growSec[it.rarity] * 1000 }
  g.stat('planted')
  g.save()
  return true
}

export function harvest(g: Game, i: number): number {
  const plot = g.p.plots[i]
  if (!plot || Date.now() < plot.readyAt) return 0
  const n = BALANCE.harvestMin + Math.floor(Math.random() * (BALANCE.harvestMax - BALANCE.harvestMin + 1))
  g.addItem(plot.herb, n)
  g.p.plots[i] = null
  g.stat('harvested', n)
  g.addLog(`靈田收成：${itemById(plot.herb).name}×${n}`, 'good')
  play('coin')
  g.save()
  return n
}

export function canCraft(g: Game, recipeId: string): boolean {
  const r = RECIPES.find((x) => x.id === recipeId)
  return !!r && g.p.stage >= r.minStage && Object.entries(r.inputs).every(([id, n]) => g.count(id) >= n)
}

/** 煉丹：回傳產出數量（0 = 失敗），材料不足回傳 null */
export function craft(g: Game, recipeId: string, fire: FireResult): number | null {
  const r = RECIPES.find((x) => x.id === recipeId)
  if (!r || !g.canCraft(recipeId) || !g.takeItems(r.inputs)) return null
  const name = itemById(r.output).name
  g.stat('crafts')
  if (Math.random() >= craftChance(r, fire, g.tech.alchemy ?? 0)) {
    g.addLog(`煉製${name}失敗，丹爐中只剩一團焦黑藥渣。`, 'bad')
    play('fail')
    g.save()
    return 0
  }
  const n = fire === 'perfect' && Math.random() < 0.5 ? 2 : 1
  g.addItem(r.output, n)
  g.stat('craftSuccess')
  g.addLog(n > 1 ? `丹成雙枚！得${name}×2。` : `煉成${name}。`, 'good')
  play('craft')
  g.save()
  return n
}
