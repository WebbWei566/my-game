// @vitest-environment happy-dom
// UI 冒煙測試：實際掛載 App，點過每個畫面，確認沒有執行期錯誤
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }))

import App from '../src/App.vue'
import { useGame } from '../src/stores/game'
import { findNode } from '../src/core/dungeonMap'
import { clearSave } from '../src/core/save'

let errors: unknown[] = []
let w: VueWrapper

async function boot() {
  await clearSave()
  const pinia = createPinia()
  setActivePinia(pinia)
  w = mount(App, {
    global: { plugins: [pinia], config: { errorHandler: (e) => { errors.push(e) } } },
    attachTo: document.body,
  })
  await flushPromises()
  return useGame()
}

async function clickText(text: string) {
  const btn = w.findAll('button').find((b) => b.text().includes(text))
  if (!btn) throw new Error(`找不到按鈕：${text}\n${w.text().slice(0, 300)}`)
  await btn.trigger('click')
  await flushPromises()
}

describe('UI 冒煙測試', () => {
  beforeEach(() => { errors = []; vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { w?.unmount(); vi.restoreAllMocks() })

  it('開局 → 修煉 → 各分頁都能渲染', async () => {
    const g = await boot()
    expect(w.text()).toContain('問道長生')
    await clickText('測靈根')
    expect(w.text()).toContain('煉氣初期')

    await w.find('.seat').trigger('pointerdown', { clientX: 10, clientY: 10 })
    expect(g.p.stats.taps).toBe(1)

    g.p.stage = 6
    g.checkUnlocks()
    g.addItem('mat_yaodan', 50)
    g.addItem('pill_juqi', 1)
    await nextTick()
    for (const [tab, expectText] of [['丹房', '入山採藥'], ['功法', '藏經閣'], ['秘境', '青狼谷'], ['行囊', '聚氣丹'], ['修煉', '突破']]) {
      await clickText(tab)
      expect(w.text()).toContain(expectText)
    }
    expect(errors).toEqual([])
  })

  it('奇遇彈窗、設定、成就面板可開關', async () => {
    const g = await boot()
    await clickText('測靈根')
    const { EVENTS } = await import('../src/data/events')
    g.activeEvent = EVENTS[0]
    await nextTick()
    expect(w.text()).toContain(EVENTS[0].title)
    await clickText(EVENTS[0].choices[1].label)
    expect(g.activeEvent).toBeNull()

    await w.find('[aria-label="設定"]').trigger('click')
    await nextTick()
    expect(w.text()).toContain('匯出存檔')
    await clickText('關閉')
    await w.find('[aria-label="成就"]').trigger('click')
    await nextTick()
    expect(w.text()).toContain('初入仙途')
    expect(errors).toEqual([])
  })

  it('煉丹流程：開爐 → 火候 → 收丹', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const g = await boot()
    await clickText('測靈根')
    g.p.stage = 1
    g.checkUnlocks()
    await nextTick()
    await clickText('丹房')
    await clickText('開爐') // 聚氣丹：開局給 3 株靈草
    expect(w.text()).toContain('控制火候')
    await w.findAll('button').find((b) => b.text() === '收丹')!.trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(w.text()).not.toContain('控制火候')
    expect(g.p.stats.crafts).toBe(1)
    expect(errors).toEqual([])
    vi.useRealTimers()
  })

  it('秘境流程：進入 → 地圖 → 戰鬥 → 結束', async () => {
    const g = await boot()
    await clickText('測靈根')
    g.p.stage = 30
    g.checkUnlocks()
    await nextTick()
    await clickText('秘境')
    await w.findAll('.row').find((r) => r.text().includes('青狼谷'))!.find('button').trigger('click')
    await flushPromises()
    expect(w.find('.map').exists()).toBe(true)

    let guard = 0
    while (g.p.run && guard++ < 200) {
      const run = g.p.run
      if (g.activeEvent) { g.activeEvent = null; await nextTick(); continue }
      if (run.battle) {
        await clickText(run.battle.over ? (run.battle.over === 'lose' ? '敗退' : run.battle.foe.kind === 'boss' ? '通關' : '繼續') : '攻擊')
        continue
      }
      const prevAt = run.at
      const reachable = findNode(run.map, prevAt).next
      await w.findAll('.node:not([disabled])')[0].trigger('click')
      await flushPromises()
      if (g.p.run) {
        expect(g.p.run.at).not.toBe(prevAt)
        expect(reachable).toContain(g.p.run.at)
      }
    }
    expect(g.p.run).toBeNull()
    expect(w.text()).toContain('通關青狼谷')
    expect(errors).toEqual([])
  })

  it('渡劫小遊戲可以開始並結束', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const g = await boot()
    await clickText('測靈根')
    g.p.stage = 3
    g.gain(1e12)
    await nextTick()
    await clickText('渡劫突破')
    expect(w.text()).toContain('天劫降臨')
    vi.advanceTimersByTime(60_000)
    await flushPromises()
    expect(g.tribulation).toBe(false)
    expect(errors).toEqual([])
    vi.useRealTimers()
  })
})
