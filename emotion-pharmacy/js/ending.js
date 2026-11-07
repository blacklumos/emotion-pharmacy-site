/* 结尾：最后一位客人离开以后。这里不颁发成就，只把最后一封信和暂存的信放在桌上。 */
(function () {
  const EP = window.EP;

  function show() {
    const progress = EP.state.progress();
    const queue = EP.letterQueue();
    const finalId = queue[queue.length - 1];
    const finalLetter = EP.state.letterView(finalId);
    const finalInfo = EP.state.letterInfo(finalId);
    const finalChar = finalLetter ? EP.getCharacter(finalLetter.characterId) : null;
    const deferred = EP.state.deferredLetters();

    const finalBlock = finalInfo.unlocked && finalLetter
      ? '<div class="ending-final">' +
        '<p class="ending-final__label">最后一封</p>' +
        '<button type="button" class="ending-letter" data-open-letter="' + finalLetter.id + '" style="--theme:' + finalChar.themeColor + ';--second:' + finalChar.secondaryColor + '">' +
        '<span class="ending-letter__avatar">' + EP.portrait.img(finalChar, 'portrait-img portrait-img--ending', { alt: '' }) + '</span>' +
        '<span class="ending-letter__name">' + EP.ui.esc(finalChar.name) + '</span>' +
        '<span class="ending-letter__title">《' + EP.ui.esc(finalLetter.title) + '》' + (finalInfo.read ? '' : ' · 未读') + '</span>' +
        '<span class="ending-letter__seal" aria-hidden="true">' + EP.ui.esc(finalChar.seal) + '</span>' +
        '</button></div>'
      : '';

    const deferredBlock = deferred.length
      ? '<div class="ending-deferred">' +
        '<p class="ending-deferred__label">还有些信，留在暂存里。</p>' +
        '<div class="ending-deferred__list">' +
        deferred.map(function (id) {
          const letter = EP.state.letterView(id);
          const ch = EP.getCharacter(letter.characterId);
          return '<button type="button" class="chip chip--letter" data-open-letter="' + letter.id + '">' + EP.ui.esc(ch.name) + ' · ' + EP.ui.esc(letter.title) + '</button>';
        }).join('') +
        '</div></div>'
      : '<p class="ending-note">没有信被留在暂存里。你把它们都收好了。</p>';

    const html =
      '<div class="ending-sheet">' +
      '<button type="button" class="overlay__close" data-close="1" aria-label="关闭">×</button>' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<span class="geo geo--stripes" aria-hidden="true"></span>' +
      '<p class="kicker">打烊</p>' +
      '<h2 class="ending-title">十次来访结束了。</h2>' +
      '<p class="ending-text">你把最后一只药瓶放回架子上。<br>巷子里的灯一盏一盏亮起来，门上的铃铛安静地挂着。</p>' +
      '<p class="ending-text">' + (progress.received >= progress.total ? '十封信都到了。' : '还有 ' + (progress.total - progress.received) + ' 封信没有送到。') + '</p>' +
      finalBlock +
      deferredBlock +
      '<div class="ending-actions">' +
      '<button type="button" class="btn btn--primary" data-close="1">在店里再坐一会儿</button>' +
      '<button type="button" class="btn btn--ghost" data-action="open-archive">翻阅所有信件</button>' +
      '</div>' +
      '<p class="ending-foot">《情绪药店》第一版 · 六位客人，十次来访</p>' +
      '</div>';

    const dialog = EP.ui.modal(html, {
      label: '打烊',
      className: 'overlay--ending',
      onClose: function () {
        EP.state.markEndingSeen();
        EP.router.paint();
      }
    });

    dialog.el.querySelectorAll('[data-open-letter]').forEach(function (el) {
      el.addEventListener('click', function () {
        const id = el.getAttribute('data-open-letter');
        dialog.close();
        setTimeout(function () {
          EP.archive.openLetter(id);
        }, 220);
      });
    });

    const archiveBtn = dialog.el.querySelector('[data-action="open-archive"]');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', function () {
        dialog.close();
        setTimeout(function () {
          EP.router.go('archive');
        }, 200);
      });
    }
  }

  EP.ending = { show: show };
})();
