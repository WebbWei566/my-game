import { get, set, del } from 'idb-keyval'
import { normalize, type PlayerState } from './player'
import { ITEMS } from '../data/items'
import { TECHNIQUES } from '../data/techniques'
import { DUNGEONS } from '../data/dungeons'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { MAX_STAGE } from '../data/realms'

export const SAVE_VERSION = 2
const KEY = 'wendao-save'

export type SaveData = PlayerState & { version: number }

/** 存檔版本遷移：結構「改名／改型別」時在這裡加步驟；單純新增欄位交給 normalize */
export function migrate(raw: any): SaveData | null {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return null
  let d = { ...raw }
  if (d.version === 1) {
    // v1 → v2：pills 數量改放進背包
    d.inventory = { pill_break: d.pills ?? 0 }
    delete d.pills
    d.version = 2
  }
  if (d.version !== SAVE_VERSION) return null
  return { ...sanitize(normalize(d)), version: SAVE_VERSION }
}

/**
 * 清除存檔中已不存在的 id 與不合理的數值，避免匯入壞檔或內容改版後遊戲崩潰
 */
export function sanitize(p: PlayerState): PlayerState {
  const items = new Set(ITEMS.map((i) => i.id))
  const techs = new Set(TECHNIQUES.map((t) => t.id))
  const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback)

  p.stage = Math.max(0, Math.min(MAX_STAGE, Math.floor(num(p.stage))))
  p.cultivation = Math.max(0, num(p.cultivation))
  p.rebirths = Math.max(0, Math.floor(num(p.rebirths)))
  if (!SPIRIT_ROOTS.some((r) => r.id === p.rootId)) p.rootId = SPIRIT_ROOTS[0].id
  p.inventory = Object.fromEntries(
    Object.entries(p.inventory).filter(([id, n]) => items.has(id) && num(n) > 0).map(([id, n]) => [id, Math.floor(n)]))
  p.techniques = [...new Set(p.techniques.filter((id) => techs.has(id)))]
  if (!p.techniques.includes('t_tuna')) p.techniques.unshift('t_tuna')
  if (!p.techniques.includes(p.mainTech)) p.mainTech = 't_tuna'
  p.plots = p.plots.map((x) => (x && items.has(x.herb) && num(x.readyAt) > 0 ? x : null))
  if (p.run && !DUNGEONS.some((d) => d.id === p.run!.dungeonId)) p.run = null
  if (p.run && (!p.run.map?.layers?.length || typeof p.run.at !== 'string')) p.run = null
  p.buffs = p.buffs.filter((b) => num(b.mult) > 0 && num(b.until) > 0)
  return p
}

export async function loadSave(): Promise<SaveData | null> {
  try {
    const v = await get(KEY)
    if (v) return migrate(v)
  } catch { /* IndexedDB 不可用 */ }
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return null
  }
}

export async function writeSave(data: SaveData) {
  try {
    await set(KEY, data)
  } catch {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* 無法存檔 */ }
  }
}

export async function clearSave() {
  try { await del(KEY) } catch { /* ignore */ }
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

/** 匯出成可複製的存檔碼（支援中文的 Base64） */
export function exportCode(data: SaveData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export function importCode(code: string): SaveData | null {
  try {
    const bin = atob(code.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return migrate(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}
