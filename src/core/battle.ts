// 回合制戰鬥：純函式，方便測試
import { enemyById } from '../data/dungeons'
import type { Skill } from '../data/techniques'

export const STAT_GROWTH = 1.2

export interface CombatStats { maxHp: number; maxMp: number; atk: number; def: number }

export function playerStats(stage: number, mult: { atk?: number; def?: number; hp?: number }): CombatStats {
  const g = Math.pow(STAT_GROWTH, stage)
  return {
    maxHp: Math.round(120 * g * (mult.hp ?? 1)),
    maxMp: 50 + stage * 4,
    atk: Math.round(22 * g * (mult.atk ?? 1)),
    def: Math.round(6 * g * (mult.def ?? 1)),
  }
}

export interface Foe {
  enemyId: string
  name: string
  icon: string
  hp: number
  maxHp: number
  atk: number
  def: number
  kind: 'normal' | 'elite' | 'boss'
}

export function makeFoe(enemyId: string, level: number, kind: Foe['kind']): Foe {
  const e = enemyById(enemyId)
  const g = Math.pow(STAT_GROWTH, level)
  const k = kind === 'elite' ? 1.5 : 1
  const maxHp = Math.round(70 * g * e.hp * k)
  return {
    enemyId, name: (kind === 'elite' ? '精英．' : '') + e.name, icon: e.icon,
    hp: maxHp, maxHp, atk: Math.round(13 * g * e.atk * k), def: Math.round(4 * g * e.def * k), kind,
  }
}

export interface BattleState {
  foe: Foe
  turn: number
  log: string[]
  over: 'win' | 'lose' | 'fled' | null
}

export interface Fighter { hp: number; mp: number; stats: CombatStats }

export type Action = { type: 'attack' } | { type: 'skill'; skill: Skill } | { type: 'heal'; pct: number } | { type: 'flee' }

export function damage(atk: number, power: number, def: number, rand: () => number) {
  const crit = rand() < 0.1
  const raw = atk * power * (0.9 + rand() * 0.2) - def * 0.5
  return { dmg: Math.max(1, Math.round(raw * (crit ? 1.5 : 1))), crit }
}

/** 執行玩家行動與妖獸回合，直接修改 battle 與 me */
export function playTurn(battle: BattleState, me: Fighter, action: Action, rand = Math.random): void {
  if (battle.over) return
  const foe = battle.foe
  const log = (s: string) => battle.log.push(s)
  battle.turn++

  switch (action.type) {
    case 'attack': {
      const { dmg, crit } = damage(me.stats.atk, 1, foe.def, rand)
      foe.hp -= dmg
      log(`你出手攻擊，造成 ${dmg} 傷害${crit ? '（暴擊！）' : ''}`)
      break
    }
    case 'skill': {
      if (me.mp < action.skill.cost) { log('靈力不足！'); battle.turn--; return }
      me.mp -= action.skill.cost
      const { dmg, crit } = damage(me.stats.atk, action.skill.power, foe.def, rand)
      foe.hp -= dmg
      log(`你施展「${action.skill.name}」，造成 ${dmg} 傷害${crit ? '（暴擊！）' : ''}`)
      break
    }
    case 'heal': {
      const amt = Math.round(me.stats.maxHp * action.pct)
      me.hp = Math.min(me.stats.maxHp, me.hp + amt)
      log(`你服下丹藥，回復 ${amt} 氣血`)
      break
    }
    case 'flee': {
      if (foe.kind !== 'boss' && rand() < 0.6) {
        battle.over = 'fled'
        log('你成功脫離戰鬥')
        return
      }
      log(foe.kind === 'boss' ? '首領威壓籠罩，無法逃脫！' : '逃跑失敗！')
      break
    }
  }

  if (foe.hp <= 0) {
    foe.hp = 0
    battle.over = 'win'
    log(`${foe.name}倒下了！`)
    return
  }

  // 妖獸回合
  const e = enemyById(foe.enemyId)
  const useSkill = e.skill && battle.turn % e.skill.every === 0
  const { dmg, crit } = damage(foe.atk, useSkill ? e.skill!.power : 1, me.stats.def, rand)
  me.hp -= dmg
  log(useSkill
    ? `${foe.name}施展「${e.skill!.name}」，你受到 ${dmg} 傷害`
    : `${foe.name}攻擊，你受到 ${dmg} 傷害${crit ? '（暴擊！）' : ''}`)
  me.mp = Math.min(me.stats.maxMp, me.mp + 4)
  if (me.hp <= 0) {
    me.hp = 0
    battle.over = 'lose'
    log('你力竭倒下……')
  }
}
