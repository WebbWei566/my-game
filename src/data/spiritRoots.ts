export interface SpiritRoot {
  id: string
  name: string
  desc: string
  /** 修煉速度倍率 */
  speed: number
  /** 抽中權重 */
  weight: number
}

export const SPIRIT_ROOTS: SpiritRoot[] = [
  { id: 'mixed', name: '五行雜靈根', desc: '資質平平，大器晚成。', speed: 0.8, weight: 40 },
  { id: 'triple', name: '三靈根', desc: '尚可一試仙途。', speed: 1.0, weight: 30 },
  { id: 'dual', name: '雙靈根', desc: '宗門爭相收徒。', speed: 1.3, weight: 18 },
  { id: 'thunder', name: '雷靈根', desc: '異靈根，渡劫較易。', speed: 1.5, weight: 8 },
  { id: 'heaven', name: '天靈根', desc: '萬中無一，修煉一日千里。', speed: 2.0, weight: 4 },
]

export function rollRoot(rand = Math.random): SpiritRoot {
  const total = SPIRIT_ROOTS.reduce((s, r) => s + r.weight, 0)
  let x = rand() * total
  for (const r of SPIRIT_ROOTS) {
    if ((x -= r.weight) < 0) return r
  }
  return SPIRIT_ROOTS[0]
}

export const rootById = (id: string) => SPIRIT_ROOTS.find((r) => r.id === id) ?? SPIRIT_ROOTS[0]
