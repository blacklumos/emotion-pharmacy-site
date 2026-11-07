/* 顾客界面：进店、逐句对话、提问、反应，以及随时切换去配药。
 * 台词全部来自事件数据；这里只决定显示到第几句、气泡放在哪一格，以及玩家操作的落点。
 */
(function () {
  const EP = window.EP;

  function reset() {
    /* 对话进度保存在 state 里，这里不需要额外清理。 */
  }

  function shelfHtml() {
    return EP.medicines().map(function (m, i) {
      return '<i class="shelf-bottle" style="--c:' + m.color + ';--n:' + i + '"></i>';
    }).join('');
  }

  function dotsHtml() {
    const progress = EP.state.progress();
    let out = '<div class="visit-dots" aria-hidden="true">';
    for (let i = 0; i < progress.total; i += 1) {
      out += '<i class="' + (i < progress.completed ? 'is-done' : '') + '"></i>';
    }
    return out + '</div>';
  }

  /* 问题气泡的位置跟着来访编号轮换：敏感问题不会永远待在右下角。 */
  function orderedBubbles(ev) {
    const n = ev.questions.length;
    if (!n) return [];
    const offset = (ev.order || 1) % n;
    return ev.questions.map(function (q, i) {
      return { question: q, slot: (i + offset) % n };
    }).sort(function (a, b) {
      return a.slot - b.slot;
    });
  }

  function bubbleHtml(item, index, asked) {
    const q = item.question;
    return (
      '<button type="button" class="bubble bubble--' + (item.slot + 1) + (asked ? ' is-asked' : '') + '"' +
      ' style="--i:' + index + '" data-action="ask" data-qid="' + EP.ui.esc(q.id) + '"' +
      ' aria-label="提问：' + EP.ui.esc(q.text) + '">' +
      '<span class="bubble__text">' + EP.ui.esc(q.text) + '</span>' +
      (asked ? '<span class="bubble__flag">已问</span>' : '') +
      '</button>'
    );
  }

  function headerHtml(ev, progress) {
    return (
      '<header class="dialogue-head">' +
      '<span class="dialogue-title">' + EP.ui.esc(ev.title) + '</span>' +
      '<span class="dialogue-progress">' + (progress.completed + 1) + ' / ' + progress.total + '</span>' +
      '</header>'
    );
  }

  function bubblesHtml(ev, active) {
    const view = EP.state.dialogueView();
    const showBubbles = active.phase === 'talk' && view.done && !active.locked;
    if (!showBubbles) return '';
    return (
      '<div class="bubble-layer" aria-label="可以问的问题">' +
      orderedBubbles(ev).map(function (item, index) {
        return bubbleHtml(item, index, active.asked.indexOf(item.question.id) >= 0);
      }).join('') +
      '</div>'
    );
  }

  function panelHtml(ev, active) {
    const view = EP.state.dialogueView();
    const q = view.questionId ? EP.state.findQuestion(ev, view.questionId) : null;
    const caption = q
      ? '<p class="panel-caption">' +
        (view.kind === 'recovery' ? '你道了歉' : '你问：' + EP.ui.esc(q.text)) +
        '</p>'
      : '';
    const note = active.locked && q && q.lockNote
      ? '<p class="panel-note"' + (view.done ? '' : ' hidden') + '>' + EP.ui.esc(q.lockNote) + '</p>'
      : '';
    const beats = EP.dialogue.html(view.beats, EP.getCharacter(ev.characterId).name, view.shown);
    const draft = active.draft ? EP.getMedicine(active.draft) : null;
    const goLabel = draft ? '去配药 · ' + draft.name : '去配药';

    const continueActions =
      '<div class="dialogue-actions dialogue-actions--continue"' + (view.done ? ' hidden' : '') + '>' +
      '<button type="button" class="btn btn--primary" data-action="advance">继续 ▸</button>' +
      '<button type="button" class="btn btn--ghost" data-action="go-medicine">' + EP.ui.esc(goLabel) + '</button>' +
      '</div>';

    const doneActions =
      '<div class="dialogue-actions dialogue-actions--done"' + (view.done ? '' : ' hidden') + '>' +
      (active.locked && q && q.reaction === 'anger'
        ? '<button type="button" class="btn btn--secondary" data-action="apologise">道歉</button>'
        : '') +
      '<button type="button" class="btn btn--ghost" data-action="go-medicine">' + EP.ui.esc(goLabel) + '</button>' +
      '</div>';

    return (
      '<section class="dialogue-panel" aria-live="polite">' +
      headerHtml(ev, EP.state.progress()) +
      '<p class="dialogue-hint"' + (view.done ? ' hidden' : '') + '>点击对话继续 · 每次只出现一句</p>' +
      '<div class="dialogue-scroll-wrap">' +
      '<div class="dialogue-scroll" id="dialogue-scroll" tabindex="0" role="region" aria-label="对话，按回车继续">' +
      caption + beats + note +
      '</div>' +
      '<div class="scroll-more" aria-hidden="true">↓ 还有</div>' +
      '</div>' +
      continueActions + doneActions +
      '</section>'
    );
  }

  function screenHtml(ev, ch, active) {
    const view = EP.state.dialogueView();
    const stageHint = !view.done
      ? '读下去'
      : active.locked
        ? '客人暂时不想再回答'
        : '可以提问，也可以随时去配药';
    return (
      '<div class="customer-screen" data-char="' + ch.id + '" style="--theme:' + ch.themeColor + ';--second:' + ch.secondaryColor + '">' +
      '<div class="stage">' +
      '<div class="stage__disc" aria-hidden="true"></div>' +
      '<div class="stage__window" aria-hidden="true"></div>' +
      '<div class="stage__shelf" aria-hidden="true">' + shelfHtml() + '</div>' +
      '<div class="stage__counter" aria-hidden="true"></div>' +
      '<div class="stage__shape stage__shape--circle" aria-hidden="true"></div>' +
      '<div class="stage__shape stage__shape--tri" aria-hidden="true"></div>' +
      '<div class="stage__shape stage__shape--stripes" aria-hidden="true"></div>' +
      '<figure class="portrait-block">' +
      EP.portrait.img(ch, 'portrait-img portrait-img--stage') +
      '<figcaption class="nameplate">' +
      '<span class="nameplate__name">' + EP.ui.esc(ch.name) + '</span>' +
      '<span class="nameplate__meta">' + ch.age + ' 岁 · ' + EP.ui.esc(ch.occupation) + '</span>' +
      '<button type="button" class="nameplate__more" data-action="profile">人物小记</button>' +
      '</figcaption>' +
      '</figure>' +
      '<div class="stage__visit">' +
      '<b>' + EP.ui.esc(ev.visitLabel) + '</b>' +
      '<span>' + EP.ui.esc(ev.scene.time || '') + '</span>' +
      '</div>' +
      '<div class="stage__hint" aria-hidden="true">' + stageHint + '</div>' +
      '</div>' +
      bubblesHtml(ev, active) +
      panelHtml(ev, active) +
      '</div>'
    );
  }

  function renderIdle(root) {
    const st = EP.state.get();
    const progress = EP.state.progress();
    const finished = st.flags.finished;
    const pending = EP.state.pendingLetters();
    let title = '还没有人推门进来。';
    let text = '这间小店不出售感冒药。柜台上放着一只空瓶，等着下一个不知道该往哪里走的人。';
    let hint = '一次点击只读一句。你可以随时提问，也可以随时走到药柜前。';
    let actions = '';

    if (finished) {
      title = '今天的店，还亮着灯。';
      text = '十次来访都结束了。十封信留在档案里，随时可以重新翻开。';
      hint = '有些信，你选择记住；有些信，你选择先放一放。它们都还在。';
      actions =
        '<button type="button" class="btn btn--primary" data-action="go-archive">翻阅信件</button>' +
        '<button type="button" class="btn btn--secondary" data-action="ending">今晚的结尾</button>' +
        '<button type="button" class="btn btn--ghost" data-action="restart">重新开始</button>';
    } else if (st.flags.started) {
      title = '巷子里暂时安静。';
      text = pending.length
        ? '上一位客人的信还压在柜台下面。等下一位客人推门进来时，它会一起送到档案里。'
        : '你把药瓶放回架子上，擦干净柜台，等门上的铃铛再响一次。';
      hint = '一封信不会在你送客时立刻出现，它会在下一次开门时送到。';
      actions =
        '<button type="button" class="btn btn--primary" data-action="begin-next">迎接下一位顾客</button>' +
        '<button type="button" class="btn btn--secondary" data-action="go-archive">翻阅档案</button>';
    } else {
      actions = '<button type="button" class="btn btn--primary" data-action="begin-next">开门营业</button>';
    }

    const nextLabel = finished
      ? '十次来访 · 已完成'
      : '下一次来访 · 第 ' + (progress.completed + 1) + ' 位 / 共 ' + progress.total + ' 次';

    root.innerHTML =
      '<div class="idle-screen">' +
      '<div class="stage stage--idle" aria-hidden="true">' +
      '<div class="stage__disc"></div>' +
      '<div class="stage__shape stage__shape--circle"></div>' +
      '<div class="stage__shape stage__shape--tri"></div>' +
      '<div class="stage__shape stage__shape--stripes"></div>' +
      '<div class="shopfront">' +
      '<div class="shopfront__sign"><span>情绪</span><span>药店</span></div>' +
      '<div class="shopfront__awning"></div>' +
      '<div class="shopfront__glass"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="shopfront__door"></div>' +
      '<div class="shopfront__step"></div>' +
      '</div>' +
      '</div>' +
      '<section class="idle-card">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<span class="geo geo--stripes" aria-hidden="true"></span>' +
      '<p class="idle-epigraph">把难以描述的东西，装进瓶子里。</p>' +
      '<p class="kicker">情绪药店</p>' +
      '<h2>' + EP.ui.esc(title) + '</h2>' +
      '<p class="idle-text">' + EP.ui.esc(text) + '</p>' +
      '<p class="idle-hint">' + EP.ui.esc(hint) + '</p>' +
      '<p class="idle-next">' + EP.ui.esc(nextLabel) + '</p>' +
      dotsHtml() +
      '<div class="idle-actions">' + actions + '</div>' +
      '<p class="idle-meta">已完成 ' + progress.completed + ' / ' + progress.total + ' 次来访' +
      (progress.unread ? ' · ' + progress.unread + ' 封未读来信' : '') +
      '</p>' +
      '</section>' +
      '</div>';
  }

  function renderWaiting(root, ev, ch, active) {
    let text = '药瓶还空着，客人在柜台前等你。';
    let action = '去配药';
    if (active.phase === 'handover') {
      text = '客人已经接过药，正在等你把话说完。';
      action = '继续配药';
    }
    if (active.phase === 'departure') {
      text = '客人已经起身，在门口等你送别。';
      action = '送客';
    }
    root.innerHTML =
      '<div class="customer-screen customer-screen--waiting">' +
      '<section class="wait-card">' +
      '<span class="geo geo--circle" aria-hidden="true"></span>' +
      '<span class="geo geo--tri" aria-hidden="true"></span>' +
      '<div class="wait-portrait">' + EP.portrait.img(ch, 'portrait-img portrait-img--wait') + '</div>' +
      '<p class="kicker">柜台前</p>' +
      '<h2>' + EP.ui.esc(ch.name) + '还在等你。</h2>' +
      '<p class="idle-text">' + EP.ui.esc(text) + '</p>' +
      '<div class="idle-actions">' +
      '<button type="button" class="btn btn--primary" data-action="go-medicine">' + EP.ui.esc(action) + '</button>' +
      '</div>' +
      '</section></div>';
  }

  function openProfile(ch) {
    const keywords = (ch.keywords || []).map(function (k) {
      return '<span class="chip">' + EP.ui.esc(k) + '</span>';
    }).join('');
    const speech = (ch.speech || []).map(function (s) {
      return '<li>' + EP.ui.esc(s) + '</li>';
    }).join('');
    const html =
      '<div class="profile">' +
      '<button type="button" class="overlay__close" data-close="1" aria-label="关闭">×</button>' +
      '<div class="profile__portrait">' + EP.portrait.img(ch, 'portrait-img portrait-img--profile') + '</div>' +
      '<div class="profile__body">' +
      '<p class="kicker">' + EP.ui.esc(ch.role || '') + '</p>' +
      '<h2>' + EP.ui.esc(ch.name) + '<span class="profile__meta">' + ch.age + ' 岁 · ' + EP.ui.esc(ch.occupation) + '</span></h2>' +
      '<p class="profile__desc">' + EP.ui.esc(ch.description) + '</p>' +
      '<div class="profile__chips">' + keywords + '</div>' +
      '<h3>说话的样子</h3><ul class="profile__list">' + speech + '</ul>' +
      '</div></div>';
    EP.ui.modal(html, { label: ch.name + '的人物小记', className: 'overlay--profile' });
  }

  function advance(root) {
    const before = EP.state.dialogueView();
    if (before.done) return;
    const after = EP.state.advanceDialogue();
    if (after.done) {
      render(root);
      EP.dialogue.scrollToEnd(document.getElementById('dialogue-scroll'));
      return;
    }
    EP.dialogue.reveal(document.getElementById('dialogue-scroll'), after.shown - 1);
    EP.dialogue.scrollToEnd(document.getElementById('dialogue-scroll'));
  }

  function render(root) {
    const st = EP.state.get();
    const ev = EP.state.currentEvent();
    if (!ev) {
      renderIdle(root);
    } else {
      const ch = EP.getCharacter(ev.characterId);
      if (st.active.phase === 'handover' || st.active.phase === 'departure') {
        renderWaiting(root, ev, ch, st.active);
      } else {
        root.innerHTML = screenHtml(ev, ch, st.active);
        const scroll = document.getElementById('dialogue-scroll');
        EP.dialogue.bindScroll(scroll, root.querySelector('.dialogue-panel'));
        if (scroll) scroll.scrollTop = 0;
      }
    }

    root.onclick = function (event) {
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action');
        if (action === 'advance') {
          advance(root);
        } else if (action === 'go-medicine') {
          EP.router.go('medicine');
        } else if (action === 'ask') {
          const qid = actionEl.getAttribute('data-qid');
          if (EP.state.ask(qid)) render(root);
        } else if (action === 'apologise') {
          if (EP.state.apologise()) render(root);
        } else if (action === 'profile') {
          const current = EP.state.currentEvent();
          if (current) openProfile(EP.getCharacter(current.characterId));
        } else if (action === 'begin-next') {
          EP.app.startNext();
        } else if (action === 'go-archive') {
          EP.router.go('archive');
        } else if (action === 'ending') {
          EP.ending.show();
        } else if (action === 'restart') {
          EP.app.confirmRestart();
        }
        return;
      }
      if (event.target.closest('#dialogue-scroll') && !EP.state.dialogueView().done) {
        advance(root);
      }
    };

    root.onkeydown = function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('#dialogue-scroll') && !EP.state.dialogueView().done) {
        event.preventDefault();
        advance(root);
      }
    };
  }

  EP.customer = {
    render: render,
    reset: reset,
    openProfile: openProfile
  };
})();
