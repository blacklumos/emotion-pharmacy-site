/* 端到端自检 2：敏感提问、道歉、结尾与重新铭记。
 * 需要先启动 Edge（见 tools/e2e.js 顶部说明）。用法：node tools/e2e-reaction.js
 */
'use strict';

const port = Number(process.env.CDP_PORT || 9333);
const url = process.argv[2] || 'file:///D:/myob/emo/emotion-pharmacy/index.html';

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function main() {
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const page = list.filter(function (t) { return t.type === 'page'; })[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;
  const errors = [];

  ws.onmessage = function (event) {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const item = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) item.reject(new Error(msg.error.message));
      else item.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push('LOG: ' + msg.params.entry.text);
    }
  };
  await new Promise(function (resolve) { ws.onopen = resolve; });

  function send(method, params) {
    return new Promise(function (resolve, reject) {
      const id = ++nextId;
      pending.set(id, { resolve: resolve, reject: reject });
      ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error('页面脚本出错：' + (res.exceptionDetails.exception && res.exceptionDetails.exception.description || res.exceptionDetails.text));
    }
    return res.result.value;
  }

  async function click(selector) {
    const ok = await evaluate('(function(){ var el = document.querySelector(' + JSON.stringify(selector) + '); if (!el) return false; el.click(); return true; })()');
    if (!ok) throw new Error('找不到可点击元素：' + selector);
    await sleep(260);
  }

  async function advanceUntil(selector) {
    for (let i = 0; i < 80; i += 1) {
      if (await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      const ok = await evaluate('(function(){ var s = document.querySelector(".screen.is-active"); var el = s && s.querySelector("[data-action=advance]"); if (!el) return false; el.click(); return true; })()');
      if (!ok) throw new Error('对话推进按钮消失：等待 ' + selector);
      await sleep(150);
    }
    throw new Error('对话推进次数过多：等待 ' + selector);
  }

  function check(value, label) {
    if (!value) throw new Error('检查失败：' + label);
    console.log('  ok - ' + label);
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: url });
  await sleep(1200);
  await evaluate('localStorage.clear()');
  await send('Page.reload');
  await sleep(1200);

  await click('[data-action=begin-next]');
  await advanceUntil('.bubble-layer');
  const sharpClass = await evaluate('document.querySelector("[data-qid=q_sharp]").className');
  check(sharpClass.indexOf('bubble--4') < 0, '敏感问题出现在其他位置的气泡');
  await click('[data-qid=q_sharp]');
  check(await evaluate('EP.state.get().active.locked') === true, '敏感提问让交谈暂时关闭');
  check(await evaluate('document.querySelector(".bubble-layer") === null'), '关系变冷后不显示提问');
  check(await evaluate('document.querySelector(".dialogue-actions--done").hasAttribute("hidden")') === true, '回应未读完时不提前出现道歉按钮');
  await advanceUntil('.dialogue-actions--done:not([hidden])');
  check(await evaluate('document.querySelector(".panel-note") !== null'), '显示人物状态提示');
  check(await evaluate('document.querySelector("[data-action=apologise]") !== null'), '出现道歉选项');
  check(await evaluate('document.querySelectorAll(".bubble").length') === 0, '生气后气泡保持隐藏');

  await click('[data-action=apologise]');
  check(await evaluate('EP.state.get().active.locked') === false, '道歉后重新开放交谈');
  check(await evaluate('document.querySelectorAll(".beat:not([hidden])").length') === 1, '道歉回应也逐句出现');
  check(await evaluate('document.querySelector(".beat--owner") !== null'), '道歉台词使用“你”的排版');
  await advanceUntil('.bubble-layer');
  check(await evaluate('document.querySelectorAll(".bubble").length') === 4, '道歉后提问气泡恢复');
  check(await evaluate('document.querySelector(".panel-caption").textContent.indexOf("道了歉") >= 0'), '显示道歉后的场景说明');

  await click('.dialogue-actions--done [data-action=go-medicine]');
  await click('[data-med=rest]');
  await click('[data-action=confirm]');
  await advanceUntil('.given-panel .dialogue-actions--done:not([hidden])');
  await click('[data-action=depart]');
  await advanceUntil('.dispense-screen--given .dialogue-actions--done:not([hidden])');
  await click('[data-action=finish]');
  check(await evaluate('EP.state.progress().completed') === 1, '敏感提问后仍可正常完成来访');

  /* 直接构造一个完整存档，检查结尾与重新铭记 */
  await evaluate('(function(){' +
    'EP.state.previewReset();' +
    'function finishView(){ var g = 0; while (!EP.state.dialogueView().done && g < 500) { EP.state.advanceDialogue(); g += 1; } }' +
    'function finishOpening(){ var g = 0; while (EP.state.speakPhase() === "opening" && g < 500) { EP.state.advanceDialogue(); g += 1; } }' +
    'for (var i = 0; i < 10; i += 1) {' +
    '  EP.state.beginNext(); finishOpening();' +
    '  var ev = EP.state.currentEvent();' +
    '  EP.state.ask(ev.questions[0].id); finishView();' +
    '  EP.state.giveMedicine("believe"); finishView();' +
    '  EP.state.toDeparture(); finishView();' +
    '  EP.state.complete();' +
    '}' +
    'EP.state.setMemory("letter_001", "deferred");' +
    'EP.router.paint();' +
    'EP.ending.show();' +
    '})()');
  await sleep(500);
  check(await evaluate('document.querySelector(".overlay--ending") !== null'), '十次来访后出现结尾');
  check(await evaluate('document.querySelector(".ending-letter") !== null'), '结尾显示最后一封信');
  check(await evaluate('document.querySelector(".ending-letter .portrait-img") !== null'), '结尾使用可替换立绘');
  check(await evaluate('document.querySelectorAll(".chip--letter").length') === 1, '结尾列出暂存的信');

  await click('.ending-letter');
  await sleep(500);
  check(await evaluate('document.querySelector(".letter-sheet") !== null'), '可以打开最后一封信');
  check(await evaluate('document.querySelector(".letter-title").textContent') === '橘子很甜', '最后一封信标题正确');
  await click('[data-memory=remembered]');
  check(await evaluate('EP.state.letterInfo("letter_010").memoryState') === 'remembered', '最后一封信可以铭记');
  await click('.letter-close-row [data-close]');

  await evaluate('EP.archive.openLetter("letter_001")');
  await sleep(400);
  check(await evaluate('document.querySelector(".letter-memory.is-deferred") !== null'), '暂存的信显示重新铭记入口');
  await click('[data-memory=remembered]');
  check(await evaluate('document.querySelector(".letter-closing") !== null'), '重新铭记时出现结尾短句');
  check(await evaluate('document.querySelector(".letter-closing").textContent.indexOf("现在想起来了") >= 0'), '短句内容正确');
  check(await evaluate('EP.state.get().flags.closingShown') === true, '结尾短句只出现一次');
  await click('.letter-close-row [data-close]');
  await evaluate('EP.state.setMemory("letter_001", "deferred")');
  await evaluate('EP.archive.openLetter("letter_001")');
  await sleep(300);
  await click('[data-memory=remembered]');
  check(await evaluate('document.querySelector(".letter-closing") === null'), '第二次重新铭记不再重复短句');
  await click('.letter-close-row [data-close]');

  if (errors.length) {
    console.error('页面控制台错误：');
    errors.forEach(function (e) { console.error('  ' + e); });
    process.exit(1);
  }
  console.log('反应与结尾自检通过。');
  ws.close();
}

main().catch(function (err) {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
