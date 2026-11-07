/* 开发调试：连接 CDP，在页面里执行一段表达式并打印结果。
 * 用法：node tools/inspect.js "<url>" "<expression>"
 */
'use strict';

const port = Number(process.env.CDP_PORT || 9333);
const url = process.argv[2];
const expression = process.argv[3] || process.env.INSPECT_EXPR;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function main() {
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const page = list.filter(function (t) { return t.type === 'page'; })[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;
  ws.onmessage = function (event) {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const item = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) item.reject(new Error(msg.error.message));
      else item.resolve(msg.result);
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
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(process.env.INSPECT_W || 1440),
    height: Number(process.env.INSPECT_H || 900),
    deviceScaleFactor: 1,
    mobile: false
  });
  if (url) {
    await send('Page.navigate', { url: url });
    await sleep(1200);
  }
  const res = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) {
    console.error(res.exceptionDetails.exception && res.exceptionDetails.exception.description || res.exceptionDetails.text);
    process.exit(1);
  }
  console.log(JSON.stringify(res.result.value, null, 2));
  ws.close();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
