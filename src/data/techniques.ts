// 功法（主修心法）：同時只能主修一部，提供被動加成與戰鬥武技
export type Grade = 1 | 2 | 3 | 4 | 5
export const GRADE_NAME: Record<Grade, string> = { 1: '凡品', 2: '黃階', 3: '玄階', 4: '地階', 5: '天階' }

export interface Skill { name: string; power: number; cost: number; desc: string }

export interface Technique {
  id: string
  name: string
  grade: Grade
  desc: string
  /** 主修所需境界 */
  minStage: number
  speed?: number
  tap?: number
  offline?: number
  /** 大境界突破（渡劫）成功率加成 */
  breakMajor?: number
  /** 煉丹成功率加成 */
  alchemy?: number
  atk?: number
  def?: number
  hp?: number
  /** 特定靈根額外修煉倍率 */
  rootBonus?: Record<string, number>
  skill?: Skill
}

export const DEFAULT_SKILL: Skill = { name: '御劍術', power: 1.6, cost: 10, desc: '以靈力驅劍，造成 160% 傷害。' }

export const TECHNIQUES: Technique[] = [
  { id: 't_tuna', name: '吐納訣', grade: 1, minStage: 0, desc: '入門吐納法門，人人皆可修習。' },
  {
    id: 't_qingyuan', name: '青元功', grade: 2, minStage: 2, speed: 1.2, def: 1.1,
    desc: '中正平和的正宗心法，修煉 ×1.2。',
  },
  {
    id: 't_danxin', name: '丹心訣', grade: 2, minStage: 2, speed: 1.1, alchemy: 0.15,
    desc: '丹道宗師所傳，煉丹成功率 +15%。',
  },
  {
    id: 't_wuxing', name: '五行歸元經', grade: 3, minStage: 4, speed: 1.25, offline: 0.2,
    rootBonus: { mixed: 1.4 },
    desc: '雜而能精，五行雜靈根修煉額外 ×1.4；離線效率 +20%。',
  },
  {
    id: 't_leiyin', name: '雷音淬體訣', grade: 3, minStage: 4, speed: 1.15, breakMajor: 0.1, atk: 1.25, hp: 1.2,
    skill: { name: '掌心雷', power: 2.2, cost: 18, desc: '引雷入掌，造成 220% 傷害。' },
    desc: '以雷淬體，渡劫 +10%，攻擊與氣血提升。',
  },
  {
    id: 't_taixu', name: '太虛劍典', grade: 4, minStage: 8, speed: 1.5, atk: 1.5, tap: 1.5,
    skill: { name: '太虛一劍', power: 3, cost: 25, desc: '一劍破虛空，造成 300% 傷害。' },
    desc: '上古劍修傳承，修煉 ×1.5，攻擊 ×1.5。',
  },
  {
    id: 't_hongmeng', name: '鴻蒙造化功', grade: 5, minStage: 16, speed: 2.2, offline: 0.3, breakMajor: 0.15,
    atk: 1.6, def: 1.5, hp: 1.6, tap: 2,
    skill: { name: '造化神光', power: 4, cost: 35, desc: '鴻蒙紫氣化作神光，造成 400% 傷害。' },
    desc: '開天闢地之功，諸般加成。',
  },
]

const MAP = new Map(TECHNIQUES.map((t) => [t.id, t]))
export const techById = (id: string): Technique => MAP.get(id) ?? TECHNIQUES[0]

/** 藏經閣兌換價格（妖丹） */
export const techPrice = (t: Technique) => [0, 0, 6, 15, 40, 120][t.grade]

/** 把功法加成轉成可讀文字 */
export function techEffectText(t: Technique): string[] {
  const out: string[] = []
  const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`
  if (t.speed) out.push(`修煉 ×${t.speed}`)
  if (t.tap) out.push(`打坐 ×${t.tap}`)
  if (t.offline) out.push(`離線 ${pct(t.offline)}`)
  if (t.breakMajor) out.push(`渡劫 ${pct(t.breakMajor)}`)
  if (t.alchemy) out.push(`煉丹 ${pct(t.alchemy)}`)
  if (t.atk) out.push(`攻擊 ×${t.atk}`)
  if (t.def) out.push(`防禦 ×${t.def}`)
  if (t.hp) out.push(`氣血 ×${t.hp}`)
  for (const [root, m] of Object.entries(t.rootBonus ?? {})) out.push(`${root === 'mixed' ? '雜靈根' : root} ×${m}`)
  if (t.skill) out.push(`武技「${t.skill.name}」`)
  return out.length ? out : ['無特殊加成']
}
