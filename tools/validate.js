/* 数据校验：检查 ID、引用、药物回应、信件与剧本覆盖情况。
 * 用法：node tools/validate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}
function warn(message) {
  warnings.push(message);
}

function loadSandbox() {
  const sandbox = { console: console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const files = ['js/registry.js', 'data/medicines.js', 'data/characters.js', 'data/queue.js'];
  const eventDir = path.join(root, 'data/events');
  const letterDir = path.join(root, 'data/letters');
  fs.readdirSync(eventDir).filter(function (f) { return f.endsWith('.js'); }).sort().forEach(function (f) {
    files.push(path.join('data/events', f));
  });
  fs.readdirSync(letterDir).filter(function (f) { return f.endsWith('.js'); }).sort().forEach(function (f) {
    files.push(path.join('data/letters', f));
  });

  files.forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
  });
  return sandbox.EP;
}

const EP = loadSandbox();
const reg = EP.registry;
const queue = EP.eventQueue();
const meds = EP.medicines();
const medIds = meds.map(function (m) { return m.id; });
const charIds = Object.keys(reg.characters);
const eventIds = Object.keys(reg.events);
const letterIds = Object.keys(reg.letters);

if (!meds.length) error('没有注册任何药物');
if (meds.length !== 6) warn('药物数量为 ' + meds.length + '，第一版设计为 6 种');
if (!charIds.length) error('没有注册任何角色');
if (!queue.length) error('事件队列为空');

if (new Set(medIds).size !== medIds.length) error('存在重复的药物 ID');
if (new Set(charIds).size !== charIds.length) error('存在重复的角色 ID');

if (queue.length !== 10) warn('事件队列长度为 ' + queue.length + '，第一版设计为 10 次来访');
if (new Set(queue).size !== queue.length) error('事件队列存在重复项');

queue.forEach(function (id, index) {
  if (!reg.events[id]) {
    error('事件队列引用了不存在的事件：' + id);
    return;
  }
  if (reg.events[id].order !== index + 1) {
    warn(id + ' 的 order 与队列位置不一致（' + reg.events[id].order + ' / ' + (index + 1) + '）');
  }
});

eventIds.forEach(function (id) {
  if (queue.indexOf(id) < 0) warn('事件 ' + id + ' 没有出现在事件队列中');
});

charIds.forEach(function (id) {
  const ch = reg.characters[id];
  ['name', 'age', 'occupation', 'themeColor', 'secondaryColor', 'paperColor', 'pattern', 'seal', 'portrait', 'description'].forEach(function (key) {
    if (ch[key] === undefined || ch[key] === '') error('角色 ' + id + ' 缺少字段 ' + key);
  });
  if (ch.portrait && !fs.existsSync(path.join(root, ch.portrait))) {
    warn('角色 ' + id + ' 的立绘文件不存在：' + ch.portrait + '（会使用占位图）');
  }
  if (ch.pattern && ['dots', 'zigzag', 'waves', 'grid', 'checker', 'stripes'].indexOf(ch.pattern) < 0) {
    warn('角色 ' + id + ' 的 pattern 无法识别：' + ch.pattern);
  }
  if (!Array.isArray(ch.eventIds) || !ch.eventIds.length) {
    error('角色 ' + id + ' 没有 eventIds');
    return;
  }
  ch.eventIds.forEach(function (eventId) {
    if (!reg.events[eventId]) error('角色 ' + id + ' 引用了不存在的事件 ' + eventId);
  });
});

function checkBeats(beats, where) {
  if (!Array.isArray(beats) || !beats.length) {
    error(where + ' 没有台词');
    return;
  }
  beats.forEach(function (beat, index) {
    if (!beat || !beat.text || !String(beat.text).trim()) {
      error(where + ' 第 ' + (index + 1) + ' 条台词为空');
    }
    if (['narration', 'customer', 'owner'].indexOf(beat.type) < 0) {
      error(where + ' 第 ' + (index + 1) + ' 条台词的 type 无法识别：' + beat.type);
    }
  });
}

Object.keys(reg.events).forEach(function (id) {
  const ev = reg.events[id];
  const where = '事件 ' + id;
  if (!reg.characters[ev.characterId]) error(where + ' 的角色不存在：' + ev.characterId);
  else if (reg.characters[ev.characterId].eventIds.indexOf(id) < 0) {
    error(where + ' 没有被角色 ' + ev.characterId + ' 的 eventIds 引用');
  }
  if (!ev.title) error(where + ' 缺少 title');
  if (!ev.visitLabel) warn(where + ' 缺少 visitLabel');
  if (!ev.letterId) error(where + ' 缺少 letterId');
  if (!ev.talkPrompt) warn(where + ' 缺少 talkPrompt');

  checkBeats(ev.opening, where + ' 的进店剧情');
  checkBeats(ev.handover, where + ' 的交付旁白');
  checkBeats(ev.departure, where + ' 的离店剧情');

  if (ev.questions.length < 3) error(where + ' 的问题少于 3 个');
  const qids = {};
  let negative = 0;
  ev.questions.forEach(function (q) {
    if (qids[q.id]) error(where + ' 存在重复问题 ID：' + q.id);
    qids[q.id] = true;
    if (!q.text) error(where + ' 的问题 ' + q.id + ' 缺少文本');
    checkBeats(q.beats, where + ' 的问题 ' + q.id + ' 回应');
    if (['anger', 'silence', 'evade', 'uneasy', 'defensive'].indexOf(q.reaction) >= 0) negative += 1;
    if (q.reaction === 'anger' && (!q.recovery || !q.recovery.length)) {
      warn(where + ' 的问题 ' + q.id + ' 会让人生气，但没有道歉后的回应');
    }
    if (q.reaction === 'anger' && (!q.lockNote || !q.lockNote.trim())) {
      warn(where + ' 的问题 ' + q.id + ' 缺少关系变冷时的界面提示');
    }
  });
  if (!negative) error(where + ' 没有任何负面或复杂反应');
  if (!ev.questions.some(function (q) { return q.kind === 'sharp'; })) {
    warn(where + ' 没有标记为 sharp 的敏感问题');
  }

  medIds.forEach(function (medId) {
    const response = ev.medicineResponses[medId];
    if (!response) {
      warn(where + ' 缺少药物「' + medId + '」的回应');
      return;
    }
    checkBeats(response.beats, where + ' 的药物回应 ' + medId);
  });
  Object.keys(ev.medicineResponses).forEach(function (medId) {
    if (medIds.indexOf(medId) < 0) error(where + ' 使用了无法识别的药物 ID：' + medId);
  });

  const letter = reg.letters[ev.letterId];
  if (!letter) {
    error(where + ' 引用的信件不存在：' + ev.letterId);
    return;
  }
  if (letter.eventId !== ev.id) error(where + ' 的信件 ' + letter.id + ' 指向的事件不一致');
  if (letter.characterId !== ev.characterId) error(where + ' 的信件 ' + letter.id + ' 角色不一致');
});

Object.keys(reg.letters).forEach(function (id) {
  const letter = reg.letters[id];
  const where = '信件 ' + id;
  if (!reg.events[letter.eventId]) error(where + ' 指向不存在的事件 ' + letter.eventId);
  if (!reg.characters[letter.characterId]) error(where + ' 指向不存在的角色 ' + letter.characterId);
  if (!letter.salutation) warn(where + ' 缺少称呼');
  if (!letter.signature) error(where + ' 缺少署名');

  const variantIds = Object.keys(letter.variants || {});
  if (!variantIds.length) error(where + ' 没有按药物区分的写法（variants）');
  medIds.forEach(function (medId) {
    const variant = letter.variants[medId];
    if (!variant) {
      warn(where + ' 缺少药物「' + medId + '」的写法');
      return;
    }
    if (!variant.title) error(where + ' 的「' + medId + '」写法缺少标题');
    if (!Array.isArray(variant.lines) || !variant.lines.some(function (line) { return line.trim(); })) {
      error(where + ' 的「' + medId + '」写法没有正文');
    }
    if (!variant.echoPrefix) warn(where + ' 的「' + medId + '」写法缺少药物回响引导语');
  });
  variantIds.forEach(function (medId) {
    if (medIds.indexOf(medId) < 0) error(where + ' 使用了无法识别的药物 ID：' + medId);
  });

  if (letter.callback) {
    if (!reg.letters[letter.callback.dependsOn]) error(where + ' 的 callback 依赖不存在的信件');
    else if (!reg.letters[letter.callback.linkLetterId]) error(where + ' 的 callback 链接信件不存在');
  }
});

/* 同一封信的多种写法不要共用标题或正文；结尾语也不要在全篇里重复，否则又回到同一个模板。 */
const echoSeen = {};
Object.keys(reg.letters).forEach(function (id) {
  const titles = {};
  const bodies = {};
  const variants = reg.letters[id].variants || {};
  Object.keys(variants).forEach(function (medId) {
    const variant = variants[medId];
    if (variant.title) {
      if (titles[variant.title]) warn('信件 ' + id + ' 的多种写法用了同一个标题：' + variant.title);
      titles[variant.title] = true;
    }
    const body = (variant.lines || []).join('\n');
    if (bodies[body]) warn('信件 ' + id + ' 的「' + medId + '」与「' + bodies[body] + '」写法正文完全相同');
    else bodies[body] = medId;
    if (!variant.echoPrefix) return;
    if (echoSeen[variant.echoPrefix]) {
      warn('信件 ' + id + ' 与 ' + echoSeen[variant.echoPrefix] + ' 的结尾语完全相同');
    } else {
      echoSeen[variant.echoPrefix] = id;
    }
  });
});

const expectedNumbers = EP.letterQueue().length;
if (letterIds.length !== expectedNumbers) warn('信件数量（' + letterIds.length + '）与事件队列（' + expectedNumbers + '）不一致');
EP.letterQueue().forEach(function (id, index) {
  if (reg.letters[id] && reg.letters[id].number !== index + 1) {
    warn(id + ' 的 number 与信件顺序不一致（' + reg.letters[id].number + ' / ' + (index + 1) + '）');
  }
});

/* ---------- 剧本覆盖：检查每句被引号包住的台词是否进入数据 ---------- */

function normalize(text) {
  return String(text).replace(/[\s，。！？、；：…—「」‘’“”·,.!?;:"'（）()]/g, '');
}

function checkCoverage() {
  const scriptPath = path.join(root, '..', '剧本.md');
  if (!fs.existsSync(scriptPath)) {
    warn('未找到 剧本.md，跳过剧本覆盖检查');
    return;
  }
  const script = fs.readFileSync(scriptPath, 'utf8');
  const marker = /\*\*事件 ID：(event_\d+)\*\*/g;
  const marks = [];
  let match;
  while ((match = marker.exec(script))) {
    marks.push({ id: match[1], index: match.index });
  }
  if (!marks.length) {
    warn('剧本中未解析到事件标记');
    return;
  }

  marks.forEach(function (mark, i) {
    const nextMark = i + 1 < marks.length ? marks[i + 1].index : script.length;
    const nextHeading = script.indexOf('\n# ', mark.index + 1);
    const end = Math.min(nextMark, nextHeading >= 0 ? nextHeading : script.length);
    const section = script.slice(mark.index, end);
    const ev = reg.events[mark.id];
    if (!ev) {
      warn('剧本中的 ' + mark.id + ' 没有对应数据');
      return;
    }
    const haystackParts = [];
    function pushBeats(beats) {
      (beats || []).forEach(function (b) { haystackParts.push(b.text); });
    }
    pushBeats(ev.opening);
    pushBeats(ev.handover);
    pushBeats(ev.departure);
    ev.questions.forEach(function (q) {
      haystackParts.push(q.text);
      pushBeats(q.beats);
      pushBeats(q.recovery);
    });
    Object.keys(ev.medicineResponses).forEach(function (key) {
      pushBeats(ev.medicineResponses[key].beats);
    });
    const haystack = normalize(haystackParts.join(''));

    const lines = section.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(function (line) {
      return line.indexOf('「') === 0 && line.lastIndexOf('」') === line.length - 1;
    });
    let missing = 0;
    lines.forEach(function (line) {
      const body = normalize(line);
      if (body.length < 2) return;
      if (haystack.indexOf(body) < 0) {
        missing += 1;
        warn(mark.id + ' 可能漏掉了剧本台词：' + line.slice(0, 42));
      }
    });
    if (lines.length) {
      console.log('  覆盖 ' + mark.id + '：' + (lines.length - missing) + ' / ' + lines.length + ' 句');
    }
  });
}

console.log('角色：' + charIds.length + ' 位，事件：' + eventIds.length + ' 次，信件：' + letterIds.length + ' 封，药物：' + medIds.length + ' 种');
console.log('覆盖检查：');
checkCoverage();

if (warnings.length) {
  console.log('\n提示（' + warnings.length + '）：');
  warnings.forEach(function (w) { console.log('  · ' + w); });
}
if (errors.length) {
  console.log('\n错误（' + errors.length + '）：');
  errors.forEach(function (e) { console.log('  × ' + e); });
  process.exit(1);
}
console.log('\n数据校验通过。');
