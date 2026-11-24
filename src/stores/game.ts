import { defineStore } from 'pinia'
import { BALANCE, requiredFor, gainPerSec, breakthroughChance, fmt, fmtDuration, rebirthSpeed, rebirthCombat, plotCount } from '../core/formulas'
import { SAVE_VERSION, loadSave, writeSave, clearSave, exportCode, importCode, type SaveData } from '../core/save'
import { defaultPlayer, normalize, type PlayerState, type Plot } from '../core/player'
import { stageInfo, MAX_STAGE } from '../data/realms'
import { rollRoot, rootById } from '../data/spiritRoots'
import { techById, techPrice, DEFAULT_SKILL } from '../data/techniques'
import { playerStats } from '../core/battle'
import { itemById } from '../data/items'
import type { FireResult } from '../data/recipes'
import { play } from '../core/sfx'
import { ACHIEVEMENTS } from '../data/achievements'
import { DAILY_TASKS, dayKey } from '../data/daily'
import { pickEvent, type GameEvent, type EventEffect, type EventChoice } from '../data/events'

import * as alchemy from './alchemy'
import * as dungeon from './dungeon'
import * as daily from './daily'

export interface LogLine { id: number; text: string; kind: 'info' | 'good' | 'bad' }
export type Tab = 'cultivate' | 'techniques' | 'alchemy' | 'dungeon' | 'bag'

/** 分頁解鎖所需境界（新手引導：功能逐步開放） */
export const TAB_UNLOCK: Record<Tab, { stage: number; label: string }> = {
  cultivate: { stage: 0, label: '修煉' },
  bag: { stage: 0, label: '行囊' },
  alchemy: { stage: 1, label: '丹房' },
  techniques: { stage: 2, label: '功法' },
  dungeon: { stage: 2, label: '秘境' },
}

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
    /** 秘境中最近一則提示（寶箱、休憩） */
    runNote: '',
    lastRunSummary: '',
    toasts: [] as { id: number; icon: string; text: string }[],
    /** 開發者面板：時間流速倍率 */
    devSpeed: 1,
    /** PWA 有新版本時，由 main.ts 設定為「存檔並更新」的函式 */
    updateReady: null as null | (() => Promise<void>),
    /** 全域錯誤訊息（顯示錯誤畫面） */
    fatal: '',
  }),

  getters: {
    root: (s) => rootById(s.p.rootId),
    tech: (s) => techById(s.p.mainTech),
    info: (s) => stageInfo(s.p.stage),
    required: (s) => requiredFor(s.p.stage),
    buffMult: (s) => s.p.buffs.filter((b) => b.until > s.now).reduce((m, b) => m * b.mult, 1),
    speedMult(): number {
      const t = this.tech
      return this.root.speed * (t.speed ?? 1) * (t.rootBonus?.[this.p.rootId] ?? 1) * this.buffMult * rebirthSpeed(this.p.rebirths)
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
    dailyProgress: (s) => (t: { stat: string; target: number }) =>
      Math.min(t.target, (s.p.stats[t.stat] ?? 0) - (s.p.daily.base[t.stat] ?? 0)),
    canSignIn: (s) => s.p.daily.signedDate !== dayKey(s.now),
    /** 有可領取的每日獎勵（用於紅點） */
    dailyClaimable(): boolean {
      if (this.canSignIn) return true
      const done = DAILY_TASKS.filter((t) => this.dailyProgress(t) >= t.target)
      return done.some((t) => !this.p.daily.claimed.includes(t.id)) ||
        (done.length === DAILY_TASKS.length && !this.p.daily.claimed.includes('all'))
    },
    /** 靈田（依境界顯示的格數，空格為 null） */
    plotList: (s): (Plot | null)[] => Array.from({ length: plotCount(s.p.stage) }, (_, i) => s.p.plots[i] ?? null),
    combat(): ReturnType<typeof playerStats> {
      const r = rebirthCombat(this.p.rebirths)
      const t = this.tech
      return playerStats(this.p.stage, { atk: (t.atk ?? 1) * r, def: (t.def ?? 1) * r, hp: (t.hp ?? 1) * r })
    },
    skill(): typeof DEFAULT_SKILL { return this.tech.skill ?? DEFAULT_SKILL },
  },

  actions: {
    addLog(text: string, kind: LogLine['kind'] = 'info') {
      this.log.unshift({ id: ++logId, text, kind })
      if (this.log.length > 50) this.log.pop()
    },

    toast(text: string, icon = '✦', ms = 3000) {
      const id = ++logId
      this.toasts.push({ id, icon, text })
      if (this.toasts.length > 3) this.toasts.shift()
      setTimeout(() => (this.toasts = this.toasts.filter((t) => t.id !== id)), ms)
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
        if (this.maxed || this.p.cultivation >= this.required) return false
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
      this.toast(`習得功法《${techById(id).name}》`, '📜')
      play('unlock')
      return true
    },

    /** 切換主修功法 */
    setMainTech(id: string): boolean {
      const t = techById(id)
      if (!this.p.techniques.includes(id) || this.p.stage < t.minStage) return false
      this.p.mainTech = id
      this.addLog(`改為主修《${t.name}》。`, 'info')
      this.save()
      return true
    },

    /** 藏經閣：以妖丹兌換功法 */
    buyTechnique(id: string): boolean {
      const t = techById(id)
      if (this.p.techniques.includes(id)) return false
      if (!this.takeItems({ mat_yaodan: techPrice(t) })) return false
      this.learnTechnique(id)
      this.stat('techBought')
      this.save()
      return true
    },

    // ───────── 丹房（實作在 alchemy.ts）─────────

    gather(): Record<string, number> | null { return alchemy.gather(this) },
    plant(i: number, herbId: string): boolean { return alchemy.plant(this, i, herbId) },
    harvest(i: number): number { return alchemy.harvest(this, i) },
    canCraft(recipeId: string): boolean { return alchemy.canCraft(this, recipeId) },
    craft(recipeId: string, fire: FireResult): number | null { return alchemy.craft(this, recipeId, fire) },

    // ───────── 秘境（實作在 dungeon.ts）─────────

    enterDungeon(id: string): boolean { return dungeon.enterDungeon(this, id) },
    runLoot(items: Record<string, number>): void { return dungeon.runLoot(this, items) },
    moveTo(nodeId: string): boolean { return dungeon.moveTo(this, nodeId) },
    battleAction(type: 'attack' | 'skill' | 'pill' | 'flee'): void { return dungeon.battleAction(this, type) },
    closeBattle(): void { return dungeon.closeBattle(this) },
    onBattleWin(): void { return dungeon.onBattleWin(this) },
    finishRun(result: 'clear' | 'leave' | 'lose'): void { return dungeon.finishRun(this, result) },
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
        const msg = `閉關 ${fmtDuration(sec)}，獲得修為 ${fmt(this.p.cultivation - before)}。`
        this.addLog(msg, 'good')
        if (sec >= 300) {
          const ready = this.p.plots.filter((x) => x && x.readyAt <= now).length
          this.toast(msg + (ready ? `靈田有 ${ready} 格已成熟。` : ''), '🧘', 5000)
        }
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
      // 背景節流或裝置休眠造成長時間沒 tick：改用離線結算，避免少算
      if (this.started && now - lastTick > 60_000) {
        this.settleOffline(lastTick)
        return
      }
      const dt = Math.max(0, Math.min((now - lastTick) / 1000, 5))
      lastTick = now
      this.now = now
      if (!this.started || this.tribulation) return
      this.gain(this.perSec * dt * this.devSpeed)
      this.updateGather()
      if (this.p.buffs.some((b) => b.until <= now)) this.p.buffs = this.p.buffs.filter((b) => b.until > now)
      if (!this.activeEvent && this.tab === 'cultivate' && !this.p.run?.battle && Math.random() < dt / BALANCE.eventIntervalSec) {
        this.activeEvent = pickEvent(this.p.stage, this.p.flags)
      }
      this.checkAchievements()
      this.checkUnlocks()
      this.checkDaily()
      if ((saveCounter += dt) > 10) { saveCounter = 0; this.save() }
    },

    tabUnlocked(t: Tab): boolean {
      return this.p.stage >= TAB_UNLOCK[t].stage
    },

    checkUnlocks() {
      for (const [t, u] of Object.entries(TAB_UNLOCK)) {
        if (u.stage === 0 || this.p.stage < u.stage || this.p.flags['unlock_' + t]) continue
        this.p.flags['unlock_' + t] = true
        this.p.flags['new_' + t] = true
        this.toast(`新功能解鎖：${u.label}`, '🔓', 4000)
        play('unlock')
      }
    },

    openTab(t: Tab) {
      if (!this.tabUnlocked(t)) return
      this.tab = t
      delete this.p.flags['new_' + t]
    },

    grant(items: Record<string, number>): string {
      for (const [id, n] of Object.entries(items)) this.addItem(id, n)
      return Object.entries(items).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
    },

    // ───────── 每日（實作在 daily.ts）─────────

    checkDaily(): void { return daily.checkDaily(this) },
    signIn(): string | null { return daily.signIn(this) },
    claimDaily(id: string): string | null { return daily.claimDaily(this, id) },

    checkAchievements() {
      for (const a of ACHIEVEMENTS) {
        if (this.p.achievements.includes(a.id)) continue
        const [cur, target] = a.progress(this.p)
        if (cur < target) continue
        this.p.achievements.push(a.id)
        for (const [id, n] of Object.entries(a.reward ?? {})) this.addItem(id, n)
        const reward = Object.entries(a.reward ?? {}).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
        this.toast(`成就達成：${a.name}${reward ? `（獎勵 ${reward}）` : ''}`, a.icon, 4000)
        this.addLog(`🏆 成就達成：${a.name}`, 'good')
        play('unlock')
      }
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
      play('tap')
    },

    /** 轉世：境界歸零，保留功法、物品、成就，獲得永久加成；靈根重抽兩次取較佳 */
    rebirth(): boolean {
      if (!this.maxed || this.p.run) return false
      const a = rollRoot()
      const b = rollRoot()
      const root = a.speed >= b.speed ? a : b
      this.p.rebirths++
      this.p.stage = 0
      this.p.cultivation = 0
      this.p.rootId = root.id
      this.p.mainTech = 't_tuna'
      this.p.buffs = []
      this.stat('rebirths')
      this.tab = 'cultivate'
      const msg = `第 ${this.p.rebirths + 1} 世．轉生為${root.name}，修煉 ×${rebirthSpeed(this.p.rebirths)}、戰力 ×${rebirthCombat(this.p.rebirths)}`
      this.addLog('你兵解轉世，帶著前世記憶重新踏上仙途。' + msg, 'good')
      this.toast(msg, '🔄', 5000)
      play('success')
      this.save()
      return true
    },

    newGame() {
      const root = rollRoot()
      this.p = { ...defaultPlayer(), rootId: root.id }
      this.p.inventory = { herb_lingcao: 3 }
      this.started = true
      this.checkDaily()
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
        this.toast(msg, '☯')
        play('success')
        navigator.vibrate?.([60, 40, 120])
      } else {
        this.p.cultivation *= 1 - BALANCE.failLossPct
        this.stat('breakFails')
        play('fail')
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
      if (eff.buff) this.p.buffs.push({ id: 'event', mult: eff.buff.mult, until: Date.now() + eff.buff.durationSec * 1000 })
    },

    canChoose(c: EventChoice): boolean {
      return Object.entries(c.cost ?? {}).every(([id, n]) => this.count(id) >= n)
    },

    chooseEvent(index: number) {
      const ev = this.activeEvent
      if (!ev) return
      const choice = ev.choices[index]
      if (!this.canChoose(choice) || (choice.cost && !this.takeItems(choice.cost))) return
      if (ev.once) this.p.flags['ev_' + ev.id] = true
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
