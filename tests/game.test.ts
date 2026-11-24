// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGame } from '../src/stores/game'
import { requiredFor, BALANCE } from '../src/core/formulas'
import { migrate } from '../src/core/save'
import { MAX_STAGE } from '../src/data/realms'

function fresh() {
  setActivePinia(createPinia())
  const g = useGame()
  g.newGame()
  return g
}

describe('修煉與突破', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('開新局後可修煉並小境界突破', () => {
    const g = fresh()
    g.gain(1e9)
    expect(g.p.cultivation).toBe(requiredFor(0))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    g.tryBreak(null)
    expect(g.p.stage).toBe(1)
    expect(g.p.cultivation).toBe(0)
  })

  it('大境界突破進入渡劫，失敗扣修為', () => {
    const g = fresh()
    g.p.stage = 3
    g.gain(1e9)
    g.tryBreak(null)
    expect(g.tribulation).toBe(true)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    g.finishTribulation(0)
    expect(g.p.stage).toBe(3)
    expect(g.p.cultivation).toBeCloseTo(requiredFor(3) * (1 - BALANCE.failLossPct))
  })

  it('突破丹藥會被消耗並提高成功率；渡劫丹不能用於小境界', () => {
    const g = fresh()
    g.addItem('pill_break', 1)
    g.addItem('pill_dujie', 1)
    g.gain(1e9)
    expect(g.breakItems).toEqual(['pill_break'])
    expect(g.breakChance('pill_break')).toBeGreaterThan(g.breakChance(null))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    g.tryBreak('pill_break')
    expect(g.count('pill_break')).toBe(0)
    g.p.stage = 3
    g.gain(1e9)
    expect(g.breakItems).toContain('pill_dujie')
  })

  it('最高境界不再累積修為', () => {
    const g = fresh()
    g.p.stage = MAX_STAGE
    g.gain(100)
    expect(g.p.cultivation).toBe(0)
    expect(g.canBreak).toBe(false)
  })
})

describe('離線與時間', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('離線收益有上限、時間倒退不給收益', () => {
    const g = fresh()
    g.p.stage = 20
    g.settleOffline(Date.now() - 100 * 3600 * 1000)
    const capped = BALANCE.offlineCapHours * 3600 * g.perSec * BALANCE.offlineRate
    expect(g.p.cultivation).toBeCloseTo(Math.min(capped, g.required), -2)
    g.p.cultivation = 5
    g.settleOffline(Date.now() + 3600 * 1000)
    expect(g.p.cultivation).toBe(5)
  })

  it('採藥次數隨時間回復且有上限', () => {
    const g = fresh()
    g.p.gatherCharges = 0
    g.p.gatherAt = Date.now() - BALANCE.gatherSec * 2.5 * 1000
    g.now = Date.now()
    g.updateGather()
    expect(g.p.gatherCharges).toBe(2)
    g.p.gatherAt = Date.now() - BALANCE.gatherSec * 100 * 1000
    g.updateGather()
    expect(g.p.gatherCharges).toBe(BALANCE.gatherMax)
  })
})

describe('物品', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('聚氣丹增加修為、悟心丹增加速度', () => {
    const g = fresh()
    g.addItem('pill_juqi', 1)
    g.useItem('pill_juqi')
    expect(g.p.cultivation).toBeCloseTo(requiredFor(0) * 0.25)
    expect(g.count('pill_juqi')).toBe(0)
    const before = g.perSec
    g.addItem('pill_wuxin', 1)
    g.useItem('pill_wuxin')
    expect(g.perSec).toBeCloseTo(before * 2)
  })

  it('takeItems 數量不足時不扣', () => {
    const g = fresh()
    g.addItem('herb_lingcao', 2)
    const before = g.count('herb_lingcao')
    expect(g.takeItems({ herb_lingcao: 99 })).toBe(false)
    expect(g.count('herb_lingcao')).toBe(before)
  })
})

describe('存檔', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('存檔碼匯出匯入可還原', () => {
    const g = fresh()
    g.p.stage = 7; g.p.cultivation = 123; g.addItem('pill_break', 3)
    const code = g.exportCode()
    setActivePinia(createPinia())
    const g2 = useGame()
    expect(g2.importCode(code)).toBe(true)
    expect([g2.p.stage, g2.count('pill_break'), g2.p.cultivation]).toEqual([7, 3, 123])
    expect(g2.importCode('garbage!!')).toBe(false)
  })

  it('v1 存檔可遷移到目前版本', () => {
    const d = migrate({ version: 1, rootId: 'dual', stage: 5, cultivation: 50, pills: 2, lastSaved: 1, createdAt: 1 })!
    expect(d).not.toBeNull()
    expect(d.inventory.pill_break).toBe(2)
    expect(d.mainTech).toBe('t_tuna')
    expect(d.stage).toBe(5)
  })
})

describe('功法', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('主修需達境界，切換後修煉速度改變', () => {
    const g = fresh()
    g.learnTechnique('t_qingyuan')
    expect(g.setMainTech('t_qingyuan')).toBe(false) // 境界不足
    g.p.stage = 2
    const before = g.perSec
    expect(g.setMainTech('t_qingyuan')).toBe(true)
    expect(g.perSec).toBeCloseTo(before * 1.2)
  })

  it('五行歸元經對雜靈根有額外加成', () => {
    const g = fresh()
    g.p.rootId = 'mixed'; g.p.stage = 4
    g.learnTechnique('t_wuxing'); g.setMainTech('t_wuxing')
    expect(g.speedMult).toBeCloseTo(0.8 * 1.25 * 1.4)
  })

  it('藏經閣扣妖丹兌換功法，不足時失敗', () => {
    const g = fresh()
    expect(g.buyTechnique('t_qingyuan')).toBe(false)
    g.addItem('mat_yaodan', 10)
    expect(g.buyTechnique('t_qingyuan')).toBe(true)
    expect(g.p.techniques).toContain('t_qingyuan')
    expect(g.count('mat_yaodan')).toBe(4)
    expect(g.buyTechnique('t_qingyuan')).toBe(false) // 不能重複購買
  })
})

describe('丹房', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('採藥消耗次數並獲得已解鎖的靈草', () => {
    const g = fresh()
    const charges = g.p.gatherCharges
    const got = g.gather()!
    expect(g.p.gatherCharges).toBe(charges - 1)
    expect(Object.keys(got).every((id) => ['herb_lingcao', 'herb_ningxue'].includes(id))).toBe(true)
    g.p.gatherCharges = 0
    expect(g.gather()).toBeNull()
  })

  it('煉丹成功產出丹藥並扣材料；材料不足回傳 null', () => {
    const g = fresh()
    g.p.inventory = { herb_lingcao: 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // perfect 成功率 98% > 0.9 → 成功；0.9 ≥ 0.5 → 不會雙枚
    expect(g.craft('r_juqi', 'perfect')).toBe(1)
    expect(g.count('pill_juqi')).toBe(1)
    expect(g.count('herb_lingcao')).toBe(0)
    expect(g.craft('r_juqi', 'perfect')).toBeNull()
  })

  it('煉丹失敗仍消耗材料', () => {
    const g = fresh()
    g.p.inventory = { herb_lingcao: 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(g.craft('r_juqi', 'miss')).toBe(0)
    expect(g.count('herb_lingcao')).toBe(0)
  })

  it('境界不足無法煉製高階丹方', () => {
    const g = fresh()
    g.p.inventory = { herb_lingcao: 3, herb_zhuguo: 1 }
    expect(g.canCraft('r_break')).toBe(false)
    g.p.stage = 2
    expect(g.canCraft('r_break')).toBe(true)
  })
})

describe('奇遇', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('事件資料完整：至少 20 則、id 不重複、物品與功法 id 皆存在', async () => {
    const { EVENTS } = await import('../src/data/events')
    const { itemById } = await import('../src/data/items')
    const { TECHNIQUES } = await import('../src/data/techniques')
    expect(EVENTS.length).toBeGreaterThanOrEqual(20)
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length)
    for (const e of EVENTS) for (const c of e.choices) for (const eff of [c.success, c.fail, { items: c.cost }]) {
      for (const id of Object.keys(eff?.items ?? {})) expect(() => itemById(id)).not.toThrow()
      if (eff && 'technique' in eff && eff.technique) expect(TECHNIQUES.some((t) => t.id === eff.technique)).toBe(true)
    }
  })

  it('pickEvent 遵守境界限制與一次性旗標', async () => {
    const { pickEvent, EVENTS } = await import('../src/data/events')
    for (let i = 0; i < 200; i++) {
      const e = pickEvent(0, {})!
      expect(e.minStage ?? 0).toBe(0)
    }
    const seen = Object.fromEntries(EVENTS.filter((e) => e.once).map((e) => ['ev_' + e.id, true]))
    for (let i = 0; i < 200; i++) expect(pickEvent(30, seen)!.once).toBeFalsy()
  })

  it('需要花費的選項：不足時不能選，足夠時扣除', async () => {
    const { EVENTS } = await import('../src/data/events')
    const g = fresh()
    g.activeEvent = EVENTS.find((e) => e.id === 'merchant')!
    g.chooseEvent(0)
    expect(g.activeEvent).not.toBeNull() // 妖丹不足，沒有反應
    g.addItem('mat_yaodan', 2)
    g.chooseEvent(0)
    expect(g.activeEvent).toBeNull()
    expect(g.count('pill_break')).toBe(1)
    expect(g.count('mat_yaodan')).toBe(0)
  })

  it('一次性功法事件會記錄旗標並習得功法', async () => {
    const { EVENTS } = await import('../src/data/events')
    const g = fresh()
    g.activeEvent = EVENTS.find((e) => e.id === 'ancient-scroll')!
    g.chooseEvent(0)
    expect(g.p.flags['ev_ancient-scroll']).toBe(true)
    expect(g.p.techniques).toContain('t_qingyuan')
  })
})

describe('成就', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('達成條件時解鎖並發放獎勵，且只發一次', () => {
    const g = fresh()
    const before = g.count('herb_lingcao')
    g.p.stage = 1
    g.checkAchievements()
    expect(g.p.achievements).toContain('a_stage1')
    expect(g.count('herb_lingcao')).toBe(before + 5)
    g.checkAchievements()
    expect(g.count('herb_lingcao')).toBe(before + 5)
  })

  it('成就資料：id 不重複、獎勵物品存在', async () => {
    const { ACHIEVEMENTS } = await import('../src/data/achievements')
    const { itemById } = await import('../src/data/items')
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    for (const a of ACHIEVEMENTS) for (const id of Object.keys(a.reward ?? {})) expect(() => itemById(id)).not.toThrow()
  })
})

describe('新手引導', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('分頁隨境界解鎖，未解鎖時無法切換', () => {
    const g = fresh()
    expect(g.tabUnlocked('dungeon')).toBe(false)
    g.openTab('dungeon')
    expect(g.tab).toBe('cultivate')
    g.p.stage = 2
    g.checkUnlocks()
    expect(g.p.flags.new_dungeon).toBe(true)
    g.openTab('dungeon')
    expect(g.tab).toBe('dungeon')
    expect(g.p.flags.new_dungeon).toBeUndefined()
  })
})
