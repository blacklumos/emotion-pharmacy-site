/* 角色资料 —— 只描述“这个人是谁”，台词与故事放在事件与信件文件中。
 * 立绘是可替换资源：portrait 指向 assets/characters/ 下的图片，换图时只改这里。
 */
EP.defineCharacters([
  {
    id: 'char_linzhi',
    name: '林栀',
    age: 21,
    occupation: '大学生',
    role: '主线顾客 ',
    themeColor: '#feca57',
    secondaryColor: '#48dbfb',
    paperColor: '#fef9ef',
    pattern: 'dots',
    seal: '栀',
    portrait: 'assets/characters/linzhi.svg',
    keywords: ['自我要求', '周全', '迟疑', '害怕失败'],
    description: '习惯用表现证明自己，难以接受不确定性。她不是没有主见，而是太擅长替每一种选择列出理由，最后连自己的愿望也变成了需要论证的命题。',
    speech: [
      '说话有条理，常常先解释前因后果。',
      '喜欢说「其实」「我知道」「倒也不是」。',
      '即使情绪激动，也会努力维持礼貌。',
      '越难过，反而越容易把话说得客观。'
    ],
    eventIds: ['event_001', 'event_004', 'event_010']
  },
  {
    id: 'char_tangyuan',
    name: '唐沅沅',
    age: 19,
    occupation: '大学生 · 内容创作者',
    role: '独立顾客 · 一次来访',
    themeColor: '#ff9ff3',
    secondaryColor: '#feca57',
    paperColor: '#fef9ef',
    pattern: 'zigzag',
    seal: '沅',
    portrait: 'assets/characters/tangyuan.svg',
    keywords: ['网感', '幽默', '嘴硬', '在意关注'],
    description: '她用玩笑保护自己，也确实喜欢好玩的东西。她讨厌被一句话定义，但并不讨厌认真说话。',
    speech: [
      '经常使用「救命」「笑死」「有一说一」「我真的会谢」。',
      '喜欢用梗缓和尴尬。',
      '情绪越认真，越容易突然开玩笑。',
      '不喜欢别人把自己分析得头头是道。'
    ],
    eventIds: ['event_002']
  },
  {
    id: 'char_xutang',
    name: '许然',
    age: 40,
    occupation: '文学爱好者',
    role: '常驻顾客 · 两次来访',
    themeColor: '#1dd1a1',
    secondaryColor: '#e6b566',
    paperColor: '#fef9ef',
    pattern: 'waves',
    seal: '然',
    portrait: 'assets/characters/xutang.png',
    keywords: ['文雅', '克制', '怀旧', '善写难言'],
    description: '他能把一件事写得很漂亮，却未必能在现实里说清楚。他不是活在古代，只是习惯借助文字组织情感。',
    speech: [
      '用词讲究，喜欢完整句子。',
      '偶尔引用古诗词，但不是每句话都引经据典。',
      '很少直接说「我难过」，更喜欢描述景物。',
      '越是无法面对的事情，越容易写出漂亮的文字。'
    ],
    eventIds: ['event_003', 'event_007']
  },
  {
    id: 'char_zhouye',
    name: '周叙言',
    age: 23,
    occupation: '职场新人',
    role: '常驻顾客 · 两次来访',
    themeColor: '#48dbfb',
    secondaryColor: '#ff6b6b',
    paperColor: '#fef9ef',
    pattern: 'grid',
    seal: '叙',
    portrait: 'assets/characters/zhouye.png',
    keywords: ['拒绝','直接', '务实', '责任感', '不善安慰'],
    description: '他不擅长修饰语言，却不代表他粗心。他可能是六个人里最能察觉别人实际困难的人，只是不知道该怎么安慰。',
    speech: [
      '不爱绕弯，问题是什么就说什么。',
      '不喜欢空泛的安慰。',
      '常说「我就直说了」「反正」「没必要」。',
      '遇到情绪问题时，会先寻找解决方案。'
    ],
    eventIds: ['event_005', 'event_006']
  },
  {
    id: 'char_shenhe',
    name: '沈禾',
    age: 35,
    occupation: '普通职员',
    role: '独立顾客 · 一次来访',
    themeColor: '#ff6b6b',
    secondaryColor: '#1dd1a1',
    paperColor: '#fef9ef',
    pattern: 'checker',
    seal: '禾',
    portrait: 'assets/characters/shenhe.svg',
    keywords: ['责任','朴实', '温和', '隐忍', '记得别人'],
    description: '她不会突然说出一句惊人的人生哲理，但她记得谁爱吃什么，谁最近睡得不好。她很少把自己算进需要被照顾的人里。',
    speech: [
      '用词简单，很少使用抽象概念。',
      '不太会描述自己的情绪。',
      '喜欢说「没事」「都行」「习惯了」。',
      '会先解释家人的难处，再说自己的感受。'
    ],
    eventIds: ['event_008']
  },
  {
    id: 'char_guhuaian',
    name: '顾怀安',
    age: 63,
    occupation: '修鞋铺店主',
    role: '独立顾客 · 一次来访',
    themeColor: '#ff9f43',
    secondaryColor: '#48dbfb',
    paperColor: '#fef9ef',
    pattern: 'stripes',
    seal: '顾',
    portrait: 'assets/characters/guhuaian.svg',
    keywords: ['固执', '傲娇', '惜物', '嘴硬心软'],
    description: '他不肯说舍不得，只会反复强调某件旧物还能用。他看起来最难相处，却可能是最珍惜细节的人。',
    speech: [
      '不爱解释自己的心情。',
      '常用「有什么好说的」「我不是舍不得」「还能用」。',
      '对别人的关心会先反驳。',
      '习惯用具体的事情表达感情，而不是直接说出来。'
    ],
    eventIds: ['event_009']
  }
]);
