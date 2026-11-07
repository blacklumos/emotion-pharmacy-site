/* 端到端自检：逐句对话、自由切换配药、信件与存档。
 * 需要先启动 Edge：msedge --headless=new --remote-debugging-port=9333 --user-data-dir=%TEMP%\ep-cdp about:blank
 * 用法：node tools/e2e.js
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
      await sleep(160);
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

  check(await evaluate('document.querySelector("[data-action=begin-next]") !== null'), '初始界面上有「开门营业」');
  await click('[data-action=begin-next]');
  check(await evaluate('document.querySelectorAll(".beat:not([hidden])").length') === 1, '进入店铺时只出现第一句');
  check(await evaluate('document.querySelector(".bubble-layer") === null'), '开场时没有提问气泡');
  await click('.dialogue-scroll');
  check(await evaluate('document.querySelectorAll(".beat:not([hidden])").length') === 2, '点击对话框后出现第二句');
  check(await evaluate('EP.state.dialogueView().shown') === 2, '对话进度写入状态');

  await advanceUntil('.bubble-layer');
  check(await evaluate('document.querySelectorAll(".bubble").length') === 4, '开场读完后出现四个提问气泡');
  const sharpClass = await evaluate('document.querySelector("[data-qid=q_sharp]").className');
  check(sharpClass.indexOf('bubble--4') < 0, '敏感问题不固定在右下角');
  check(await evaluate('document.querySelectorAll(".bubble.is-asked").length') === 0, '未提问时没有已问标记');

  await click('[data-qid=q_fear]');
  check(await evaluate('document.querySelector(".bubble-layer") === null'), '阅读回应时隐藏提问气泡');
  check(await evaluate('document.querySelectorAll(".beat:not([hidden])").length') === 1, '问题回应也逐句出现');
  check(await evaluate('document.querySelector(".panel-caption").textContent.indexOf("你最害怕") >= 0'), '显示所问的问题');

  await advanceUntil('.bubble-layer');
  check(await evaluate('document.querySelectorAll(".bubble.is-asked").length') === 1, '问过的问题被标记');

  /* 自由切换：配药 → 柜台 → 继续聊 */
  await click('.dialogue-actions--done [data-action=go-medicine]');
  check(await evaluate('document.querySelector(".screen.is-active").getAttribute("data-screen")') === 'medicine', '交谈中可以直接进入配药');
  check(await evaluate('document.querySelectorAll(".med-card").length') === 6, '药柜有六种药');
  check(await evaluate('document.querySelector("[data-action=go-customer]") !== null'), '配药界面可以回柜台');
  await click('[data-action=go-customer]');
  check(await evaluate('document.querySelector(".screen.is-active").getAttribute("data-screen")') === 'customer', '可以回到柜台');
  check(await evaluate('EP.state.speakPhase()') === 'talk', '回到柜台后仍可继续聊');
  check(await evaluate('document.querySelectorAll(".bubble").length') === 4, '提问气泡仍在');
  await click('[data-qid=q_meaning]');
  check(await evaluate('document.querySelector(".panel-caption").textContent.indexOf("结果不如预期") >= 0'), '可以继续问新的问题');
  await advanceUntil('.bubble-layer');

  await click('.dialogue-actions--done [data-action=go-medicine]');
  await click('[data-med=believe]');
  check(await evaluate('document.querySelector(".med-card.is-selected") !== null'), '药物可以预选');
  check(await evaluate('EP.state.draftMedicine()') === 'believe', '预选药物写入状态');
  check(await evaluate('document.querySelector("[data-action=confirm]").textContent.indexOf("相信") >= 0'), '确认按钮显示所选药物');

  await click('[data-action=confirm]');
  check(await evaluate('document.querySelector(".dispense-screen--given") !== null'), '交药后显示专属回应');
  check(await evaluate('document.querySelectorAll(".given-panel .beat:not([hidden])").length') === 1, '交药回应逐句出现');
  check(await evaluate('document.querySelector(".given-panel .dialogue-actions--done").hasAttribute("hidden")') === true, '读完回应前不能送客');

  await advanceUntil('.given-panel .dialogue-actions--done:not([hidden])');
  check(await evaluate('document.querySelector(".given-panel .dialogue-actions--done").hasAttribute("hidden")') === false, '回应读完后出现送客按钮');
  await click('[data-action=depart]');
  check(await evaluate('document.querySelectorAll(".given-panel .beat:not([hidden])").length') === 1, '离店旁白逐句出现');
  await advanceUntil('.dispense-screen--given .dialogue-actions--done:not([hidden])');
  await click('[data-action=finish]');

  check(await evaluate('document.querySelector(".idle-screen") !== null'), '回到空店界面');
  check(await evaluate('EP.state.pendingLetters().length') === 1, '信件进入待送达状态');
  check(await evaluate('EP.state.progress().completed') === 1, '完成一次来访');

  await click('[data-action=begin-next]');
  check(await evaluate('EP.state.letterInfo("letter_001").unlocked') === true, '下一位客人到来时信件解锁');
  check(await evaluate('EP.state.get().active.eventId') === 'event_002', '进入第二次来访');
  check(await evaluate('document.querySelector(".toast") !== null'), '出现送达提示');

  await click('[data-nav=archive]');
  check(await evaluate('document.querySelectorAll(".letter-card:not(.letter-card--locked)").length') === 1, '档案中有一封已送达的信');
  check(await evaluate('document.querySelector(".letter-card .portrait-img") !== null'), '信件卡片使用可替换的角色立绘');
  await click('.letter-card[data-letter=letter_001]');
  check(await evaluate('document.querySelector(".letter-sheet") !== null'), '打开信纸');
  check(await evaluate('document.querySelector(".letter-head .portrait-img") !== null'), '信纸使用同一张立绘');
  check(await evaluate('document.querySelector(".letter-echo blockquote") !== null'), '信末显示当时药物回响');
  await click('[data-memory=deferred]');
  check(await evaluate('EP.state.letterInfo("letter_001").memoryState') === 'deferred', '选择暂时忘记后写入存档');
  check(await evaluate('document.querySelector(".letter-memory.is-deferred") !== null'), '界面切换为暂存状态');
  await click('.letter-close-row [data-close]');
  check(await evaluate('document.querySelector(".overlay") === null'), '可以合上信');

  await click('[data-nav=customer]');
  await send('Page.reload');
  await sleep(1200);
  check(await evaluate('EP.state.progress().completed') === 1, '刷新后完成进度保留');
  check(await evaluate('EP.state.letterInfo("letter_001").memoryState') === 'deferred', '刷新后记忆状态保留');
  check(await evaluate('EP.state.get().active.eventId') === 'event_002', '刷新后回到进行中的事件');
  check(await evaluate('EP.state.dialogueView().shown') === 1, '刷新后对话仍停在第一句');

  if (errors.length) {
    console.error('页面控制台错误：');
    errors.forEach(function (e) { console.error('  ' + e); });
    process.exit(1);
  }
  console.log('端到端自检通过。');
  ws.close();
}

main().catch(function (err) {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
