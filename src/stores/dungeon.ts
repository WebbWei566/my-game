// 秘境：進入、移動、戰鬥、戰利品結算
import type { useGame } from './game'
import { itemById } from '../data/items'
import { dungeonById } from '../data/dungeons'
import { pickEvent } from '../data/events'
import { generateMap, findNode } from '../core/dungeonMap'
import { makeFoe, playTurn, type Action } from '../core/battle'
import { play } from '../core/sfx'

type Game = ReturnType<typeof useGame>

export function enterDungeon(g: Game, id: string): boolean {
  const d = dungeonById(id)
  if (g.p.run || g.p.stage < d.minStage) return false
  const map = generateMap(d.layers)
  const st = g.combat
  g.p.run = { dungeonId: id, map, at: map.layers[0][0].id, visited: [map.layers[0][0].id], hp: st.maxHp, mp: st.maxMp, loot: {}, battle: null }
  g.lastRunSummary = ''
  g.addLog(`你踏入了${d.name}。`, 'info')
  g.stat('dungeonRuns')
  g.save()
  return true
}

export function runLoot(g: Game, items: Record<string, number>): void {
  const run = g.p.run!
  for (const [id, n] of Object.entries(items)) if (n > 0) run.loot[id] = (run.loot[id] ?? 0) + n
}

export function moveTo(g: Game, nodeId: string): boolean {
  const run = g.p.run
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
      g.runLoot(got)
      g.runNote = '打開寶箱：' + Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
      break
    }
    case 'rest': {
      const st = g.combat
      run.hp = Math.min(st.maxHp, run.hp + Math.round(st.maxHp * 0.35))
      run.mp = Math.min(st.maxMp, run.mp + Math.round(st.maxMp * 0.5))
      g.runNote = '你生火調息，回復了氣血與靈力。'
      break
    }
    case 'event':
      g.activeEvent = pickEvent(g.p.stage, g.p.flags)
      g.runNote = ''
      break
  }
  if (run.battle) g.runNote = ''
  g.save()
  return true
}

export function battleAction(g: Game, type: 'attack' | 'skill' | 'pill' | 'flee'): void {
  const run = g.p.run
  const b = run?.battle
  if (!run || !b || b.over) return
  let action: Action
  if (type === 'pill') {
    if (g.count('pill_huichun') <= 0) return
    g.addItem('pill_huichun', -1)
    action = { type: 'heal', pct: itemById('pill_huichun').effect!.healPct! }
  } else if (type === 'skill') {
    if (run.mp < g.skill.cost) return
    action = { type: 'skill', skill: g.skill }
  } else {
    action = { type }
  }
  const me = { hp: run.hp, mp: run.mp, stats: g.combat }
  playTurn(b, me, action)
  play(b.over === 'win' ? 'coin' : 'hit')
  run.hp = me.hp
  run.mp = me.mp
  if (b.log.length > 30) b.log.splice(0, b.log.length - 30)
  g.stat('battleTurns')
  if (b.over === 'win') g.onBattleWin()
  g.save()
}

/** 戰鬥結束後按「繼續」 */
export function closeBattle(g: Game): void {
  const run = g.p.run
  const b = run?.battle
  if (!run || !b?.over) return
  const result = b.over
  const kind = b.foe.kind
  run.battle = null
  if (result === 'lose') g.finishRun('lose')
  else if (result === 'win' && kind === 'boss') g.finishRun('clear')
  else g.save()
}

export function onBattleWin(g: Game): void {
  const run = g.p.run!
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
    g.stat('elitesKilled')
  } else {
    got.mat_yaodan = 3 + Math.floor(Math.random() * 3)
    got[herb] = 2 + Math.floor(Math.random() * 2)
    if (!g.p.flags['clear_' + d.id]) for (const [id, n] of Object.entries(d.firstClear)) got[id] = (got[id] ?? 0) + n
    g.stat('bossesKilled')
  }
  g.stat('kills')
  g.runLoot(got)
  const text = Object.entries(got).map(([id, n]) => `${itemById(id).name}×${n}`).join('、')
  if (text) run.battle!.log.push('獲得：' + text)
}

/** 結束秘境：clear 通關、leave 撤退（保留全部戰利品）、lose 戰敗（失去一半） */
export function finishRun(g: Game, result: 'clear' | 'leave' | 'lose'): void {
  const run = g.p.run
  if (!run || (run.battle && !run.battle.over)) return
  const d = dungeonById(run.dungeonId)
  const kept: Record<string, number> = {}
  for (const [id, n] of Object.entries(run.loot)) {
    const k = result === 'lose' ? Math.floor(n / 2) : n
    if (k > 0) { kept[id] = k; g.addItem(id, k) }
  }
  const text = Object.entries(kept).map(([id, n]) => `${itemById(id).name}×${n}`).join('、') || '無'
  const head = result === 'clear' ? `🎉 通關${d.name}！` : result === 'lose' ? `你在${d.name}戰敗，狼狽逃回，失去一半戰利品。` : `你從${d.name}撤離。`
  if (result === 'clear') {
    play('success')
    g.toast(head, '🏆', 4000)
    g.p.flags['clear_' + d.id] = true
    g.stat('dungeonClears')
  }
  g.lastRunSummary = `${head}帶回：${text}`
  g.addLog(g.lastRunSummary, result === 'lose' ? 'bad' : 'good')
  g.p.run = null
  g.runNote = ''
  g.save()
}
