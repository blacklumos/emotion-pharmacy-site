/* 开发用截图脚本：通过 CDP 控制无头 Edge，可指定真实移动端视口。
 * 用法：
 *   node tools/shoot.js "<url>" "<out.png>" [width] [height] [mobile(0/1)] [evalScript]
 * 需要先启动 Edge：
 *   msedge --headless=new --remote-debugging-port=9333 --user-data-dir=%TEMP%\ep-cdp about:blank
 */
'use strict';

const fs = require('fs');

const url = process.argv[2];
const out = process.argv[3];
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);
const mobile = (process.argv[6] || '0') === '1';
const evalScript = process.argv[7] || '';
const port = Number(process.env.CDP_PORT || 9333);

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function main() {
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const page = list.filter(function (t) { return t.type === 'page'; })[0];
  if (!page) throw new Error('没有可用的 page target');

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
      const detail = msg.params.exceptionDetails;
      errors.push('EXCEPTION: ' + (detail.exception && detail.exception.description || detail.text));
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: mobile,
    screenWidth: width,
    screenHeight: height
  });
  if (mobile) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  await send('Page.navigate', { url: url });
  await sleep(1500);

  if (evalScript) {
    await send('Runtime.evaluate', { expression: evalScript, awaitPromise: true });
    await sleep(600);
  }

  const metrics = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({w:window.innerWidth,h:window.innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})',
    returnByValue: true
  });
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('SHOT ' + out + ' ' + metrics.result.value);
  if (errors.length) {
    console.log('ERRORS:');
    errors.forEach(function (e) { console.log('  ' + e); });
  } else {
    console.log('ERRORS: none');
  }
  ws.close();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
