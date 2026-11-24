import { get, set, del } from 'idb-keyval'
import { normalize, type PlayerState } from './player'

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
  return { ...normalize(d), version: SAVE_VERSION }
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
