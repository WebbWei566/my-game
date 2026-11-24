// 境界資料：資料驅動，要加境界只改這裡
export interface MajorRealm {
  id: string
  name: string
  /** 突破進入此大境界時是否需要渡劫 */
  tribulation: boolean
}

export const MAJOR_REALMS: MajorRealm[] = [
  { id: 'qi', name: '煉氣', tribulation: false },
  { id: 'foundation', name: '築基', tribulation: true },
  { id: 'core', name: '結丹', tribulation: true },
  { id: 'nascent', name: '元嬰', tribulation: true },
  { id: 'spirit', name: '化神', tribulation: true },
  { id: 'void', name: '煉虛', tribulation: true },
  { id: 'unity', name: '合體', tribulation: true },
  { id: 'mahayana', name: '大乘', tribulation: true },
  { id: 'ascension', name: '渡劫', tribulation: true },
]

export const SUB_STAGES = ['初期', '中期', '後期', '圓滿'] as const

export const MAX_STAGE = MAJOR_REALMS.length * SUB_STAGES.length - 1

export function stageInfo(stage: number) {
  const major = MAJOR_REALMS[Math.floor(stage / SUB_STAGES.length)]
  const sub = SUB_STAGES[stage % SUB_STAGES.length]
  return { major, sub, label: `${major.name}${sub}`, isMajorGate: (stage + 1) % SUB_STAGES.length === 0 }
}
