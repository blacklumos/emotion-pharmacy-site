/* 流程模拟：不开浏览器，直接跑一遍十次来访、信件解锁、记忆状态与存档恢复。
 * 用法：node tools/simulate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const store = {};
const sandbox = { console: console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.localStorage = {
  getItem: function (key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem: function (key, value) {
    store[key] = String(value);
  },
  removeItem: function (key) {
    delete store[key];
  }
};
vm.createContext(sandbox);

function run(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

['js/registry.js', 'data/medicines.js', 'data/characters.js', 'data/queue.js'].forEach(run);
fs.readdirSync(path.join(root, 'data/events')).filter(function (f) { return f.endsWith('.js'); }).sort().forEach(function (f) {
  run(path.join('data/events', f));
});
fs.readdirSync(path.join(root, 'data/letters')).filter(function (f) { return f.endsWith('.js'); }).sort().forEach(function (f) {
  run(path.join('data/letters', f));
});
['js/storage.js', 'js/state.js'].forEach(run);

const EP = sandbox.EP;
let checks = 0;
function check(value, label) {
  checks += 1;
  if (!value) {
    console.error('FAIL: ' + label);
    process.exit(1);
  }
}
function eq(actual, expected, label) {
  checks += 1;
  if (actual !== expected) {
    console.error('FAIL: ' + label + ' (期望 ' + expected + '，实际 ' + actual + ')');
    process.exit(1);
  }
}

EP.state.init();
const queue = EP.eventQueue();
const medIds = EP.medicines().map(function (m) { return m.id; });
eq(queue.length, 10, '事件队列长度');
eq(EP.state.progress().total, 10, '总来访数');

function finishDialogue() {
  let guard = 0;
  while (!EP.state.dialogueView().done && guard < 500) {
    EP.state.advanceDialogue();
    guard += 1;
  }
  if (guard >= 500) {
    console.error('FAIL: 对话推进超过上限');
    process.exit(1);
  }
}

function finishOpening() {
  let guard = 0;
  while (EP.state.speakPhase() === 'opening' && guard < 500) {
    EP.state.advanceDialogue();
    guard += 1;
  }
}

const chosen = [];
for (let i = 0; i < queue.length; i += 1) {
  const begin = EP.state.beginNext();
  check(begin, '开始第 ' + (i + 1) + ' 次来访');
  eq(begin.eventId, queue[i], '事件顺序');
  if (i > 0) {
    const prevLetter = EP.getEvent(queue[i - 1]).letterId;
    eq(begin.delivered.length, 1, '第 ' + i + ' 次来访时送达一封信');
    eq(begin.delivered[0], prevLetter, '送达的信件编号');
  }

  /* 开场逐句推进，最后一句之后进入可提问状态 */
  const opening = EP.state.dialogueView();
  check(opening.total > 1, '开场包含多句台词');
  eq(opening.shown, 1, '开场只显示第一句');
  check(!opening.done, '开场尚未结束');
  finishOpening();
  check(EP.state.speakPhase() === 'talk', '开场结束后进入交谈');
  check(EP.state.canAsk(), '可以提问');

  /* 配药与交谈并行：中途去配药，再回来 */
  if (i === 0) {
    check(EP.state.go('medicine'), '交谈中可以直接进入配药');
    eq(EP.state.screen(), 'medicine', '配药界面已打开');
    check(EP.state.selectMedicine('courage'), '可以预先选药');
    eq(EP.state.draftMedicine(), 'courage', '预选的药保存下来');
    check(EP.state.go('customer'), '可以回到柜台');
    eq(EP.state.speakPhase(), 'talk', '回来后仍在交谈阶段');
    eq(EP.state.draftMedicine(), 'courage', '回来后预选药还在');
  }

  const ev = EP.state.currentEvent();
  const active = EP.state.get().active;
  for (const q of ev.questions) {
    if (active.locked) break;
    check(EP.state.ask(q.id), '提问 ' + q.id);
    finishDialogue();
  }

  if (active.locked) {
    const reactionQ = ev.questions.filter(function (q) { return q.id === active.reactionQuestion; })[0];
    check(reactionQ, '锁定问题存在');
    if (reactionQ.reaction === 'anger') {
      check(EP.state.apologise(), '道歉后重新开放提问');
      finishDialogue();
      for (const q of ev.questions) {
        if (active.asked.indexOf(q.id) < 0) {
          check(EP.state.ask(q.id), '道歉后继续提问 ' + q.id);
          finishDialogue();
        }
      }
    }
  }

  const medId = medIds[i % medIds.length];
  chosen.push(medId);
  check(EP.state.giveMedicine(medId), '交药 ' + medId);
  eq(EP.state.get().active.phase, 'handover', '进入交药回应');
  check(!EP.state.toDeparture(), '回应未读完时不能送客');
  finishDialogue();
  check(EP.state.toDeparture(), '回应读完后进入离店');
  finishDialogue();
  const done = EP.state.complete();
  check(done, '完成事件 ' + ev.id);
  eq(done.finished, i === queue.length - 1, '最后事件标记 finished');
  eq(EP.state.progress().completed, i + 1, '已完成来访数');
}

const progress = EP.state.progress();
eq(progress.completed, 10, '十次来访全部完成');
eq(progress.received, 10, '十封信全部送达');
eq(EP.state.get().flags.finished, true, '游戏结束标记');
check(EP.state.isFinished(), 'isFinished');
eq(EP.state.get().screen, 'customer', '结束后回到柜台');

for (let i = 0; i < queue.length; i += 1) {
  const ev = EP.getEvent(queue[i]);
  eq(EP.state.get().completed[ev.id].medicine, chosen[i], ev.id + ' 记录的选择');
  check(EP.state.letterInfo(ev.letterId).unlocked, ev.letterId + ' 已解锁');
}

/* 信件随所配药物变化：同一封信，六种药有六种写法 */
const sampleCourage = EP.letterFor('letter_001', 'courage');
const sampleRest = EP.letterFor('letter_001', 'rest');
check(sampleCourage && sampleRest, '可以按药物取出信件写法');
check(sampleCourage.title !== sampleRest.title, '不同药物的信件标题不同');
check(sampleCourage.lines.join('') !== sampleRest.lines.join(''), '不同药物的信件正文不同');
medIds.forEach(function (medId) {
  const view = EP.letterFor('letter_001', medId);
  check(view && view.lines.length > 0, '药物 ' + medId + ' 有对应的信件正文');
  eq(view.medicineId, medId, '信件写法回传药物 ID');
});
eq(EP.state.letterView('letter_001').medicineId, chosen[0], '档案按存档中的药物取信');
eq(EP.state.letterView('letter_001').title, EP.letterFor('letter_001', chosen[0]).title, '档案标题与药物一致');
eq(EP.state.letterView('letter_001').title, sampleCourage.title, '第一次来访配勇气时取到《' + sampleCourage.title + '》');
eq(EP.state.letterView('letter_004').title, EP.letterFor('letter_004', chosen[3]).title, '第四封按存档里的药物取信');
check(
  EP.letterFor('letter_001', 'courage').title !== EP.letterFor('letter_004', 'courage').title,
  '同一味药在不同来信里的写法也不同'
);

/* 记忆状态与 Callback */
eq(EP.state.setMemory('letter_001', 'deferred').closing, false, '未完成时暂存不触发结尾句');
eq(EP.state.setMemory('letter_001', 'remembered').closing, true, '暂存后重新铭记触发结尾句');
eq(EP.state.setMemory('letter_001', 'deferred').closing, false, '再次暂存不重复触发');
eq(EP.state.setMemory('letter_001', 'remembered').closing, false, '结尾句只出现一次');
eq(EP.state.setMemory('letter_010', 'remembered').ok, true, '最后一封信可以铭记');
eq(EP.state.get().letters.letter_001.memoryState, 'remembered', '记忆状态写入存档');
eq(EP.state.setMemory('letter_001', 'bogus').ok, false, '拒绝非法的记忆状态');

const deferred = EP.state.setMemory('letter_002', 'deferred');
check(deferred.ok, '第二封信暂存');
eq(EP.state.get().letters.letter_002.memoryState, 'deferred', '暂存状态独立记录');
eq(EP.state.progress().deferred, 1, '暂存计数');
eq(EP.state.progress().remembered, 2, '铭记计数');

/* 存档恢复 */
EP.state.init();
eq(EP.state.progress().completed, 10, '刷新后进度保留');
eq(EP.state.progress().received, 10, '刷新后信件保留');
eq(EP.state.get().letters.letter_001.memoryState, 'remembered', '刷新后记忆状态保留');
eq(EP.state.get().flags.finished, true, '刷新后结束标记保留');

/* 进行中的存档恢复：交药回应读到一半时刷新 */
EP.state.restart();
EP.state.beginNext();
finishOpening();
EP.state.ask('q_fear');
finishDialogue();
EP.state.selectMedicine('believe');
EP.state.giveMedicine('believe');
EP.state.advanceDialogue();
EP.state.init();
eq(EP.state.get().active.eventId, 'event_001', '刷新后回到进行中的事件');
eq(EP.state.get().active.phase, 'handover', '刷新后回到交药回应');
eq(EP.state.get().active.asked.length, 1, '刷新后保留已问问题');
eq(EP.state.get().active.medicine, 'believe', '刷新后保留已交的药');
eq(EP.state.screen(), 'medicine', '刷新后回到配药界面');
check(EP.state.dialogueView().shown >= 2, '刷新后保留回应进度');
check(!EP.state.dialogueView().done, '刷新后回应尚未读完');

/* 重开 */
EP.state.restart();
eq(EP.state.progress().completed, 0, '重开后进度归零');
eq(EP.state.progress().received, 0, '重开后信件归零');
eq(EP.state.get().pending.length, 0, '重开后没有待送达信件');
eq(EP.state.get().active, null, '重开后没有进行中的事件');
check(EP.state.beginNext().eventId === 'event_001', '重开后从第一位客人开始');

console.log('流程模拟通过：' + checks + ' 项检查。');
