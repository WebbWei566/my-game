import { defineStore } from 'pinia'
import { BALANCE, requiredFor, gainPerSec, breakthroughChance, fmt, fmtDuration } from '../core/formulas'
import { SAVE_VERSION, loadSave, writeSave, clearSave, exportCode, importCode, type SaveData } from '../core/save'
import { defaultPlayer, normalize, type PlayerState } from '../core/player'
import { stageInfo, MAX_STAGE } from '../data/realms'
import { rollRoot, rootById } from '../data/spiritRoots'
import { techById, techPrice, DEFAULT_SKILL } from '../data/techniques'
import { dungeonById } from '../data/dungeons'
import { generateMap, findNode } from '../core/dungeonMap'
import { playerStats, makeFoe, playTurn, type Action } from '../core/battle'
import { itemById } from '../data/items'
import { RECIPES, craftChance, rollGather, type FireResult } from '../data/recipes'
import { play } from '../core/sfx'
import { pickEvent, type GameEvent, type EventEffect, type EventChoice } from '../data/events'

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
    /** 秘境中最近一則提示（寶箱、休憩） */
    runNote: '',
    lastRunSummary: '',
    toasts: [] as { id: number; icon: string; text: string }[],
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
    combat(): ReturnType<typeof playerStats> { return playerStats(this.p.stage, this.tech) },
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

    /** 採藥：消耗一次機會 */
    gather(): Record<string, number> | null {
      if (this.p.gatherCharges <= 0) return null
      if (this.p.gatherCharges >= BALANCE.gatherMax) this.p.gatherAt = Date.now()
      this.p.gatherCharges--
      const got = rollGather(this.p.stage)
      for (const [id, n] of Object.entries(got)) this.addItem(id, n)
      play('coin')
      this.addLog('入山採藥，得 ' + Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、'), 'good')
      this.stat('gathers')
      this.save()
      return got
    },

    canCraft(recipeId: string): boolean {
      const r = RECIPES.find((x) => x.id === recipeId)
      return !!r && this.p.stage >= r.minStage && Object.entries(r.inputs).every(([id, n]) => this.count(id) >= n)
    },

    /** 煉丹：回傳產出數量（0 = 失敗），材料不足回傳 null */
    craft(recipeId: string, fire: FireResult): number | null {
      const r = RECIPES.find((x) => x.id === recipeId)
      if (!r || !this.canCraft(recipeId) || !this.takeItems(r.inputs)) return null
      const name = itemById(r.output).name
      this.stat('crafts')
      if (Math.random() >= craftChance(r, fire, this.tech.alchemy ?? 0)) {
        this.addLog(`煉製${name}失敗，丹爐中只剩一團焦黑藥渣。`, 'bad')
        play('fail')
        this.save()
        return 0
      }
      const n = fire === 'perfect' && Math.random() < 0.5 ? 2 : 1
      this.addItem(r.output, n)
      this.stat('craftSuccess')
      this.addLog(n > 1 ? `丹成雙枚！得${name}×2。` : `煉成${name}。`, 'good')
      play('craft')
      this.save()
      return n
    },

    // ───────── 秘境 ─────────

    enterDungeon(id: string): boolean {
      const d = dungeonById(id)
      if (this.p.run || this.p.stage < d.minStage) return false
      const map = generateMap(d.layers)
      const st = this.combat
      this.p.run = { dungeonId: id, map, at: map.layers[0][0].id, visited: [map.layers[0][0].id], hp: st.maxHp, mp: st.maxMp, loot: {}, battle: null }
      this.lastRunSummary = ''
      this.addLog(`你踏入了${d.name}。`, 'info')
      this.stat('dungeonRuns')
      this.save()
      return true
    },

    runLoot(items: Record<string, number>) {
      const run = this.p.run!
      for (const [id, n] of Object.entries(items)) if (n > 0) run.loot[id] = (run.loot[id] ?? 0) + n
    },

    moveTo(nodeId: string): boolean {
      const run = this.p.run
      if (!run || run.battle) return false
      const cur = findNode(run.map, run.at)
      if (!cur.next.includes(nodeId)) return false
      const node = findNode(run.map, nodeId)
      const d = dungeonById(run.dungeonId)
      run.at = nodeId
      run.visited.push(nodeId)
      const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]
      switch (node.type) {
        case 'battle':
          run.battle = { foe: makeFoe(pick(d.enemies), d.level + node.layer * 0.25, 'normal'), turn: 0, log: [], over: null }
          break
        case 'elite':
          run.battle = { foe: makeFoe(pick(d.elites), d.level + node.layer * 0.25, 'elite'), turn: 0, log: [], over: null }
          break
        case 'boss':
          run.battle = { foe: makeFoe(d.boss, d.level + 1, 'boss'), turn: 0, log: [], over: null }
          break
        case 'treasure': {
          const got: Record<string, number> = { [pick(d.herbs)]: 1 + Math.floor(Math.random() * 3) }
          if (Math.random() < 0.4) got.mat_yaodan = 1
          if (Math.random() < 0.2) got.pill_huichun = 1
          this.runLoot(got)
          this.runNote = '打開寶箱：' + Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
          break
        }
        case 'rest': {
          const st = this.combat
          run.hp = Math.min(st.maxHp, run.hp + Math.round(st.maxHp * 0.35))
          run.mp = Math.min(st.maxMp, run.mp + Math.round(st.maxMp * 0.5))
          this.runNote = '你生火調息，回復了氣血與靈力。'
          break
        }
        case 'event':
          this.activeEvent = pickEvent(this.p.stage, this.p.flags)
          this.runNote = ''
          break
      }
      if (run.battle) this.runNote = ''
      this.save()
      return true
    },

    battleAction(type: 'attack' | 'skill' | 'pill' | 'flee') {
      const run = this.p.run
      const b = run?.battle
      if (!run || !b || b.over) return
      let action: Action
      if (type === 'pill') {
        if (this.count('pill_huichun') <= 0) return
        this.addItem('pill_huichun', -1)
        action = { type: 'heal', pct: itemById('pill_huichun').effect!.healPct! }
      } else if (type === 'skill') {
        if (run.mp < this.skill.cost) return
        action = { type: 'skill', skill: this.skill }
      } else {
        action = { type }
      }
      const me = { hp: run.hp, mp: run.mp, stats: this.combat }
      playTurn(b, me, action)
      play(b.over === 'win' ? 'coin' : 'hit')
      run.hp = me.hp
      run.mp = me.mp
      if (b.log.length > 30) b.log.splice(0, b.log.length - 30)
      this.stat('battleTurns')
      if (b.over === 'win') this.onBattleWin()
      this.save()
    },

    /** 戰鬥結束後按「繼續」 */
    closeBattle() {
      const run = this.p.run
      const b = run?.battle
      if (!run || !b?.over) return
      const result = b.over
      const kind = b.foe.kind
      run.battle = null
      if (result === 'lose') this.finishRun('lose')
      else if (result === 'win' && kind === 'boss') this.finishRun('clear')
      else this.save()
    },

    onBattleWin() {
      const run = this.p.run!
      const d = dungeonById(run.dungeonId)
      const kind = run.battle!.foe.kind
      const got: Record<string, number> = {}
      const herb = d.herbs[Math.floor(Math.random() * d.herbs.length)]
      if (kind === 'normal') {
        if (Math.random() < 0.45) got.mat_yaodan = 1
        if (Math.random() < 0.3) got[herb] = 1
      } else if (kind === 'elite') {
        got.mat_yaodan = 1 + Math.floor(Math.random() * 2)
        got[herb] = 1 + Math.floor(Math.random() * 2)
        this.stat('elitesKilled')
      } else {
        got.mat_yaodan = 3 + Math.floor(Math.random() * 3)
        got[herb] = 2 + Math.floor(Math.random() * 2)
        if (!this.p.flags['clear_' + d.id]) for (const [id, n] of Object.entries(d.firstClear)) got[id] = (got[id] ?? 0) + n
        this.stat('bossesKilled')
      }
      this.stat('kills')
      this.runLoot(got)
      const text = Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
      if (text) run.battle!.log.push('獲得：' + text)
    },

    /** 結束秘境：clear 通關、leave 撤退（保留全部戰利品）、lose 戰敗（失去一半） */
    finishRun(result: 'clear' | 'leave' | 'lose') {
      const run = this.p.run
      if (!run || (run.battle && !run.battle.over)) return
      const d = dungeonById(run.dungeonId)
      const kept: Record<string, number> = {}
      for (const [id, n] of Object.entries(run.loot)) {
        const k = result === 'lose' ? Math.floor(n / 2) : n
        if (k > 0) { kept[id] = k; this.addItem(id, k) }
      }
      const text = Object.entries(kept).map(([id, n]) => `${itemById(id).name}×${n}`).join('、') || '無'
      const head = result === 'clear' ? `🎉 通關${d.name}！` : result === 'lose' ? `你在${d.name}戰敗，狼狽逃回，失去一半戰利品。` : `你從${d.name}撤離。`
      if (result === 'clear') {
        play('success')
        this.toast(head, '🏆', 4000)
        this.p.flags['clear_' + d.id] = true
        this.stat('dungeonClears')
      }
      this.lastRunSummary = `${head}帶回：${text}`
      this.addLog(this.lastRunSummary, result === 'lose' ? 'bad' : 'good')
      this.p.run = null
      this.runNote = ''
      this.save()
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
      if (!this.activeEvent && this.tab === 'cultivate' && !this.p.run?.battle && Math.random() < dt / BALANCE.eventIntervalSec) {
        this.activeEvent = pickEvent(this.p.stage, this.p.flags)
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
      play('tap')
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
