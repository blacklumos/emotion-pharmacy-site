/* 角色资料 —— 只描述“这个人是谁”，台词与故事放在事件与信件文件中。
 * 立绘是可替换资源：portrait 指向 assets/characters/ 下的图片，换图时只改这里。
 */
EP.defineCharacters([
  {
    id: 'char_linzhi',
    name: '林栀',
    age: 21,
    occupation: '大学生',
    role: '清澈的眼神 ',
    themeColor: '#feca57',
    secondaryColor: '#48dbfb',
    paperColor: '#fef9ef',
    pattern: 'dots',
    seal: '栀',
    portrait: 'assets/characters/linzhi.svg',
    keywords: ['自我要求', '周全', '迟疑', '害怕失败'],
    description: '习惯用表现证明自己，难以接受不确定性。擅长替每一种选择列出理由，对每件事加上意义，最后连自己的愿望也变成了需要论证的命题。',
    speech: [
      '喜欢茉莉味的东西。',
      '说话有条理，常常先解释前因后果。',
      '喜欢说「其实」「我知道」「倒也不是」。',
      '即使情绪激动，也会努力维持礼貌。',
      '越难过，反而越容易把话说得客观，喜欢第三人称视角看自己。'
    ],
    eventIds: ['event_001', 'event_004', 'event_010']
  },
  {
    id: 'char_tangyuan',
    name: '唐沅沅',
    age: 19,
    occupation: '内容创作者',
    role: '看着很时尚',
    themeColor: '#ff9ff3',
    secondaryColor: '#feca57',
    paperColor: '#fef9ef',
    pattern: 'zigzag',
    seal: '沅',
    portrait: 'assets/characters/tangyuan.svg',
    keywords: ['网感', '幽默', '嘴硬', '在意关注'],
    description: '她喜欢开玩笑，也确实喜欢好玩的东西。讨厌被一句话定义，但并不讨厌认真说话，很真诚。',
    speech: [
      '经常使用「救命」「笑死」「有一说一」「我真的会谢」。',
      '喜欢用梗缓和尴尬。',
      '情绪越认真，越容易突然开玩笑。',
      '不喜欢别人把自己分析得头头是道，哒咩哒咩。'
    ],
    eventIds: ['event_002']
  },
  {
    id: 'char_xutang',
    name: '许然',
    age: 40,
    occupation: '文学爱好者',
    role: '感觉很有气质',
    themeColor: '#1dd1a1',
    secondaryColor: '#e6b566',
    paperColor: '#fef9ef',
    pattern: 'waves',
    seal: '然',
    portrait: 'assets/characters/xutang.svg',
    keywords: ['文雅', '克制', '怀旧', '善写难言'],
    description: '他能把一件事写得很漂亮，却未必能在现实里说清楚。倒像一本古书？不那么适配现代显卡。',
    speech: [
      '用词讲究，喜欢完整句子。',
      '偶尔引用古诗词，是自然的联想，不是刻意卖弄。',
      '很少直接说「我难过」，喜欢以意向承接情感。',
      '越是无法面对的事情，越是“文学在苦难中生长”。'
    ],
    eventIds: ['event_003', 'event_007']
  },
  {
    id: 'char_zhouye',
    name: '周叙言',
    age: 23,
    occupation: '职场新人',
    role: '貌似脸上有996这几个数字',
    themeColor: '#48dbfb',
    secondaryColor: '#ff6b6b',
    paperColor: '#fef9ef',
    pattern: 'grid',
    seal: '叙',
    portrait: 'assets/characters/zhouye.svg',
    keywords: ['拒绝','直接', '务实', '责任感', '不善安慰'],
    description: '他不擅长修饰语言，不代表粗心。能察觉别人实际困难的人，只是不知道该怎么安慰。',
    speech: [
      '不绕弯子（人形豆包），问题是什么就说什么。',
      '不喜欢空泛的安慰。',
      '常说「我就直说了」「反正」「没必要」。',
      '往往情绪还没上来就先把问题解决了'
    ],
    eventIds: ['event_005', 'event_006']
  },
  {
    id: 'char_shenhe',
    name: '沈禾',
    age: 35,
    occupation: '普通职员',
    role: '茫茫人海中最平凡一个',
    themeColor: '#ff6b6b',
    secondaryColor: '#1dd1a1',
    paperColor: '#fef9ef',
    pattern: 'checker',
    seal: '禾',
    portrait: 'assets/characters/shenhe.svg',
    keywords: ['责任','朴实', '温和', '隐忍', '记得别人'],
    description: '她不会突然说出一句惊人的人生哲理，但她记得谁爱吃什么，谁最近睡得不好。很少把自己算进需要被照顾的人里。',
    speech: [
      '用词简单，很少使用抽象概念。',
      '不太会描述自己的情绪。',
      '喜欢说「没事」「都行」「习惯了」。',
      '先解释事情，再说自己的感受。'
    ],
    eventIds: ['event_008']
  },
  {
    id: 'char_guhuaian',
    name: '顾怀安',
    age: 63,
    occupation: '修鞋铺店主',
    role: '貌似在街头遇到过',
    themeColor: '#ff9f43',
    secondaryColor: '#48dbfb',
    paperColor: '#fef9ef',
    pattern: 'stripes',
    seal: '顾',
    portrait: 'assets/characters/guhuaian.svg',
    keywords: ['固执', '傲娇', '惜物', '嘴硬心软'],
    description: '他不说舍不得，但会反复强调某件旧物还能用。有人说是老古董，却也是珍惜细节。',
    speech: [
      '不爱解释自己的心情。',
      '常用「有什么好说的」「我不是舍不得」「还能用啊」。',
      '对别人的关心会先反驳。',
      '习惯用具体的事情表达感情，而不是直接说出来。'
    ],
    eventIds: ['event_009']
  }
]);
