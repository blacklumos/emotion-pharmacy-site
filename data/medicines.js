/* 药物基础定义 —— 只描述药物本身，不决定任何顾客的反应。
 * 颜色使用孟菲斯风格的撞色；图标与颜色都可以在 data/medicines.js 里单独调整。
 */
EP.defineMedicines([
  {
    id: 'courage',
    name: '勇气',
    theme: '面对恐惧',
    meaning: '即使害怕，也允许自己迈出一步',
    note: '它不消除恐惧，只是让你在恐惧旁边，仍然可以往前走。',
    color: '#ff6b6b',
    deep: '#000000',
    glyph: 'step'
  },
  {
    id: 'believe',
    name: '相信',
    theme: '自我怀疑',
    meaning: '重新审视自己，而非急于否定自己',
    note: '不是保证你一定能做到，而是允许你重新看看自己。',
    color: '#feca57',
    deep: '#000000',
    glyph: 'seed'
  },
  {
    id: 'rest',
    name: '停歇',
    theme: '疲惫与压力',
    meaning: '允许自己暂时停下来',
    note: '停下来不需要理由，也不必先证明自己已经足够累。',
    color: '#48dbfb',
    deep: '#000000',
    glyph: 'moon'
  },
  {
    id: 'farewell',
    name: '告别',
    theme: '失去与结束',
    meaning: '承认某些事情已经发生变化',
    note: '告别不否认曾经，只是承认此后的事情不会再一样。',
    color: '#ff9ff3',
    deep: '#000000',
    glyph: 'leaf'
  },
  {
    id: 'speak',
    name: '言说',
    theme: '表达与沟通',
    meaning: '试着表达自己的感受和需要',
    note: '有些话不必说得漂亮，只要是真的。',
    color: '#1dd1a1',
    deep: '#000000',
    glyph: 'wave'
  },
  {
    id: 'boundary',
    name: '边界',
    theme: '责任与关系',
    meaning: '分清自己能够承担的部分',
    note: '愿意帮忙，不等于无限负责。',
    color: '#ff9f43',
    deep: '#000000',
    glyph: 'fence'
  }
]);
