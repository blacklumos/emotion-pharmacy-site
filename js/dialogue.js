/* 对话渲染：一次点击只显示下一句。
 * 每一句都预先渲染在 DOM 里，用 hidden 控制是否可见；推进时只揭开下一句，
 * 因此切换界面回来后仍停在原来的位置，也不会让已经读过的句子重新播动画。
 */
(function () {
  const EP = window.EP;

  function beatHtml(beat, index, previousType, characterName, visible) {
    const type = beat.type || 'narration';
    const showTag = type !== previousType;
    const tag = type === 'narration' ? '旁白' : type === 'owner' ? '你' : characterName;
    const classes = ['beat', 'beat--' + type];
    if (!visible) classes.push('is-hidden');
    return (
      '<p class="' + classes.join(' ') + '" data-beat="' + index + '"' + (visible ? '' : ' hidden') + '>' +
      (showTag ? '<span class="beat-tag beat-tag--' + type + '">' + EP.ui.esc(tag) + '</span>' : '') +
      '<span class="beat-text">' + EP.ui.esc(beat.text) + '</span>' +
      '</p>'
    );
  }

  function html(beats, characterName, shown) {
    const list = beats || [];
    const limit = Number.isFinite(shown) ? shown : list.length;
    let previousType = null;
    return list.map(function (beat, index) {
      const out = beatHtml(beat, index, previousType, characterName || '', index < limit);
      previousType = beat.type || 'narration';
      return out;
    }).join('');
  }

  function scrollToEnd(container) {
    if (!container) return;
    requestAnimationFrame(function () {
      container.scrollTop = container.scrollHeight;
    });
  }

  function reveal(container, index) {
    if (!container) return null;
    const el = container.querySelector('[data-beat="' + index + '"]');
    if (!el) return null;
    el.hidden = false;
    el.classList.remove('is-hidden');
    el.classList.add('is-new');
    setTimeout(function () {
      el.classList.remove('is-new');
    }, 180);
    return el;
  }

  function bindScroll(element, panel) {
    if (!element || !panel) return;
    const update = function () {
      const more = element.scrollHeight - element.clientHeight - element.scrollTop > 8;
      panel.classList.toggle('has-more', more);
    };
    element.addEventListener('scroll', update, { passive: true });
    update();
  }

  EP.dialogue = {
    html: html,
    scrollToEnd: scrollToEnd,
    reveal: reveal,
    bindScroll: bindScroll
  };
})();
