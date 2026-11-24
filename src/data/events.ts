// 奇遇事件：每則事件有多個選項，效果以修為百分比或固定獎勵表示
export interface EventEffect {
  /** 依當前境界所需修為的比例增減，例如 0.2 = +20% */
  cultivationPct?: number
  /** 獲得（正數）或失去（負數）物品 { itemId: 數量 } */
  items?: Record<string, number>
  /** 獲得功法 id */
  technique?: string
  /** 增益：修煉倍率與秒數 */
  buff?: { mult: number; durationSec: number }
  text: string
}

export interface EventChoice {
  label: string
  /** 成功機率（0~1），省略代表必定成功 */
  chance?: number
  /** 選項需要的物品（不足時無法選） */
  cost?: Record<string, number>
  success: EventEffect
  fail?: EventEffect
}

export interface GameEvent {
  id: string
  title: string
  body: string
  minStage?: number
  maxStage?: number
  /** 出現權重，預設 10 */
  weight?: number
  /** 一生只會遇到一次 */
  once?: boolean
  choices: EventChoice[]
}

const leave = (text = '你謹慎離去，無事發生。'): EventChoice => ({ label: '離開', success: { text } })

export const EVENTS: GameEvent[] = [
  {
    id: 'old-man', title: '路遇老者',
    body: '山道旁，一名衣衫襤褸的老者倒臥在地，氣息微弱。',
    choices: [
      {
        label: '渡一縷靈氣救治', chance: 0.7,
        success: { cultivationPct: 0.3, text: '老者睜眼一笑，指尖輕點你眉心，一段心得湧入腦海。' },
        fail: { cultivationPct: -0.1, text: '老者化作一縷黑煙，竟是魔修幻象！你損耗了些許修為。' },
      },
      leave('你繞道而行，無事發生。'),
    ],
  },
  {
    id: 'spirit-spring', title: '靈泉',
    body: '你在幽谷深處發現一汪冒著靈霧的泉水。',
    choices: [
      { label: '盤坐吐納', success: { cultivationPct: 0.15, text: '靈氣入體，周天運轉更加順暢。' } },
      {
        label: '裝瓶帶走煉丹', chance: 0.8,
        success: { items: { pill_break: 1 }, text: '你以靈泉之水煉成一枚破境丹。' },
        fail: { text: '靈泉離地即散，你只裝到一瓶普通的水。' },
      },
    ],
  },
  {
    id: 'cave', title: '前輩洞府',
    body: '崖壁上隱約可見禁制光芒，似是某位前輩坐化之地。',
    choices: [
      {
        label: '強破禁制', chance: 0.5,
        success: { cultivationPct: 0.5, items: { pill_break: 1 }, text: '禁制應聲而碎，洞中留有前輩手札與丹藥！' },
        fail: { cultivationPct: -0.2, text: '禁制反噬，你受了內傷。' },
      },
      { label: '叩首三拜後離開', success: { cultivationPct: 0.05, text: '你心生敬意，道心更加澄明。' } },
    ],
  },
  {
    id: 'rival', title: '同門挑釁',
    body: '一名同門弟子攔住去路：「聽說你最近進境神速？讓我試試！」',
    choices: [
      {
        label: '應戰', chance: 0.6,
        success: { cultivationPct: 0.2, text: '一番切磋後你略勝一籌，對功法的理解更深了。' },
        fail: { cultivationPct: -0.05, text: '你落敗，回去閉門苦思。' },
      },
      { label: '一笑置之', success: { text: '「無聊。」對方悻悻離去。' } },
    ],
  },
  {
    id: 'herb-field', title: '野生藥田',
    body: '林間一片無主藥田，靈草長得正好，旁邊卻有一頭打盹的青狼。',
    choices: [
      {
        label: '悄悄採摘', chance: 0.65,
        success: { items: { herb_lingcao: 4, herb_ningxue: 2 }, text: '你屏息採完藥草，青狼仍在酣睡。' },
        fail: { items: { herb_lingcao: 1 }, cultivationPct: -0.05, text: '青狼驚醒撲來，你抓了一株就跑。' },
      },
      {
        label: '先斬青狼', chance: 0.5,
        success: { items: { herb_lingcao: 4, mat_yaodan: 1 }, text: '青狼伏誅，藥田與妖丹盡歸你所有。' },
        fail: { cultivationPct: -0.1, text: '青狼兇悍，你負傷退走。' },
      },
      leave(),
    ],
  },
  {
    id: 'merchant', title: '雲遊商人',
    body: '一名背著大竹簍的商人笑瞇瞇地說：「道友，用妖丹換點好東西？」',
    choices: [
      { label: '2 妖丹換破境丹', cost: { mat_yaodan: 2 }, success: { items: { pill_break: 1 }, text: '銀貨兩訖。' } },
      { label: '1 妖丹換朱果×2', cost: { mat_yaodan: 1 }, success: { items: { herb_zhuguo: 2 }, text: '商人遞來兩顆紅豔的朱果。' } },
      leave('「下次再來呀～」'),
    ],
  },
  {
    id: 'thunder-tree', title: '雷擊古木',
    minStage: 4,
    body: '一棵被天雷劈開的古木仍冒著電光，木心泛著紫芒。',
    choices: [
      {
        label: '徒手取木心', chance: 0.55,
        success: { items: { herb_leiji: 2 }, text: '雷光竄過全身，你咬牙取出兩截雷擊木。' },
        fail: { cultivationPct: -0.15, text: '雷勁入體，經脈受損。' },
      },
      { label: '在旁感悟雷意', success: { cultivationPct: 0.12, text: '你隱約觸摸到天雷的軌跡。' } },
    ],
  },
  {
    id: 'sect-mission', title: '宗門任務',
    body: '執事長老發布任務：清剿山下作亂的妖獸，酬勞豐厚。',
    choices: [
      {
        label: '接下任務', chance: 0.7,
        success: { items: { mat_yaodan: 2 }, cultivationPct: 0.1, text: '你斬妖歸來，領得妖丹與宗門賞賜。' },
        fail: { cultivationPct: -0.08, text: '妖獸狡猾，你無功而返。' },
      },
      leave('你決定專心閉關。'),
    ],
  },
  {
    id: 'inner-demon', title: '心魔',
    minStage: 3,
    body: '打坐時，你眼前浮現過往的遺憾與執念，心神動搖……',
    choices: [
      {
        label: '直面心魔', chance: 0.6,
        success: { cultivationPct: 0.35, text: '你斬斷執念，道心通明，修為大漲。' },
        fail: { cultivationPct: -0.25, text: '心魔反噬，你差點走火入魔。' },
      },
      { label: '默誦清心咒', success: { cultivationPct: 0.03, text: '心境漸漸平復。' } },
    ],
  },
  {
    id: 'auction', title: '坊市拍賣',
    minStage: 2,
    body: '坊市正在拍賣一枚「悟心丹」，起拍價 4 妖丹。',
    choices: [
      { label: '出價 4 妖丹', cost: { mat_yaodan: 4 }, chance: 0.7,
        success: { items: { pill_wuxin: 1 }, text: '一錘定音，悟心丹歸你了。' },
        fail: { items: { mat_yaodan: 4 }, text: '有人加價搶走，妖丹如數退還。' } },
      leave('你只是來看熱鬧的。'),
    ],
  },
  {
    id: 'fox-spirit', title: '靈狐報恩',
    body: '一隻受傷的白狐躲進你的洞府，眼神楚楚可憐。',
    choices: [
      { label: '為牠療傷', success: { buff: { mult: 1.5, durationSec: 900 }, text: '白狐痊癒後每日叼來靈果，你修煉時神清氣爽。（15 分鐘修煉 ×1.5）' } },
      { label: '取其妖丹', chance: 0.8,
        success: { items: { mat_yaodan: 1 }, cultivationPct: -0.05, text: '你得了妖丹，心中卻隱隱不安。' },
        fail: { text: '白狐趁隙逃走了。' } },
    ],
  },
  {
    id: 'ancient-scroll', title: '殘破玉簡',
    once: true, minStage: 2,
    body: '你在舊書攤的角落發現一枚殘破玉簡，神識探入竟是一部心法。',
    choices: [
      { label: '花點小錢買下', success: { technique: 't_qingyuan', text: '攤主不識貨，你以極低價格得到《青元功》。' } },
      leave('你沒放在心上。'),
    ],
  },
  {
    id: 'alchemist', title: '丹道宗師',
    once: true, minStage: 3,
    body: '一位滿身藥香的老者看你採藥手法：「小友頗有慧根，可願聽老夫講一堂丹道？」',
    choices: [
      { label: '恭敬聆聽', success: { technique: 't_danxin', items: { herb_zhuguo: 2 }, text: '老者傳你《丹心訣》，臨別又贈朱果兩枚。' } },
      leave('你婉拒了老者。'),
    ],
  },
  {
    id: 'five-elements', title: '五行石碑',
    once: true, minStage: 5,
    body: '荒原中矗立五塊石碑，分別刻著金木水火土，碑文晦澀難明。',
    choices: [
      { label: '逐一參悟', chance: 0.6,
        success: { technique: 't_wuxing', text: '五碑共鳴，你悟出《五行歸元經》！' },
        fail: { cultivationPct: 0.1, text: '你只悟得皮毛，但也有所收穫。' } },
      leave(),
    ],
  },
  {
    id: 'thunder-pool', title: '雷池',
    once: true, minStage: 7,
    body: '山巔雷池翻湧，池底似乎有一枚刻滿雷紋的骨片。',
    choices: [
      { label: '躍入雷池', chance: 0.5,
        success: { technique: 't_leiyin', text: '萬雷淬體，你取得骨片，得《雷音淬體訣》！' },
        fail: { cultivationPct: -0.2, text: '雷勁太猛，你被轟出雷池。' } },
      leave(),
    ],
  },
  {
    id: 'sword-tomb', title: '劍冢',
    once: true, minStage: 11,
    body: '萬劍林立的古冢中，一柄斷劍發出清越劍鳴，似在召喚你。',
    choices: [
      { label: '拔劍', chance: 0.45,
        success: { technique: 't_taixu', text: '劍意入體，你得到上古劍修傳承《太虛劍典》！' },
        fail: { cultivationPct: -0.15, text: '劍意凌厲，你被震退數丈。' } },
      leave(),
    ],
  },
  {
    id: 'primordial', title: '鴻蒙紫氣',
    once: true, minStage: 18, weight: 4,
    body: '天地間一縷紫氣東來，傳說得之者可窺大道本源。',
    choices: [
      { label: '以身承接', chance: 0.4,
        success: { technique: 't_hongmeng', text: '紫氣入體，你參悟《鴻蒙造化功》，大道在望！' },
        fail: { cultivationPct: 0.3, text: '紫氣消散，但你仍沐浴其餘韻。' } },
    ],
  },
  {
    id: 'demonic', title: '魔修誘惑',
    minStage: 6,
    body: '黑袍人低語：「這枚血丹可讓你修為暴漲，只需你一滴心頭血。」',
    choices: [
      { label: '接受', chance: 0.4,
        success: { cultivationPct: 0.6, text: '修為暴漲！但你隱約覺得有什麼被奪走了。' },
        fail: { cultivationPct: -0.35, text: '血丹有毒，你修為大損。' } },
      { label: '拔劍斬之', chance: 0.6,
        success: { items: { mat_yaodan: 3 }, text: '你斬殺魔修，得其儲物袋。' },
        fail: { cultivationPct: -0.1, text: '魔修遁走，你也受了些傷。' } },
    ],
  },
  {
    id: 'cold-lake', title: '寒潭冰蓮',
    minStage: 4,
    body: '寒潭中央盛開著一朵晶瑩的冰蓮，潭水寒徹骨髓。',
    choices: [
      { label: '潛入採摘', chance: 0.6,
        success: { items: { herb_xuanbing: 2 }, text: '你採得兩朵玄冰蓮。' },
        fail: { cultivationPct: -0.08, text: '寒氣入體，你凍得直打哆嗦。' } },
      leave(),
    ],
  },
  {
    id: 'dragon-whisper', title: '龍吟',
    minStage: 12, weight: 5,
    body: '深淵傳來低沉龍吟，崖邊長著幾株沾染龍息的仙草。',
    choices: [
      { label: '冒險採摘', chance: 0.5,
        success: { items: { herb_longxian: 1 }, text: '你取得一株龍涎草，龍吟聲漸漸遠去。' },
        fail: { cultivationPct: -0.2, text: '龍威壓下，你吐血而退。' } },
      leave(),
    ],
  },
  {
    id: 'enlightenment', title: '頓悟',
    weight: 4,
    body: '看著落葉飄零，你心有所感……',
    choices: [
      { label: '順其自然', success: { cultivationPct: 0.4, text: '你頓悟一番，修為精進。' } },
    ],
  },
  {
    id: 'sect-lecture', title: '長老講道',
    body: '宗門長老今日開壇講道，台下座無虛席。',
    choices: [
      { label: '前往聽講', success: { buff: { mult: 1.3, durationSec: 600 }, text: '你聽得如痴如醉。（10 分鐘修煉 ×1.3）' } },
      { label: '趁機去採藥', success: { items: { herb_lingcao: 2, herb_ningxue: 1 }, text: '山上人少，你採了不少靈草。' } },
    ],
  },
]

/** 依境界、一次性旗標與權重抽選事件 */
export function pickEvent(stage: number, seen: Record<string, boolean>, rand = Math.random): GameEvent | null {
  const pool = EVENTS.filter((e) =>
    (e.minStage ?? 0) <= stage && (e.maxStage ?? Infinity) >= stage && !(e.once && seen['ev_' + e.id]))
  const total = pool.reduce((s, e) => s + (e.weight ?? 10), 0)
  let x = rand() * total
  for (const e of pool) if ((x -= e.weight ?? 10) < 0) return e
  return pool[0] ?? null
}
