/* 配药界面：药瓶、药柜与顾客的专属回应。
 * 配药与交谈并行：选药不会结束对话，只有“交药”才会。
 */
(function () {
  const EP = window.EP;

  const GLYPHS = {
    step: '<path d="M6 28 h10 v-8 h10 v-8 h10" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="8" r="3" fill="currentColor"/>',
    seed: '<path d="M22 32 V18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M22 19 C14 19 9 13 9 6 C17 6 22 11 22 19 Z" fill="currentColor"/><path d="M22 24 C30 24 35 18 35 11 C27 11 22 16 22 24 Z" fill="currentColor"/><path d="M10 36 H34" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    moon: '<path d="M27 6 A15 15 0 1 0 34 32 A13 13 0 0 1 27 6 Z" fill="currentColor"/>',
    leaf: '<path d="M8 33 C8 17 17 8 34 7 C35 24 26 33 8 33 Z" fill="currentColor"/><path d="M8 33 C15 26 22 19 30 12" stroke="#fef9ef" stroke-width="2.4" fill="none"/>',
    wave: '<path d="M5 27 C10 20 15 20 20 27 C25 34 30 34 35 27" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M5 15 C10 8 15 8 20 15 C25 22 30 22 35 15" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    fence: '<path d="M10 35 V12 M22 35 V7 M34 35 V12" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/><path d="M6 21 H39 M6 29 H39" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
  };

  function glyphSvg(id) {
    return '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">' + (GLYPHS[id] || GLYPHS.seed) + '</svg>';
  }

  const BODY = 'M62 48 h16 v10 c0 7 26 14 26 44 v68 c0 12 -9 18 -21 18 h-26 c-12 0 -21 -6 -21 -18 v-68 c0 -30 26 -37 26 -44 z';

  function bottleSvg(medicine, options) {
    const opts = options || {};
    const filled = !!medicine;
    const color = medicine ? medicine.color : '#fef9ef';
    const name = medicine ? medicine.name : '？';
    const theme = medicine ? medicine.theme : '待配';
    const clipId = 'bottle-clip-' + (medicine ? medicine.id : 'empty') + '-' + (opts.uid || 'a');
    return (
      '<svg viewBox="0 0 140 210" class="bottle-svg" role="img" aria-label="' + (medicine ? name + '药瓶' : '空药瓶') + '">' +
      '<defs><clipPath id="' + clipId + '"><path d="' + BODY + '"/></clipPath></defs>' +
      '<ellipse cx="76" cy="202" rx="40" ry="8" fill="#000"/>' +
      '<g transform="translate(6 4)"><path d="' + BODY + '" fill="#000"/><rect x="56" y="10" width="32" height="38" rx="4" fill="#000"/></g>' +
      '<rect x="56" y="10" width="32" height="26" rx="3" fill="#feca57" stroke="#000" stroke-width="6"/>' +
      '<path d="' + BODY + '" fill="#fef9ef" stroke="#000" stroke-width="6"/>' +
      '<g clip-path="url(#' + clipId + ')">' +
      '<g class="bottle-liquid" style="transform-origin:70px 188px;transform:scaleY(' + (filled ? 1 : 0) + ')">' +
      '<rect x="16" y="84" width="108" height="124" fill="' + color + '"/>' +
      '<rect x="16" y="84" width="108" height="6" fill="#000"/>' +
      '</g></g>' +
      '<rect x="34" y="116" width="72" height="60" fill="#fef9ef" stroke="#000" stroke-width="5"/>' +
      '<text x="70" y="143" text-anchor="middle" font-size="18" font-weight="900" fill="#000" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + EP.ui.esc(name) + '</text>' +
      '<path d="M45 152 H95" stroke="#000" stroke-width="3"/>' +
      '<text x="70" y="166" text-anchor="middle" font-size="9" font-weight="700" fill="#000" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + EP.ui.esc(theme) + '</text>' +
      '<circle cx="48" cy="76" r="5" fill="#000"/><circle cx="92" cy="90" r="3" fill="#000"/>' +
      (filled ? '<circle cx="86" cy="190" r="4" fill="#000"/><circle cx="66" cy="196" r="3" fill="#000"/>' : '') +
      '</svg>'
    );
  }

  function reset() {
    /* 选择保存在 state.active.draft 里。 */
  }

  function medCard(m, draft) {
    const selected = draft === m.id;
    return (
      '<button type="button" class="med-card' + (selected ? ' is-selected' : '') + '"' +
      ' data-med="' + m.id + '" style="--c:' + m.color + '" aria-pressed="' + selected + '">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<span class="med-card__band" aria-hidden="true"></span>' +
      '<span class="med-card__glyph">' + glyphSvg(m.glyph) + '</span>' +
      '<span class="med-card__name">' + EP.ui.esc(m.name) + '</span>' +
      '<span class="med-card__theme">' + EP.ui.esc(m.theme) + '</span>' +
      '<span class="med-card__meaning">' + EP.ui.esc(m.meaning) + '</span>' +
      (selected ? '<span class="med-card__flag">已选</span>' : '') +
      '</button>'
    );
  }

  function shelfView(ev, ch, active) {
    const draftId = active.draft;
    const medicine = draftId ? EP.getMedicine(draftId) : null;
    const detail = medicine
      ? '<p class="med-detail__meaning">' + EP.ui.esc(medicine.meaning) + '</p><p class="med-detail__note">' + EP.ui.esc(medicine.note) + '</p>'
      : '<p class="med-detail__meaning">从药柜里选一味药，放进瓶子。</p><p class="med-detail__note">没有哪一种药是标准答案。客人怎么理解它，由客人决定。</p>';

    return (
      '<div class="dispense-screen" style="--theme:' + ch.themeColor + ';--second:' + ch.secondaryColor + '">' +
      '<header class="dispense-head">' +
      '<div><p class="kicker">配药</p><h2>' + EP.ui.esc(ch.name) + '的瓶子</h2></div>' +
      '<p class="dispense-hint">' + EP.ui.esc(ev.visitLabel) + ' · ' + EP.ui.esc(ev.title) + '</p>' +
      '</header>' +
      '<div class="dispense-layout">' +
      '<section class="bottle-stand">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<span class="geo geo--stripes" aria-hidden="true"></span>' +
      '<div class="bottle-stand__bottle">' + bottleSvg(medicine, { uid: 'main' }) + '</div>' +
      '<div class="med-detail">' + detail + '</div>' +
      '<p class="dispense-note">交药之后，这次来访就会结束。现在还可以回柜台继续聊。</p>' +
      '<button type="button" class="btn btn--primary btn--block" data-action="confirm"' + (medicine ? '' : ' disabled') + '>' +
      (medicine ? '把「' + EP.ui.esc(medicine.name) + '」交给' + EP.ui.esc(ch.name) : '先选一味药') +
      '</button>' +
      '<button type="button" class="btn btn--ghost btn--block" data-action="go-customer">回到柜台继续聊</button>' +
      '</section>' +
      '<div class="shelf-side">' +
      '<div class="shelf" role="group" aria-label="药柜">' +
      EP.medicines().map(function (m) { return medCard(m, draftId); }).join('') +
      '</div>' +
      '<p class="shelf-note"><span class="shelf-note__label">药柜手记</span>没有哪一种药能替人把路走完。它只是让人有力气，再走一段。</p>' +
      '</div>' +
      '</div></div>'
    );
  }

  function givenView(ev, ch, active) {
    const medicine = EP.getMedicine(active.medicine);
    const isDeparture = active.phase === 'departure';
    const view = EP.state.dialogueView();
    const beats = EP.dialogue.html(view.beats, ch.name, view.shown);
    const nextLabel = isDeparture ? '今日到此为止' : '送客';

    return (
      '<div class="dispense-screen dispense-screen--given" style="--theme:' + ch.themeColor + ';--second:' + ch.secondaryColor + '">' +
      '<header class="dispense-head">' +
      '<div><p class="kicker">' + (isDeparture ? '离店' : '药已交出') + '</p><h2>' + EP.ui.esc(ev.title) + '</h2></div>' +
      '<p class="dispense-hint">' + EP.ui.esc(ch.name) + ' · ' + EP.ui.esc(medicine ? medicine.name : '') + '</p>' +
      '</header>' +
      '<div class="given-layout">' +
      '<aside class="given-aside">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<div class="given-bottle">' + bottleSvg(medicine, { uid: 'given' }) + '</div>' +
      '<figure class="given-char">' + EP.portrait.img(ch, 'portrait-img portrait-img--given') + '<figcaption>' + EP.ui.esc(ch.name) + '</figcaption></figure>' +
      '</aside>' +
      '<section class="given-panel" aria-live="polite">' +
      '<p class="dialogue-hint"' + (view.done ? ' hidden' : '') + '>点击对话继续 · 每次只出现一句</p>' +
      '<div class="dialogue-scroll-wrap">' +
      '<div class="dialogue-scroll dialogue-scroll--given" id="given-scroll" tabindex="0" role="region" aria-label="客人的回应，按回车继续">' +
      beats +
      '</div>' +
      '<div class="scroll-more" aria-hidden="true">↓ 还有</div>' +
      '</div>' +
      '<div class="dialogue-actions dialogue-actions--continue"' + (view.done ? ' hidden' : '') + '>' +
      '<button type="button" class="btn btn--primary" data-action="advance">继续 ▸</button>' +
      '</div>' +
      '<div class="dialogue-actions dialogue-actions--done"' + (view.done ? '' : ' hidden') + '>' +
      '<button type="button" class="btn btn--primary" data-action="' + (isDeparture ? 'finish' : 'depart') + '">' +
      EP.ui.esc(nextLabel) + ' ▸</button>' +
      '</div>' +
      '</section>' +
      '</div></div>'
    );
  }

  function emptyView() {
    const progress = EP.state.progress();
    return (
      '<div class="dispense-screen dispense-screen--empty">' +
      '<section class="empty-card">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<div class="empty-bottle">' + bottleSvg(null, { uid: 'empty' }) + '</div>' +
      '<p class="kicker">药柜</p>' +
      '<h2>现在没有需要配药的客人。</h2>' +
      '<p class="idle-text">先回柜台看看谁在等你。选药和聊天可以随时来回切换。</p>' +
      '<div class="idle-actions">' +
      '<button type="button" class="btn btn--primary" data-action="go-customer">回到柜台</button>' +
      (progress.unread ? '<button type="button" class="btn btn--secondary" data-action="go-archive">' + progress.unread + ' 封未读来信</button>' : '') +
      '</div></section></div>'
    );
  }

  function advance(root) {
    const before = EP.state.dialogueView();
    if (before.done) return;
    const after = EP.state.advanceDialogue();
    if (after.done) {
      render(root);
      EP.dialogue.scrollToEnd(document.getElementById('given-scroll'));
    } else {
      EP.dialogue.reveal(document.getElementById('given-scroll'), after.shown - 1);
      EP.dialogue.scrollToEnd(document.getElementById('given-scroll'));
    }
  }

  function render(root) {
    const ev = EP.state.currentEvent();
    const active = EP.state.get().active;
    if (!ev || !active) {
      root.innerHTML = emptyView();
    } else {
      const ch = EP.getCharacter(ev.characterId);
      if (active.phase === 'handover' || active.phase === 'departure') {
        root.innerHTML = givenView(ev, ch, active);
        const scroll = document.getElementById('given-scroll');
        EP.dialogue.bindScroll(scroll, root.querySelector('.given-panel'));
        if (scroll) scroll.scrollTop = 0;
      } else {
        root.innerHTML = shelfView(ev, ch, active);
      }
    }

    root.onclick = function (event) {
      const med = event.target.closest('[data-med]');
      if (med) {
        if (EP.state.selectMedicine(med.getAttribute('data-med'))) render(root);
        return;
      }
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action');
        if (action === 'confirm') {
          if (EP.state.giveMedicine()) render(root);
        } else if (action === 'go-customer') {
          EP.router.go('customer');
        } else if (action === 'go-archive') {
          EP.router.go('archive');
        } else if (action === 'advance') {
          advance(root);
        } else if (action === 'depart') {
          if (EP.state.toDeparture()) render(root);
        } else if (action === 'finish') {
          EP.app.finishEvent();
        }
        return;
      }
      if (event.target.closest('#given-scroll') && !EP.state.dialogueView().done) {
        advance(root);
      }
    };

    root.onkeydown = function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('#given-scroll') && !EP.state.dialogueView().done) {
        event.preventDefault();
        advance(root);
      }
    };
  }

  EP.medicine = {
    render: render,
    reset: reset
  };
})();
