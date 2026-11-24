import { get, set, del } from 'idb-keyval'

export const SAVE_VERSION = 1
const KEY = 'wendao-save'

export interface SaveData {
  version: number
  rootId: string
  stage: number
  cultivation: number
  pills: number
  lastSaved: number
  createdAt: number
}

/** 存檔版本遷移：之後改結構時在這裡加 case */
function migrate(raw: any): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  // if (raw.version === 1) { raw = { ...raw, newField: 0, version: 2 } }
  if (raw.version !== SAVE_VERSION) return null
  return raw as SaveData
}

export async function loadSave(): Promise<SaveData | null> {
  try {
    return migrate(await get(KEY))
  } catch {
    // IndexedDB 不可用時（例如部分隱私模式）退回 localStorage
    try {
      return migrate(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    } catch {
      return null
    }
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
