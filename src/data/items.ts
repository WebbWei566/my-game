// 物品：靈草（材料）與丹藥
export type Rarity = 1 | 2 | 3 | 4 | 5
export const RARITY_NAME: Record<Rarity, string> = { 1: '凡', 2: '靈', 3: '玄', 4: '地', 5: '天' }

export interface PillEffect {
  /** 立即獲得當前境界所需修為的比例 */
  cultivationPct?: number
  /** 突破時服用的成功率加成 */
  breakBonus?: number
  /** 只能用於大境界（渡劫） */
  majorOnly?: boolean
  /** 戰鬥中回復最大生命比例 */
  healPct?: number
  /** 修煉速度增益 */
  buff?: { mult: number; durationSec: number }
}

export interface Item {
  id: string
  name: string
  kind: 'herb' | 'pill' | 'material'
  rarity: Rarity
  desc: string
  effect?: PillEffect
  /** 解鎖（可採集到）所需境界 */
  minStage?: number
}

export const ITEMS: Item[] = [
  { id: 'herb_lingcao', name: '靈草', kind: 'herb', rarity: 1, desc: '山野常見，蘊含微薄靈氣。', minStage: 0 },
  { id: 'herb_ningxue', name: '凝血花', kind: 'herb', rarity: 1, desc: '花瓣赤紅，可止血生肌。', minStage: 0 },
  { id: 'herb_zhuguo', name: '朱果', kind: 'herb', rarity: 2, desc: '三十年一結果，靈氣充沛。', minStage: 2 },
  { id: 'herb_xuanbing', name: '玄冰蓮', kind: 'herb', rarity: 3, desc: '生於寒潭，能定心神。', minStage: 4 },
  { id: 'herb_leiji', name: '雷擊木', kind: 'herb', rarity: 3, desc: '受天雷劈打而不朽之木。', minStage: 6 },
  { id: 'herb_longxian', name: '龍涎草', kind: 'herb', rarity: 4, desc: '傳說沾染真龍氣息的仙草。', minStage: 10 },
  { id: 'mat_yaodan', name: '妖丹', kind: 'material', rarity: 2, desc: '妖獸體內凝結的內丹，可換取靈石或入藥。' },

  { id: 'pill_juqi', name: '聚氣丹', kind: 'pill', rarity: 1, desc: '服用後立即獲得 25% 修為。', effect: { cultivationPct: 0.25 } },
  { id: 'pill_huichun', name: '回春丹', kind: 'pill', rarity: 1, desc: '戰鬥中服用，回復 40% 生命。', effect: { healPct: 0.4 } },
  { id: 'pill_break', name: '破境丹', kind: 'pill', rarity: 2, desc: '突破時服用，成功率 +20%。', effect: { breakBonus: 0.2 } },
  { id: 'pill_wuxin', name: '悟心丹', kind: 'pill', rarity: 3, desc: '十分鐘內修煉速度 ×2。', effect: { buff: { mult: 2, durationSec: 600 } } },
  { id: 'pill_dujie', name: '渡劫丹', kind: 'pill', rarity: 4, desc: '渡劫時服用，成功率 +35%。', effect: { breakBonus: 0.35, majorOnly: true } },
]

const MAP = new Map(ITEMS.map((i) => [i.id, i]))
export function itemById(id: string): Item {
  const it = MAP.get(id)
  if (!it) throw new Error(`Unknown item: ${id}`)
  return it
}
