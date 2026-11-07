/* 人物立绘加载器。
 * 立绘是独立图片资源（assets/characters/*.svg），换图只需要改 data/characters.js 的 portrait 字段。
 * 图片缺失或加载失败时，会退回到一张同样风格的颜色占位图，不会让界面破版。
 */
(function () {
  const EP = window.EP;

  function fallbackSvg(ch) {
    const theme = ch.themeColor || '#feca57';
    const second = ch.secondaryColor || '#48dbfb';
    const seal = ch.seal || '';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520">' +
      '<rect width="400" height="520" fill="#fef9ef"/>' +
      '<circle cx="200" cy="238" r="172" fill="' + theme + '" stroke="#000" stroke-width="8"/>' +
      '<path d="M58 520 C58 448 114 384 200 384 C286 384 342 448 342 520 Z" fill="' + second + '" stroke="#000" stroke-width="8"/>' +
      '<path d="M172 316 h56 v68 a28 28 0 0 1 -56 0 Z" fill="#ffd8c2" stroke="#000" stroke-width="8"/>' +
      '<ellipse cx="200" cy="236" rx="82" ry="94" fill="#ffd8c2" stroke="#000" stroke-width="8"/>' +
      '<circle cx="172" cy="246" r="8" fill="#000"/><circle cx="228" cy="246" r="8" fill="#000"/>' +
      '<path d="M182 292 q18 10 36 0" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/>' +
      '<text x="200" y="474" text-anchor="middle" font-size="74" font-weight="900" font-family="sans-serif" fill="#000">' + seal + '</text>' +
      '</svg>'
    );
  }

  function fallback(img) {
    if (!img || img.dataset.fallbackApplied === '1') return;
    const ch = EP.getCharacter(img.dataset.character);
    if (!ch) return;
    img.dataset.fallbackApplied = '1';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fallbackSvg(ch));
  }

  function img(ch, className, options) {
    if (!ch) return '';
    const opts = options || {};
    const cls = ['portrait-img', className || ''].filter(Boolean).join(' ');
    return (
      '<img class="' + cls + '"' +
      ' src="' + EP.ui.esc(ch.portrait || '') + '"' +
      ' alt="' + EP.ui.esc(opts.alt || ch.name + '的立绘') + '"' +
      ' width="400" height="520" decoding="async" draggable="false"' +
      ' data-character="' + EP.ui.esc(ch.id) + '"' +
      ' onerror="EP.portrait.fallback(this)">'
    );
  }

  EP.portrait = {
    img: img,
    fallback: fallback,
    fallbackSvg: fallbackSvg
  };
})();
