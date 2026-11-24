import type { PlayerState } from '../core/player'
import { MAX_STAGE } from './realms'
import { DUNGEONS } from './dungeons'

export interface Achievement {
  id: string
  name: string
  icon: string
  desc: string
  /** 回傳 [目前值, 目標值] */
  progress: (p: PlayerState) => [number, number]
  reward?: Record<string, number>
}

const stat = (key: string, target: number) => (p: PlayerState): [number, number] => [p.stats[key] ?? 0, target]
const stage = (target: number) => (p: PlayerState): [number, number] => [p.stage, target]
const clears = (target: number) => (p: PlayerState): [number, number] =>
  [DUNGEONS.filter((d) => p.flags['clear_' + d.id]).length, target]

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a_stage1', name: '初入仙途', icon: '🌱', desc: '突破至煉氣中期', progress: stage(1), reward: { herb_lingcao: 5 } },
  { id: 'a_found', name: '築基有成', icon: '🏯', desc: '踏入築基期', progress: stage(4), reward: { pill_break: 1 } },
  { id: 'a_core', name: '金丹大道', icon: '🟡', desc: '踏入結丹期', progress: stage(8), reward: { pill_wuxin: 1 } },
  { id: 'a_nascent', name: '元嬰老祖', icon: '👶', desc: '踏入元嬰期', progress: stage(12), reward: { pill_dujie: 1 } },
  { id: 'a_spirit', name: '化神真君', icon: '🌌', desc: '踏入化神期', progress: stage(16), reward: { pill_dujie: 1, mat_yaodan: 20 } },
  { id: 'a_ascend', name: '白日飛升', icon: '☁', desc: '修至渡劫圓滿，飛升仙界', progress: stage(MAX_STAGE) },
  { id: 'a_rebirth', name: '輪迴不滅', icon: '🔄', desc: '轉世一次', progress: (p) => [p.rebirths, 1], reward: { pill_wuxin: 3 } },
  { id: 'a_tap1', name: '勤修不輟', icon: '🧘', desc: '打坐 500 次', progress: stat('taps', 500), reward: { pill_juqi: 2 } },
  { id: 'a_tap2', name: '坐忘', icon: '🪷', desc: '打坐 5000 次', progress: stat('taps', 5000), reward: { pill_wuxin: 2 } },
  { id: 'a_gather', name: '採藥郎', icon: '🌿', desc: '採藥 20 次', progress: stat('gathers', 20), reward: { herb_zhuguo: 3 } },
  { id: 'a_craft1', name: '初窺丹道', icon: '⚗', desc: '成功煉製 1 枚丹藥', progress: stat('craftSuccess', 1), reward: { herb_lingcao: 5 } },
  { id: 'a_craft2', name: '丹道宗師', icon: '🔥', desc: '成功煉製 50 枚丹藥', progress: stat('craftSuccess', 50), reward: { herb_xuanbing: 3 } },
  { id: 'a_kill1', name: '斬妖除魔', icon: '⚔', desc: '擊敗 10 隻妖獸', progress: stat('kills', 10), reward: { pill_huichun: 3 } },
  { id: 'a_kill2', name: '百戰不殆', icon: '🗡', desc: '擊敗 100 隻妖獸', progress: stat('kills', 100), reward: { mat_yaodan: 15 } },
  { id: 'a_clear1', name: '秘境初探', icon: '🗺', desc: '通關任一秘境', progress: clears(1), reward: { mat_yaodan: 3 } },
  { id: 'a_clearall', name: '踏遍三界', icon: '🌏', desc: '通關全部秘境', progress: clears(DUNGEONS.length), reward: { pill_dujie: 3 } },
  { id: 'a_perfect', name: '雷劫不侵', icon: '⚡', desc: '毫髮無傷渡過一次天劫', progress: stat('perfectTribulations', 1), reward: { herb_leiji: 2 } },
  { id: 'a_fail', name: '屢敗屢戰', icon: '💢', desc: '突破失敗 5 次', progress: stat('breakFails', 5), reward: { pill_break: 2 } },
  { id: 'a_tech', name: '博覽群經', icon: '📚', desc: '收集 4 部功法', progress: (p) => [p.techniques.length, 4], reward: { mat_yaodan: 5 } },
  { id: 'a_event', name: '福緣深厚', icon: '🍀', desc: '經歷 30 次奇遇', progress: stat('events', 30), reward: { pill_wuxin: 1 } },
]
