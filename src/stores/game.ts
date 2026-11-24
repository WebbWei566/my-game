import { defineStore } from 'pinia'
import { BALANCE, requiredFor, gainPerSec, breakthroughChance, fmt, fmtDuration } from '../core/formulas'
import { SAVE_VERSION, loadSave, writeSave, clearSave, exportCode, importCode, type SaveData } from '../core/save'
import { defaultPlayer, normalize, type PlayerState } from '../core/player'
import { stageInfo, MAX_STAGE } from '../data/realms'
import { rollRoot, rootById } from '../data/spiritRoots'
import { techById } from '../data/techniques'
import { itemById } from '../data/items'
import { EVENTS, type GameEvent, type EventEffect } from '../data/events'

export interface LogLine { id: number; text: string; kind: 'info' | 'good' | 'bad' }
export type Tab = 'cultivate' | 'techniques' | 'alchemy' | 'dungeon' | 'bag'

let logId = 0
let timer: number | undefined
let lastTick = 0
let saveCounter = 0

export const useGame = defineStore('game', {
  state: () => ({
    loaded: false,
    started: false,
    p: defaultPlayer() as PlayerState,
    tab: 'cultivate' as Tab,
    log: [] as LogLine[],
    activeEvent: null as GameEvent | null,
    /** 渡劫中：由 UI 顯示渡劫小遊戲 */
    tribulation: false,
    pendingBreakItem: null as string | null,
    now: Date.now(),
  }),

  getters: {
    root: (s) => rootById(s.p.rootId),
    tech: (s) => techById(s.p.mainTech),
    info: (s) => stageInfo(s.p.stage),
    required: (s) => requiredFor(s.p.stage),
    buffMult: (s) => s.p.buffs.filter((b) => b.until > s.now).reduce((m, b) => m * b.mult, 1),
    speedMult(): number {
      const t = this.tech
      return this.root.speed * (t.speed ?? 1) * (t.rootBonus?.[this.p.rootId] ?? 1) * this.buffMult
    },
    perSec(): number { return gainPerSec(this.p.stage, this.speedMult) },
    tapGain(): number { return this.perSec * BALANCE.tapSeconds * (this.tech.tap ?? 1) },
    progress(): number { return Math.min(this.p.cultivation / this.required, 1) },
    maxed: (s) => s.p.stage >= MAX_STAGE,
    canBreak(): boolean { return this.p.cultivation >= this.required && !this.maxed },
    isMajorBreak(): boolean { return this.info.isMajorGate },
    /** 目前可用於突破的丹藥 */
    breakItems(): string[] {
      return Object.keys(this.p.inventory).filter((id) => {
        const e = itemById(id).effect
        return this.p.inventory[id] > 0 && e?.breakBonus && (!e.majorOnly || this.isMajorBreak)
      })
    },
    count: (s) => (id: string) => s.p.inventory[id] ?? 0,
  },

  actions: {
    addLog(text: string, kind: LogLine['kind'] = 'info') {
      this.log.unshift({ id: ++logId, text, kind })
      if (this.log.length > 50) this.log.pop()
    },

    stat(key: string, n = 1) {
      this.p.stats[key] = (this.p.stats[key] ?? 0) + n
    },

    addItem(id: string, n = 1) {
      itemById(id) // 驗證 id
      this.p.inventory[id] = (this.p.inventory[id] ?? 0) + n
      if (this.p.inventory[id] <= 0) delete this.p.inventory[id]
    },

    /** 扣除物品；數量不足時回傳 false 且不扣 */
    takeItems(items: Record<string, number>): boolean {
      if (Object.entries(items).some(([id, n]) => this.count(id) < n)) return false
      for (const [id, n] of Object.entries(items)) this.addItem(id, -n)
      return true
    },

    /** 在背包中服用丹藥（戰鬥用丹藥由戰鬥系統處理） */
    useItem(id: string): boolean {
      const it = itemById(id)
      const e = it.effect
      if (!e || this.count(id) <= 0) return false
      if (e.cultivationPct) {
        if (this.maxed) return false
        this.addItem(id, -1)
        this.gain(this.required * e.cultivationPct)
        this.addLog(`服用${it.name}，修為大進。`, 'good')
      } else if (e.buff) {
        this.addItem(id, -1)
        this.p.buffs.push({ id, mult: e.buff.mult, until: Date.now() + e.buff.durationSec * 1000 })
        this.addLog(`服用${it.name}，靈台清明，修煉加速。`, 'good')
      } else {
        return false
      }
      this.stat('pillsUsed')
      this.save()
      return true
    },

    learnTechnique(id: string): boolean {
      if (this.p.techniques.includes(id)) return false
      this.p.techniques.push(id)
      this.addLog(`習得功法《${techById(id).name}》！`, 'good')
      return true
    },

    toSave(): SaveData {
      return { ...JSON.parse(JSON.stringify(this.p)), lastSaved: Date.now(), version: SAVE_VERSION }
    },

    applySave(d: SaveData) {
      const { version: _v, ...rest } = d
      this.p = normalize(rest)
      this.started = true
    },

    async init() {
      const d = await loadSave()
      if (d) {
        this.applySave(d)
        this.settleOffline(d.lastSaved)
      }
      this.loaded = true
      this.startLoop()
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.save()
        else if (this.started) this.settleOffline(this.p.lastSaved)
      })
    },

    /** 離線收益結算（含時間倒退防護與上限） */
    settleOffline(since: number) {
      const now = Date.now()
      this.now = now
      const elapsed = (now - since) / 1000
      if (elapsed < 0) {
        this.addLog('天機紊亂（偵測到系統時間倒退），本次無離線收益。', 'bad')
        this.p.gatherAt = now
      } else if (elapsed > 60) {
        const sec = Math.min(elapsed, BALANCE.offlineCapHours * 3600)
        const rate = BALANCE.offlineRate + (this.tech.offline ?? 0)
        const before = this.p.cultivation
        this.gain(sec * this.perSec * rate)
        this.addLog(`閉關 ${fmtDuration(sec)}，獲得修為 ${fmt(this.p.cultivation - before)}。`, 'good')
      }
      this.p.lastSaved = now
      lastTick = now
      this.updateGather()
    },

    startLoop() {
      if (timer) return
      lastTick = Date.now()
      timer = window.setInterval(() => this.tick(), 250)
    },

    tick() {
      const now = Date.now()
      const dt = Math.max(0, Math.min((now - lastTick) / 1000, 5))
      lastTick = now
      this.now = now
      if (!this.started || this.tribulation) return
      this.gain(this.perSec * dt)
      this.updateGather()
      if (this.p.buffs.some((b) => b.until <= now)) this.p.buffs = this.p.buffs.filter((b) => b.until > now)
      if (!this.activeEvent && this.tab === 'cultivate' && Math.random() < dt / BALANCE.eventIntervalSec) {
        this.activeEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)]
      }
      if ((saveCounter += dt) > 10) { saveCounter = 0; this.save() }
    },

    /** 採藥次數隨時間回復 */
    updateGather() {
      const p = this.p
      if (p.gatherCharges >= BALANCE.gatherMax) { p.gatherAt = this.now; return }
      const gained = Math.floor((this.now - p.gatherAt) / 1000 / BALANCE.gatherSec)
      if (gained > 0) {
        p.gatherCharges = Math.min(BALANCE.gatherMax, p.gatherCharges + gained)
        p.gatherAt += gained * BALANCE.gatherSec * 1000
      }
    },

    gain(n: number) {
      if (this.maxed) return
      this.p.cultivation = Math.min(this.p.cultivation + n, this.required)
    },

    meditate() {
      this.gain(this.tapGain)
      this.stat('taps')
    },

    newGame() {
      const root = rollRoot()
      this.p = { ...defaultPlayer(), rootId: root.id }
      this.p.inventory = { herb_lingcao: 3 }
      this.started = true
      this.tab = 'cultivate'
      this.log = []
      this.addLog(`測得靈根：${root.name}。${root.desc}`, 'good')
      this.addLog('你踏上了修仙之路。', 'info')
      this.save()
    },

    breakBonus(itemId: string | null): number {
      let b = this.isMajorBreak ? (this.tech.breakMajor ?? 0) : 0
      if (itemId && this.count(itemId) > 0) b += itemById(itemId).effect?.breakBonus ?? 0
      return b
    },

    breakChance(itemId: string | null): number {
      return breakthroughChance(this.isMajorBreak, this.breakBonus(itemId), this.p.rootId)
    },

    /** 開始突破；大境界會先進入渡劫小遊戲 */
    tryBreak(itemId: string | null) {
      if (!this.canBreak) return
      if (itemId && !this.breakItems.includes(itemId)) itemId = null
      const chance = this.breakChance(itemId)
      if (itemId) this.addItem(itemId, -1)
      if (this.isMajorBreak) {
        this.pendingBreakItem = itemId
        this.tribulation = true
        return
      }
      this.resolveBreak(Math.random() < chance)
    },

    /** 渡劫小遊戲結束：score 0~1 為閃避表現 */
    finishTribulation(score: number) {
      const itemId = this.pendingBreakItem
      this.tribulation = false
      this.pendingBreakItem = null
      // 丹藥已在 tryBreak 扣除，這裡直接用其加成計算
      let bonus = this.tech.breakMajor ?? 0
      if (itemId) bonus += itemById(itemId).effect?.breakBonus ?? 0
      const chance = breakthroughChance(true, bonus, this.p.rootId) * (0.4 + 0.6 * score)
      this.stat('tribulations')
      if (score >= 1) this.stat('perfectTribulations')
      this.resolveBreak(Math.random() < chance)
    },

    resolveBreak(ok: boolean) {
      if (ok) {
        this.p.stage++
        this.p.cultivation = 0
        this.stat('breakthroughs')
        const msg = this.maxed ? `渡劫成功，白日飛升！你已達 ${this.info.label}。` : `突破成功！晉升 ${this.info.label}。`
        this.addLog(msg, 'good')
        navigator.vibrate?.([60, 40, 120])
      } else {
        this.p.cultivation *= 1 - BALANCE.failLossPct
        this.stat('breakFails')
        this.addLog(`突破失敗，真元逆行，損失 ${BALANCE.failLossPct * 100}% 修為。`, 'bad')
      }
      this.save()
    },

    applyEffect(eff: EventEffect) {
      if (eff.cultivationPct) {
        const delta = this.required * eff.cultivationPct
        this.p.cultivation = Math.max(0, Math.min(this.p.cultivation + delta, this.required))
      }
      for (const [id, n] of Object.entries(eff.items ?? {})) this.addItem(id, n)
      if (eff.technique && !this.learnTechnique(eff.technique)) {
        // 已學會的功法轉為修為
        this.gain(this.required * 0.2)
      }
    },

    chooseEvent(index: number) {
      const ev = this.activeEvent
      if (!ev) return
      const choice = ev.choices[index]
      const ok = choice.chance === undefined || Math.random() < choice.chance
      const eff: EventEffect = ok ? choice.success : (choice.fail ?? choice.success)
      this.addLog(`【${ev.title}】${eff.text}`, ok && (eff.cultivationPct ?? 0) >= 0 ? 'good' : 'bad')
      this.applyEffect(eff)
      this.stat('events')
      this.activeEvent = null
      this.save()
    },

    async save() {
      if (!this.started) return
      const d = this.toSave()
      this.p.lastSaved = d.lastSaved
      await writeSave(d)
    },

    exportCode(): string { return exportCode(this.toSave()) },

    importCode(code: string): boolean {
      const d = importCode(code)
      if (!d) return false
      this.applySave(d)
      this.addLog('存檔已匯入。', 'good')
      this.save()
      return true
    },

    async reset() {
      await clearSave()
      Object.assign(this, { started: false, log: [], activeEvent: null, tribulation: false, p: defaultPlayer() })
    },
  },
})
