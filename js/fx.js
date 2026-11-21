/* 点击反馈：小小的几何纸屑，不铺满屏幕，也不打断操作。 */
(function () {
  const EP = window.EP;
  const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1', '#ff9f43'];
  const SHAPES = ['square', 'circle', 'tri'];
  let layer = null;
  let lastBurst = 0;

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getLayer() {
    if (layer && document.contains(layer)) return layer;
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  function burst(x, y, count) {
    if (reduceMotion()) return;
    const now = performance.now();
    if (now - lastBurst < 80) return;
    lastBurst = now;

    const root = getLayer();
    const amount = count || 7;
    for (let i = 0; i < amount; i += 1) {
      const bit = document.createElement('i');
      const shape = SHAPES[i % SHAPES.length];
      const angle = (Math.PI * 2 * i) / amount + (Math.random() - 0.5) * 0.7;
      const distance = 18 + Math.random() * 28;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 12 - Math.random() * 10;
      bit.className = 'fx-bit fx-bit--' + shape;
      bit.style.left = x + 'px';
      bit.style.top = y + 'px';
      bit.style.setProperty('--fx-c', COLORS[(i + Math.floor(Math.random() * COLORS.length)) % COLORS.length]);
      bit.style.setProperty('--fx-dx', dx.toFixed(1) + 'px');
      bit.style.setProperty('--fx-dy', dy.toFixed(1) + 'px');
      bit.style.setProperty('--fx-rot', String(Math.round((Math.random() - 0.5) * 240)) + 'deg');
      bit.style.animationDelay = (i * 9) + 'ms';
      root.appendChild(bit);
      setTimeout(function () {
        bit.remove();
      }, 360 + i * 9);
    }
  }

  const TARGETS = [
    '.bubble',
    '.letter-card',
    '.btn',
    '.med-card',
    '.stage__notice',
    '.notice-jump',
    '[data-memory]',
    '.tab',
    '.icon-btn',
    '.nameplate__more',
    '#dialogue-scroll',
    '#given-scroll'
  ].join(',');

  document.addEventListener('click', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target && event.target.closest ? event.target.closest(TARGETS) : null;
    const small = !!target && target.matches('#dialogue-scroll, #given-scroll, .tab, .icon-btn, .nameplate__more');
    let x = event.clientX;
    let y = event.clientY;
    if (!x && !y) {
      const rect = target ? target.getBoundingClientRect() : null;
      x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    }
    burst(x, y, !target || small ? 3 : 7);
  }, true);

  EP.fx = { burst: burst };
})();
