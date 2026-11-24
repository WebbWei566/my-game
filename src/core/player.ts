// 玩家持久化狀態（即存檔內容），新增欄位時在 defaultPlayer 補預設值即可自動相容舊檔
import type { DungeonMap } from './dungeonMap'
import type { BattleState } from './battle'

export interface Buff { id: string; mult: number; until: number }

export interface DungeonRun {
  dungeonId: string
  map: DungeonMap
  at: string
  visited: string[]
  hp: number
  mp: number
  loot: Record<string, number>
  battle: BattleState | null
}

export interface PlayerState {
  rootId: string
  stage: number
  cultivation: number
  inventory: Record<string, number>
  techniques: string[]
  mainTech: string
  buffs: Buff[]
  gatherCharges: number
  gatherAt: number
  stats: Record<string, number>
  achievements: string[]
  flags: Record<string, boolean>
  run: DungeonRun | null
  lastSaved: number
  createdAt: number
}

export function defaultPlayer(now = Date.now()): PlayerState {
  return {
    rootId: 'mixed',
    stage: 0,
    cultivation: 0,
    inventory: {},
    techniques: ['t_tuna'],
    mainTech: 't_tuna',
    buffs: [],
    gatherCharges: 3,
    gatherAt: now,
    stats: {},
    achievements: [],
    flags: {},
    run: null,
    lastSaved: now,
    createdAt: now,
  }
}

/** 把任意舊資料補齊成完整 PlayerState */
export function normalize(raw: Partial<PlayerState>): PlayerState {
  const d = defaultPlayer()
  const p = { ...d, ...raw } as PlayerState
  p.inventory = { ...(raw.inventory ?? {}) }
  p.stats = { ...(raw.stats ?? {}) }
  p.flags = { ...(raw.flags ?? {}) }
  p.techniques = [...(raw.techniques ?? d.techniques)]
  p.buffs = [...(raw.buffs ?? [])]
  p.achievements = [...(raw.achievements ?? [])]
  if (!p.techniques.includes('t_tuna')) p.techniques.unshift('t_tuna')
  if (!p.techniques.includes(p.mainTech)) p.mainTech = 't_tuna'
  return p
}
