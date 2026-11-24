import { defineStore } from 'pinia'
import { BALANCE, requiredFor, gainPerSec, breakthroughChance, fmt, fmtDuration } from '../core/formulas'
import { SAVE_VERSION, loadSave, writeSave, clearSave, exportCode, importCode, type SaveData } from '../core/save'
import { stageInfo, MAX_STAGE } from '../data/realms'
import { rollRoot, rootById } from '../data/spiritRoots'
import { EVENTS, type GameEvent, type EventEffect } from '../data/events'

export interface LogLine { id: number; text: string; kind: 'info' | 'good' | 'bad' }

let logId = 0
let timer: number | undefined
let lastTick = 0
let saveCounter = 0

export const useGame = defineStore('game', {
  state: () => ({
    loaded: false,
    started: false,
    rootId: 'mixed',
    stage: 0,
    cultivation: 0,
    pills: 0,
    createdAt: 0,
    lastSaved: 0,
    log: [] as LogLine[],
    activeEvent: null as GameEvent | null,
    /** 渡劫中：由 UI 顯示渡劫小遊戲 */
    tribulation: false,
    pendingPill: false,
  }),

  getters: {
    root: (s) => rootById(s.rootId),
    info: (s) => stageInfo(s.stage),
    required: (s) => requiredFor(s.stage),
    perSec(): number { return gainPerSec(this.stage, this.root.speed) },
    progress(): number { return Math.min(this.cultivation / this.required, 1) },
    canBreak(): boolean { return this.cultivation >= this.required && this.stage < MAX_STAGE },
    isMajorBreak(): boolean { return this.info.isMajorGate },
    maxed: (s) => s.stage >= MAX_STAGE,
  },

  actions: {
    addLog(text: string, kind: LogLine['kind'] = 'info') {
      this.log.unshift({ id: ++logId, text, kind })
      if (this.log.length > 40) this.log.pop()
    },

    toSave(): SaveData {
      return {
        version: SAVE_VERSION,
        rootId: this.rootId,
        stage: this.stage,
        cultivation: this.cultivation,
        pills: this.pills,
        lastSaved: Date.now(),
        createdAt: this.createdAt,
      }
    },

    applySave(d: SaveData) {
      Object.assign(this, {
        rootId: d.rootId, stage: d.stage, cultivation: d.cultivation,
        pills: d.pills, createdAt: d.createdAt, lastSaved: d.lastSaved, started: true,
      })
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
        else if (this.started) this.settleOffline(this.lastSaved)
      })
    },

    /** 離線收益結算（含時間倒退防護與上限） */
    settleOffline(since: number) {
      const now = Date.now()
      const elapsed = (now - since) / 1000
      if (elapsed < 0) {
        this.addLog('天機紊亂（偵測到系統時間倒退），本次無離線收益。', 'bad')
      } else if (elapsed > 60) {
        const sec = Math.min(elapsed, BALANCE.offlineCapHours * 3600)
        const gain = sec * this.perSec * BALANCE.offlineRate
        this.cultivation = Math.min(this.cultivation + gain, this.required)
        this.addLog(`閉關 ${fmtDuration(sec)}，獲得修為 ${fmt(gain)}。`, 'good')
      }
      this.lastSaved = now
      lastTick = now
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
      if (!this.started || this.tribulation) return
      this.gain(this.perSec * dt)
      if (!this.activeEvent && Math.random() < dt / BALANCE.eventIntervalSec) {
        this.activeEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)]
      }
      if ((saveCounter += dt) > 10) { saveCounter = 0; this.save() }
    },

    gain(n: number) {
      if (this.maxed) return
      this.cultivation = Math.min(this.cultivation + n, this.required)
    },

    meditate() {
      this.gain(this.perSec * BALANCE.tapSeconds)
    },

    newGame() {
      const root = rollRoot()
      Object.assign(this, {
        rootId: root.id, stage: 0, cultivation: 0, pills: 0,
        createdAt: Date.now(), started: true, log: [],
      })
      this.addLog(`測得靈根：${root.name}。${root.desc}`, 'good')
      this.addLog('你踏上了修仙之路。', 'info')
      this.save()
    },

    /** 開始突破；大境界會先進入渡劫小遊戲 */
    tryBreak(usePill: boolean) {
      if (!this.canBreak) return
      if (usePill && this.pills <= 0) usePill = false
      if (usePill) this.pills--
      if (this.isMajorBreak) {
        this.pendingPill = usePill
        this.tribulation = true
        return
      }
      this.resolveBreak(Math.random() < breakthroughChance(false, usePill, this.rootId))
    },

    /** 渡劫小遊戲結束：score 0~1 為閃避表現 */
    finishTribulation(score: number) {
      this.tribulation = false
      const chance = breakthroughChance(true, this.pendingPill, this.rootId) * (0.4 + 0.6 * score)
      this.pendingPill = false
      this.resolveBreak(Math.random() < chance)
    },

    resolveBreak(ok: boolean) {
      if (ok) {
        this.stage++
        this.cultivation = 0
        const msg = this.maxed ? `渡劫成功，白日飛升！你已達 ${this.info.label}。` : `突破成功！晉升 ${this.info.label}。`
        this.addLog(msg, 'good')
        if ('vibrate' in navigator) navigator.vibrate?.([60, 40, 120])
      } else {
        this.cultivation *= 1 - BALANCE.failLossPct
        this.addLog(`突破失敗，真元逆行，損失 ${BALANCE.failLossPct * 100}% 修為。`, 'bad')
      }
      this.save()
    },

    chooseEvent(index: number) {
      const ev = this.activeEvent
      if (!ev) return
      const choice = ev.choices[index]
      const ok = choice.chance === undefined || Math.random() < choice.chance
      const eff: EventEffect = ok ? choice.success : (choice.fail ?? choice.success)
      if (eff.cultivationPct) {
        const delta = this.required * eff.cultivationPct
        this.cultivation = Math.max(0, Math.min(this.cultivation + delta, this.required))
      }
      if (eff.pills) this.pills += eff.pills
      this.addLog(`【${ev.title}】${eff.text}`, ok && (eff.cultivationPct ?? 0) >= 0 ? 'good' : 'bad')
      this.activeEvent = null
      this.save()
    },

    async save() {
      if (!this.started) return
      const d = this.toSave()
      this.lastSaved = d.lastSaved
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
      Object.assign(this, { started: false, log: [], activeEvent: null, tribulation: false })
    },
  },
})
