// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGame } from '../src/stores/game'
import { requiredFor, BALANCE } from '../src/core/formulas'
import { MAX_STAGE } from '../src/data/realms'

describe('game store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('開新局後可修煉並小境界突破', () => {
    const g = useGame()
    g.newGame()
    expect(g.started).toBe(true)
    g.gain(1e9)
    expect(g.cultivation).toBe(requiredFor(0)) // 修為不超過上限
    vi.spyOn(Math, 'random').mockReturnValue(0)
    g.tryBreak(false)
    expect(g.stage).toBe(1)
    expect(g.cultivation).toBe(0)
    vi.restoreAllMocks()
  })

  it('大境界突破會進入渡劫，失敗扣修為', () => {
    const g = useGame()
    g.newGame()
    g.stage = 3 // 煉氣圓滿 → 築基
    g.gain(1e9)
    g.tryBreak(false)
    expect(g.tribulation).toBe(true)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    g.finishTribulation(0)
    expect(g.stage).toBe(3)
    expect(g.cultivation).toBeCloseTo(requiredFor(3) * (1 - BALANCE.failLossPct))
    vi.restoreAllMocks()
  })

  it('離線收益有上限、時間倒退不給收益', () => {
    const g = useGame()
    g.newGame()
    g.stage = 20
    g.settleOffline(Date.now() - 100 * 3600 * 1000)
    const capped = BALANCE.offlineCapHours * 3600 * g.perSec * BALANCE.offlineRate
    expect(g.cultivation).toBeCloseTo(Math.min(capped, g.required), -2)
    g.cultivation = 5
    g.settleOffline(Date.now() + 3600 * 1000)
    expect(g.cultivation).toBe(5)
  })

  it('存檔碼匯出匯入可還原', () => {
    const g = useGame()
    g.newGame()
    g.stage = 7; g.pills = 3; g.cultivation = 123
    const code = g.exportCode()
    setActivePinia(createPinia())
    const g2 = useGame()
    expect(g2.importCode(code)).toBe(true)
    expect([g2.stage, g2.pills, g2.cultivation]).toEqual([7, 3, 123])
    expect(g2.importCode('garbage!!')).toBe(false)
  })

  it('最高境界不再累積修為', () => {
    const g = useGame()
    g.newGame()
    g.stage = MAX_STAGE
    g.gain(100)
    expect(g.cultivation).toBe(0)
    expect(g.canBreak).toBe(false)
  })
})
