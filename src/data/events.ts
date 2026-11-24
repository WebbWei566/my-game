// 奇遇事件：每則事件有多個選項，效果以修為百分比或固定獎勵表示
export interface EventEffect {
  /** 依當前境界所需修為的比例增減，例如 0.2 = +20% */
  cultivationPct?: number
  /** 獲得物品 { itemId: 數量 } */
  items?: Record<string, number>
  /** 獲得功法 id */
  technique?: string
  text: string
}

export interface EventChoice {
  label: string
  /** 成功機率（0~1），省略代表必定成功 */
  chance?: number
  success: EventEffect
  fail?: EventEffect
}

export interface GameEvent {
  id: string
  title: string
  body: string
  choices: EventChoice[]
}

export const EVENTS: GameEvent[] = [
  {
    id: 'old-man',
    title: '路遇老者',
    body: '山道旁，一名衣衫襤褸的老者倒臥在地，氣息微弱。',
    choices: [
      {
        label: '渡一縷靈氣救治',
        chance: 0.7,
        success: { cultivationPct: 0.3, text: '老者睜眼一笑，指尖輕點你眉心，一段心得湧入腦海。（修為大增）' },
        fail: { cultivationPct: -0.1, text: '老者化作一縷黑煙，竟是魔修幻象！你損耗了些許修為。' },
      },
      { label: '繞道而行', success: { text: '你謹慎離去，無事發生。' } },
    ],
  },
  {
    id: 'spirit-spring',
    title: '靈泉',
    body: '你在幽谷深處發現一汪冒著靈霧的泉水。',
    choices: [
      { label: '盤坐吐納', success: { cultivationPct: 0.15, text: '靈氣入體，周天運轉更加順暢。' } },
      {
        label: '裝瓶帶走煉丹',
        chance: 0.8,
        success: { items: { pill_break: 1 }, text: '你以靈泉之水煉成一枚破境丹。' },
        fail: { text: '靈泉離地即散，你只裝到一瓶普通的水。' },
      },
    ],
  },
  {
    id: 'cave',
    title: '前輩洞府',
    body: '崖壁上隱約可見禁制光芒，似是某位前輩坐化之地。',
    choices: [
      {
        label: '強破禁制',
        chance: 0.5,
        success: { cultivationPct: 0.5, items: { pill_break: 1 }, text: '禁制應聲而碎，洞中留有前輩手札與丹藥！' },
        fail: { cultivationPct: -0.2, text: '禁制反噬，你受了內傷。' },
      },
      { label: '叩首三拜後離開', success: { cultivationPct: 0.05, text: '你心生敬意，道心更加澄明。' } },
    ],
  },
  {
    id: 'rival',
    title: '同門挑釁',
    body: '一名同門弟子攔住去路：「聽說你最近進境神速？讓我試試！」',
    choices: [
      {
        label: '應戰',
        chance: 0.6,
        success: { cultivationPct: 0.2, text: '一番切磋後你略勝一籌，對功法的理解更深了。' },
        fail: { cultivationPct: -0.05, text: '你落敗，回去閉門苦思。' },
      },
      { label: '一笑置之', success: { text: '「無聊。」對方悻悻離去。' } },
    ],
  },
]
