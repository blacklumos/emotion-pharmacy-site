/* 信件档案：解锁、阅读、暂存与重新铭记。
 * 一封信只属于一次来访；记忆状态按信件 ID 独立保存。
 */
(function () {
  const EP = window.EP;
  let filter = 'all';

  const CLOSING_TEXT = '有些事情，当时没有记住，也没有关系。\n现在想起来了，就很好。';

 function cardHtml(letter, info) {
    if (!letter) return '';
    const view = EP.state.letterView(letter.id) || letter;
    const ch = EP.getCharacter(letter.characterId);
    const number = EP.letterNumber(letter.id);

    const remembered = info.memoryState === 'remembered';
    const deferred = info.memoryState === 'deferred';
    const stateLabel = remembered ? '铭记' : deferred ? '暂存' : info.read ? '已读' : '未读';
    const pattern = ch.pattern || 'dots';

    return (
      '<button type="button" class="letter-card pattern--' + pattern + (info.read ? '' : ' is-unread') + (deferred ? ' is-deferred' : '') + '"' +
      ' data-letter="' + letter.id + '" style="--theme:' + ch.themeColor + ';--second:' + ch.secondaryColor + '">' +
      '<span class="letter-card__top"><span class="letter-card__no">第 ' + number + ' 封</span>' +
      '<span class="letter-card__state">' + stateLabel + '</span></span>' +
      '<span class="letter-card__body">' +
      '<span class="letter-card__avatar">' + EP.portrait.img(ch, 'portrait-img portrait-img--card', { alt: '' }) + '</span>' +
      '<span class="letter-card__text">' +
      '<span class="letter-card__name">' + EP.ui.esc(ch.name) + '</span>' +
      '<span class="letter-card__title">' + EP.ui.esc(view.title) + '</span>' +
      '<span class="letter-card__sub">' + EP.ui.esc(EP.getEvent(letter.eventId) ? EP.getEvent(letter.eventId).title : '') + '</span>' +
      '</span></span>' +
      '<span class="letter-card__seal" aria-hidden="true">' + EP.ui.esc(ch.seal) + '</span>' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '</button>'
    );
  }

  function listLetters() {
    return EP.letterQueue().map(function (id) {
      return { letter: EP.getLetter(id), info: EP.state.letterInfo(id) };
    }).filter(function (item) {
      if (!item.letter) return false;
      if (!item.info.unlocked) return false; 
      if (filter === 'remembered') return item.info.unlocked && item.info.memoryState === 'remembered';
      if (filter === 'deferred') return item.info.unlocked && item.info.memoryState === 'deferred';
      return true;
    });
  }

  function render(root) {
    const progress = EP.state.progress();
    const items = listLetters();
    const pending = EP.state.pendingLetters();
    const filters = [
      { id: 'all', label: '全部' },
      { id: 'remembered', label: '铭记' },
      { id: 'deferred', label: '暂存' }
    ];

    root.innerHTML =
      '<div class="archive-screen">' +
      '<header class="archive-head">' +
      '<div><p class="kicker">信件档案</p><h2>后来写来的信</h2></div>' +
      '<p class="archive-meta">已收到 ' + progress.received + ' 封' +
      ' · 铭记 ' + progress.remembered + ' · 暂存 ' + progress.deferred +
      (pending.length ? ' · ' + pending.length + ' 封在路上' : '') + '</p>' +
      '</header>' +
      '<p class="archive-intro">信件是人物生活的延续，不是给你打分的成绩单。信里不会评价你当时的选择。</p>' +
      '<div class="archive-filters" role="tablist" aria-label="筛选信件">' +
      filters.map(function (f) {
        return '<button type="button" class="chip chip--filter' + (filter === f.id ? ' is-active' : '') + '" data-filter="' + f.id + '" role="tab" aria-selected="' + (filter === f.id) + '">' + f.label + '</button>';
      }).join('') +
      '</div>' +
      (items.length
        ? '<div class="letter-grid">' + items.map(function (item) { return cardHtml(item.letter, item.info); }).join('') + '</div>'
        : '<p class="archive-empty">' + (filter === 'all' ? '档案还是空的。等第一位客人离开以后，信会慢慢送到。' : '这一类里还没有信。') + '</p>') +
      '</div>';

    root.querySelectorAll('[data-filter]').forEach(function (el) {
      el.addEventListener('click', function () {
        filter = el.getAttribute('data-filter');
        render(root);
      });
    });
    root.querySelectorAll('[data-letter]').forEach(function (el) {
      el.addEventListener('click', function () {
        openLetter(el.getAttribute('data-letter'));
      });
    });
  }

  function echoFor(letter) {
    const completed = EP.state.get().completed[letter.eventId];
    if (!completed) return null;
    const event = EP.getEvent(letter.eventId);
    const response = event && event.medicineResponses[completed.medicine];
    const medicine = EP.getMedicine(completed.medicine);
    if (!response || !response.beats.length) return null;
    const view = EP.state.letterView(letter.id) || letter;
    const line = response.beats.filter(function (b) { return b.type === 'customer'; })[0] || response.beats[0];
    return {
      prefix: view.echoPrefix,
      quote: line.text,
      medicine: medicine
    };
  }

  function callbackHtml(letter) {
    if (!letter.callback) return '';
    const dep = EP.state.letterInfo(letter.callback.dependsOn);
    if (dep.memoryState !== letter.callback.memoryState) return '';
    return (
      '<div class="letter-callback">' +
      '<p>' + EP.ui.esc(letter.callback.text) + '</p>' +
      '<button type="button" class="link-btn" data-open-letter="' + letter.callback.linkLetterId + '">' + EP.ui.esc(letter.callback.linkLabel) + '</button>' +
      '</div>'
    );
  }

  function memoryHtml(letter, info) {
    if (info.memoryState === 'remembered') {
      return '<div class="letter-memory is-remembered">' +
        '<p class="letter-memory__label">这封信被铭记着。</p>' +
        '<button type="button" class="link-btn" data-memory="deferred">改为暂时放下</button>' +
        '</div>';
    }
    if (info.memoryState === 'deferred') {
      return '<div class="letter-memory is-deferred">' +
        '<p class="letter-memory__label">这封信被放在暂存里。忘记不等于删除，你仍然可以在档案中找到它。</p>' +
        '<div class="letter-memory__actions">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-memory="deferred">仍然暂时放下</button>' +
        '<button type="button" class="btn btn--primary btn--sm" data-memory="remembered">现在，我想记住它</button>' +
        '</div></div>';
    }
    return '<div class="letter-memory is-unmarked">' +
      '<p class="letter-memory__label">你想记住这封信吗？</p>' +
      '<div class="letter-memory__actions">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-memory="deferred">暂时忘记</button>' +
      '<button type="button" class="btn btn--primary btn--sm" data-memory="remembered">铭记于心</button>' +
      '</div></div>';
  }

  function openLetter(letterId) {
    const info = EP.state.letterInfo(letterId);
    if (!info.unlocked) {
      EP.ui.toast('这封信还没有送到。');
      return;
    }
    EP.state.readLetter(letterId);
    const letter = EP.state.letterView(letterId) || EP.getLetter(letterId);
    const ch = EP.getCharacter(letter.characterId);
    const event = EP.getEvent(letter.eventId);
    const echo = echoFor(letter);
    const pattern = ch.pattern || 'dots';
    const body = letter.lines.map(function (line) {
      return line === '' ? '<span class="letter-gap"></span>' : '<p>' + EP.ui.esc(line) + '</p>';
    }).join('');

    const inner =
      '<article class="letter-sheet pattern--' + pattern + '" style="--paper:' + ch.paperColor + ';--theme:' + ch.themeColor + ';--second:' + ch.secondaryColor + '">' +
      '<button type="button" class="overlay__close" data-close="1" aria-label="合上信">×</button>' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<header class="letter-head">' +
      '<span class="letter-head__avatar">' + EP.portrait.img(ch, 'portrait-img portrait-img--letter', { alt: '' }) + '</span>' +
      '<div class="letter-head__meta">' +
      '<span class="letter-head__name">' + EP.ui.esc(ch.name) + '</span>' +
      '<span>第 ' + EP.letterNumber(letter.id) + ' 封来信</span>' +
      '<span>' + EP.ui.esc(event ? event.title : '') + '</span>' +
      '</div>' +
      '<span class="letter-seal" aria-hidden="true">' + EP.ui.esc(ch.seal) + '</span>' +
      '</header>' +
      '<h2 class="letter-title">' + EP.ui.esc(letter.title) + '</h2>' +
      '<p class="letter-salutation">' + EP.ui.esc(letter.salutation) + '</p>' +
      '<div class="letter-body">' + body + '</div>' +
      '<p class="letter-signature">' + EP.ui.esc(letter.signature) + '</p>' +
      (echo
        ? '<div class="letter-echo"><p>' + EP.ui.esc(echo.prefix) + '</p><blockquote>「' + EP.ui.esc(echo.quote) + '」</blockquote><span class="letter-echo__med">' + EP.ui.esc(echo.medicine.name) + '</span></div>'
        : '') +
      callbackHtml(letter) +
      '<div class="letter-memory-slot">' + memoryHtml(letter, EP.state.letterInfo(letterId)) + '</div>' +
      '<div class="letter-close-row"><button type="button" class="link-btn" data-close="1">合上信</button></div>' +
      '</article>';

    const dialog = EP.ui.modal(inner, {
      label: letter.title,
      className: 'overlay--letter',
      onClose: function () {
        EP.app.refresh('letter-close');
      }
    });

    const sheet = dialog.el.querySelector('.letter-sheet');
    const slot = dialog.el.querySelector('.letter-memory-slot');

    function bindMemory() {
      slot.querySelectorAll('[data-memory]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const value = btn.getAttribute('data-memory');
          const result = EP.state.setMemory(letterId, value);
          if (!result.ok) return;
          if (result.closing) {
            const note = document.createElement('p');
            note.className = 'letter-closing';
            note.innerHTML = EP.ui.esc(CLOSING_TEXT).replace(/\n/g, '<br>');
            sheet.insertBefore(note, slot);
            note.classList.add('is-shown');
          }
          slot.innerHTML = memoryHtml(letter, EP.state.letterInfo(letterId));
          bindMemory();
        });
      });
    }
    bindMemory();

    const link = dialog.el.querySelector('[data-open-letter]');
    if (link) {
      link.addEventListener('click', function () {
        const target = link.getAttribute('data-open-letter');
        dialog.close();
        setTimeout(function () {
          openLetter(target);
        }, 200);
      });
    }
  }

  EP.archive = {
    render: render,
    openLetter: openLetter,
    setFilter: function (value) {
      filter = value;
    }
  };
})();
