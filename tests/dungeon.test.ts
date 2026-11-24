// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGame } from '../src/stores/game'
import { generateMap, findNode } from '../src/core/dungeonMap'
import { makeFoe, playTurn, playerStats } from '../src/core/battle'
import { DUNGEONS, ENEMIES, enemyById } from '../src/data/dungeons'
import { itemById } from '../src/data/items'

function fresh() {
  setActivePinia(createPinia())
  const g = useGame()
  g.newGame()
  return g
}

describe('地圖產生', () => {
  it('每層節點都可到達、最後一層是首領、所有路徑都能走到終點', () => {
    for (let k = 0; k < 300; k++) {
      const m = generateMap(4 + (k % 6))
      const L = m.layers.length
      expect(m.layers[0][0].type).toBe('start')
      expect(m.layers[L - 1]).toHaveLength(1)
      expect(m.layers[L - 1][0].type).toBe('boss')
      for (let l = 1; l < L; l++) {
        for (const n of m.layers[l]) expect(m.layers[l - 1].some((p) => p.next.includes(n.id))).toBe(true)
      }
      for (let l = 0; l < L - 1; l++) {
        for (const n of m.layers[l]) {
          expect(n.next.length).toBeGreaterThan(0)
          for (const t of n.next) expect(findNode(m, t).layer).toBe(l + 1)
        }
      }
      expect(m.layers[1].some((n) => n.type === 'elite')).toBe(false)
    }
  })
})

describe('戰鬥引擎', () => {
  it('攻擊造成傷害、妖獸反擊、擊敗後結束', () => {
    const foe = makeFoe('wolf', 0, 'normal')
    const b = { foe, turn: 0, log: [] as string[], over: null as any }
    const me = { hp: 1e6, mp: 50, stats: { ...playerStats(10, {}), maxHp: 1e6 } }
    while (!b.over) playTurn(b, me, { type: 'attack' }, () => 0.5)
    expect(b.over).toBe('win')
    expect(foe.hp).toBe(0)
  })

  it('靈力不足無法施展武技且不消耗回合', () => {
    const b = { foe: makeFoe('wolf', 0, 'normal'), turn: 0, log: [] as string[], over: null as any }
    const me = { hp: 100, mp: 0, stats: playerStats(0, {}) }
    playTurn(b, me, { type: 'skill', skill: { name: 'x', power: 2, cost: 10, desc: '' } })
    expect(b.turn).toBe(0)
    expect(me.hp).toBe(100)
  })

  it('首領戰無法逃跑', () => {
    const b = { foe: makeFoe('wolf_king', 0, 'boss'), turn: 0, log: [] as string[], over: null as any }
    const me = { hp: 1e6, mp: 0, stats: { ...playerStats(0, {}), maxHp: 1e6 } }
    playTurn(b, me, { type: 'flee' }, () => 0)
    expect(b.over).toBeNull()
  })

  it('資料完整：秘境引用的妖獸、靈草、獎勵都存在', () => {
    for (const d of DUNGEONS) {
      for (const id of [...d.enemies, ...d.elites, d.boss]) expect(() => enemyById(id)).not.toThrow()
      for (const id of [...d.herbs, ...Object.keys(d.firstClear)]) expect(() => itemById(id)).not.toThrow()
    }
    expect(new Set(ENEMIES.map((e) => e.id)).size).toBe(ENEMIES.length)
  })
})

describe('秘境流程', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('境界不足無法進入，進入後不能重複進入', () => {
    const g = fresh()
    expect(g.enterDungeon('d_wind')).toBe(false)
    expect(g.enterDungeon('d_wolf')).toBe(true)
    expect(g.enterDungeon('d_wolf')).toBe(false)
  })

  it('只能移動到相鄰節點；戰鬥中不能移動或撤離', () => {
    const g = fresh()
    g.enterDungeon('d_wolf')
    const run = g.p.run!
    const far = run.map.layers[3][0].id
    expect(g.moveTo(far)).toBe(false)
    // 強制下一步是戰鬥
    const next = findNode(run.map, run.at).next[0]
    findNode(run.map, next).type = 'battle'
    expect(g.moveTo(next)).toBe(true)
    expect(g.p.run!.battle).not.toBeNull()
    g.finishRun('leave')
    expect(g.p.run).not.toBeNull()
  })

  it('打通首領：獲得首通獎勵並標記通關；第二次沒有首通獎勵', () => {
    const g = fresh()
    g.p.stage = 30 // 碾壓
    for (const round of [1, 2]) {
      g.enterDungeon('d_wolf')
      while (g.p.run) {
        const run = g.p.run
        if (run.battle) {
          if (run.battle.over) g.closeBattle()
          else g.battleAction('attack')
          continue
        }
        if (g.activeEvent) g.activeEvent = null
        g.moveTo(findNode(run.map, run.at).next[0])
      }
      expect(g.p.flags.clear_d_wolf).toBe(true)
      if (round === 1) {
        expect(g.count('pill_break')).toBeGreaterThanOrEqual(1)
        expect(g.p.stats.dungeonClears).toBe(1)
      }
    }
    expect(g.p.stats.dungeonClears).toBe(2)
    expect(g.count('pill_break')).toBe(1) // 首通只給一次
  })

  it('戰敗失去一半戰利品', () => {
    const g = fresh()
    g.enterDungeon('d_wolf')
    const run = g.p.run!
    run.loot = { mat_yaodan: 5 }
    const next = findNode(run.map, run.at).next[0]
    findNode(run.map, next).type = 'battle'
    g.moveTo(next)
    g.p.run!.hp = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    while (!g.p.run!.battle!.over) g.battleAction('attack')
    expect(g.p.run!.battle!.over).toBe('lose')
    g.closeBattle()
    expect(g.p.run).toBeNull()
    expect(g.count('mat_yaodan')).toBe(2)
  })
})
