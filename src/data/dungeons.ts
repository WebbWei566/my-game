// 秘境與妖獸資料
export interface Enemy {
  id: string
  name: string
  icon: string
  hp: number
  atk: number
  def: number
  /** 妖獸武技：每隔幾回合施放一次 */
  skill?: { name: string; power: number; every: number }
}

export interface Dungeon {
  id: string
  name: string
  desc: string
  minStage: number
  /** 妖獸強度等級（對應境界階數） */
  level: number
  layers: number
  enemies: string[]
  elites: string[]
  boss: string
  /** 寶箱與戰利品可能出現的靈草 */
  herbs: string[]
  /** 首通獎勵 */
  firstClear: Record<string, number>
}

export const ENEMIES: Enemy[] = [
  { id: 'wolf', name: '青狼', icon: '🐺', hp: 1, atk: 1, def: 1 },
  { id: 'snake', name: '赤鱗蛇', icon: '🐍', hp: 0.8, atk: 1.2, def: 0.8 },
  { id: 'boar', name: '鐵背野豬', icon: '🐗', hp: 1.4, atk: 0.9, def: 1.4 },
  { id: 'wolf_king', name: '狼王', icon: '🐺', hp: 2.2, atk: 1.3, def: 1.2, skill: { name: '嘯月', power: 1.8, every: 3 } },
  { id: 'bat', name: '吸血蝠妖', icon: '🦇', hp: 0.9, atk: 1.1, def: 0.9 },
  { id: 'bear', name: '黑風熊', icon: '🐻', hp: 1.4, atk: 1.1, def: 1.3 },
  { id: 'black_wind', name: '黑風老妖', icon: '👹', hp: 2.4, atk: 1.4, def: 1.3, skill: { name: '黑風捲', power: 2, every: 3 } },
  { id: 'ice_spirit', name: '冰魄', icon: '❄', hp: 1, atk: 1.1, def: 1.2 },
  { id: 'yeti', name: '雪猿', icon: '🦍', hp: 1.5, atk: 1.2, def: 1.1 },
  { id: 'ice_dragon', name: '寒螭', icon: '🐉', hp: 3.4, atk: 1.5, def: 1.4, skill: { name: '冰息', power: 2.2, every: 3 } },
  { id: 'thunder_bird', name: '雷鵬', icon: '🦅', hp: 1.1, atk: 1.3, def: 1 },
  { id: 'kui', name: '夔牛', icon: '🐂', hp: 1.8, atk: 1.2, def: 1.5 },
  { id: 'thunder_beast', name: '雷澤神獸', icon: '⚡', hp: 3.6, atk: 1.6, def: 1.5, skill: { name: '萬雷', power: 2.4, every: 3 } },
  { id: 'demon', name: '魔修', icon: '🧛', hp: 1.2, atk: 1.4, def: 1.1 },
  { id: 'shade', name: '怨靈', icon: '👻', hp: 1, atk: 1.3, def: 1.3 },
  { id: 'demon_lord', name: '魔尊殘魂', icon: '😈', hp: 4, atk: 1.7, def: 1.6, skill: { name: '血海', power: 2.5, every: 3 } },
  { id: 'star_beast', name: '星獸', icon: '🌟', hp: 1.3, atk: 1.4, def: 1.4 },
  { id: 'void_walker', name: '虛空行者', icon: '🌀', hp: 1.5, atk: 1.5, def: 1.3 },
  { id: 'heaven_guard', name: '天門守將', icon: '🗿', hp: 3.6, atk: 1.8, def: 1.8, skill: { name: '天罰', power: 2.6, every: 3 } },
]

export const DUNGEONS: Dungeon[] = [
  {
    id: 'd_wolf', name: '青狼谷', desc: '宗門後山的山谷，常有狼群出沒。', minStage: 0, level: 0, layers: 6,
    enemies: ['wolf', 'snake'], elites: ['boar'], boss: 'wolf_king',
    herbs: ['herb_lingcao', 'herb_ningxue'], firstClear: { pill_break: 1, mat_yaodan: 3 },
  },
  {
    id: 'd_wind', name: '黑風山', desc: '妖風終年不散，傳說山中有老妖盤踞。', minStage: 4, level: 4, layers: 7,
    enemies: ['bat', 'snake', 'boar'], elites: ['bear'], boss: 'black_wind',
    herbs: ['herb_lingcao', 'herb_ningxue', 'herb_zhuguo'], firstClear: { pill_wuxin: 1, mat_yaodan: 6 },
  },
  {
    id: 'd_ice', name: '寒冰洞', desc: '萬年玄冰凝成的洞窟，寒氣能凍結神識。', minStage: 8, level: 8, layers: 7,
    enemies: ['ice_spirit', 'bat'], elites: ['yeti'], boss: 'ice_dragon',
    herbs: ['herb_zhuguo', 'herb_xuanbing'], firstClear: { pill_wuxin: 2, mat_yaodan: 10 },
  },
  {
    id: 'd_thunder', name: '雷澤', desc: '雷雲終年籠罩的大澤，雷獸橫行。', minStage: 12, level: 12, layers: 8,
    enemies: ['thunder_bird', 'ice_spirit'], elites: ['kui'], boss: 'thunder_beast',
    herbs: ['herb_xuanbing', 'herb_leiji', 'herb_longxian'], firstClear: { pill_dujie: 1, mat_yaodan: 15 },
  },
  {
    id: 'd_abyss', name: '魔淵', desc: '上古魔尊隕落之地，怨氣沖天。', minStage: 18, level: 18, layers: 8,
    enemies: ['demon', 'shade'], elites: ['void_walker'], boss: 'demon_lord',
    herbs: ['herb_leiji', 'herb_longxian'], firstClear: { pill_dujie: 2, mat_yaodan: 30 },
  },
  {
    id: 'd_heaven', name: '天外天', desc: '三界之外的虛空，傳說是飛升者的試煉之地。', minStage: 26, level: 26, layers: 9,
    enemies: ['star_beast', 'void_walker'], elites: ['demon'], boss: 'heaven_guard',
    herbs: ['herb_longxian'], firstClear: { pill_dujie: 3, mat_yaodan: 60 },
  },
]

const EMAP = new Map(ENEMIES.map((e) => [e.id, e]))
export const enemyById = (id: string): Enemy => {
  const e = EMAP.get(id)
  if (!e) throw new Error(`Unknown enemy: ${id}`)
  return e
}
export const dungeonById = (id: string): Dungeon => {
  const d = DUNGEONS.find((x) => x.id === id)
  if (!d) throw new Error(`Unknown dungeon: ${id}`)
  return d
}
