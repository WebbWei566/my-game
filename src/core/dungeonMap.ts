// 秘境節點地圖產生器（分層、有向，類似爬塔）
export type NodeType = 'start' | 'battle' | 'elite' | 'event' | 'treasure' | 'rest' | 'boss'

export interface MapNode { id: string; layer: number; type: NodeType; next: string[] }
export interface DungeonMap { layers: MapNode[][] }

export const NODE_INFO: Record<NodeType, { icon: string; label: string }> = {
  start: { icon: '⛩', label: '入口' },
  battle: { icon: '⚔', label: '妖獸' },
  elite: { icon: '💀', label: '精英' },
  event: { icon: '❓', label: '奇遇' },
  treasure: { icon: '🎁', label: '寶箱' },
  rest: { icon: '🔥', label: '休憩' },
  boss: { icon: '👑', label: '首領' },
}

const WEIGHTS: [NodeType, number][] = [['battle', 45], ['event', 15], ['treasure', 14], ['rest', 10], ['elite', 16]]

function pickType(layer: number, total: number, rand: () => number): NodeType {
  // 第一層不出精英；倒數第二層必定休憩點機率提高
  const ws = WEIGHTS.map(([t, w]): [NodeType, number] =>
    [t, t === 'elite' && layer <= 1 ? 0 : t === 'rest' && layer === total - 2 ? w * 3 : w])
  const sum = ws.reduce((s, [, w]) => s + w, 0)
  let x = rand() * sum
  for (const [t, w] of ws) if ((x -= w) < 0) return t
  return 'battle'
}

export function generateMap(layerCount: number, rand = Math.random): DungeonMap {
  const layers: MapNode[][] = []
  for (let l = 0; l < layerCount; l++) {
    const first = l === 0
    const last = l === layerCount - 1
    const width = first || last ? 1 : 2 + Math.floor(rand() * 2)
    layers.push(Array.from({ length: width }, (_, i) => ({
      id: `${l}-${i}`, layer: l, next: [],
      type: first ? 'start' : last ? 'boss' : pickType(l, layerCount, rand),
    })))
  }
  // 連線：每個節點連到下一層相鄰位置，並保證下一層每個節點至少有一條入線
  for (let l = 0; l < layerCount - 1; l++) {
    const cur = layers[l]
    const nxt = layers[l + 1]
    const pos = (i: number, len: number) => (len === 1 ? 0.5 : i / (len - 1))
    for (const [i, n] of cur.entries()) {
      const p = pos(i, cur.length)
      const sorted = [...nxt.keys()].sort((a, b) => Math.abs(pos(a, nxt.length) - p) - Math.abs(pos(b, nxt.length) - p))
      const count = Math.min(nxt.length, 1 + (rand() < 0.5 ? 1 : 0))
      n.next = sorted.slice(0, count).map((j) => nxt[j].id)
    }
    for (const [j, m] of nxt.entries()) {
      if (!cur.some((n) => n.next.includes(m.id))) {
        const p = pos(j, nxt.length)
        const closest = [...cur].sort((a, b) =>
          Math.abs(pos(cur.indexOf(a), cur.length) - p) - Math.abs(pos(cur.indexOf(b), cur.length) - p))[0]
        closest.next.push(m.id)
      }
    }
  }
  return { layers }
}

export function findNode(map: DungeonMap, id: string): MapNode {
  const l = Number(id.split('-')[0])
  const n = map.layers[l]?.find((x) => x.id === id)
  if (!n) throw new Error(`Unknown node ${id}`)
  return n
}
