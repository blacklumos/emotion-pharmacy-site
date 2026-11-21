/* 公告牌与制作组名单。 */
(function () {
  const EP = window.EP;

  const INTRO = [
    { type: 'p', text: '时来天地皆同力，远去英雄不自由。' },
    { type: 'p', text: '人们总是希望烦恼和一些心理上的问题可以一次性解决掉，就像吃药一样，咽下去就会好，再无后患。可是很多事情没有办法计算出一个最好的结果的，不过我们可以多一点勇气，平静，释怀，无论是来自自身的还是外在给予的。' },
    { type: 'p', text: '这个游戏也只是在看别人的故事，它或许没有好看的立绘，高级的技术和流程，只是普普通通的点击和文字故事。但如果我们可以从这些故事中找到哪怕一点点的感同身受，那这个作品就是成功的。' },
    { type: 'p', text: '这也是我想法的初衷，不去评价对错好坏，只是倾听，而后给出一些自身的想法。至少在第一版 demo 出现时，我被触动过，这就够了。' },
    { type: 'p', text: '问何物，能令公喜？我见青山多妩媚，料青山见我应如是。' },
    { type: 'signature', text: '诺齐wow敬上' }
  ];

  const MEMBERS = [
    { name: 'NQwow', tag: '广告位招租', note: '我是宿舍长，我要排第一个awa！！！！！', color: 'var(--yellow)' },
    { name: '哎呦喂', tag: '审美结界见习持有者 · NPC', note: '审美有限，执念无限，只是经过。', color: 'var(--pink)' },
    { name: 'yura', tag: '星际名厨⭐', note: '一个热爱生活的人。', color: 'var(--cyan)' },
    { name: '豆豆', tag: ' 有点佛系', note: '想慢慢琢磨，把事情做好。', color: 'var(--green)' },
    { name: '蓝粉色', tag: '橹穆九九', note: '我想呼风唤雨，用奇妙旋律。  我想一日千里，踩疯狂节奏。', color: 'var(--orange)' }
  ];

  function open() {
    const intro = INTRO.map(function (item) {
      if (item.type === 'quote') {
        return '<blockquote class="notice-quote">' + EP.ui.esc(item.text) + '</blockquote>';
      }
      if (item.type === 'signature') {
        return '<p class="notice-signature">' + EP.ui.esc(item.text) + '</p>';
      }
      return '<p class="notice-text">' + EP.ui.esc(item.text) + '</p>';
    }).join('');

    const members = MEMBERS.map(function (member) {
      return (
        '<div class="notice-member" style="--member:' + member.color + '">' +
        '<div class="notice-member__head"><b>' + EP.ui.esc(member.name) + '</b>' +
        (member.tag ? '<span>' + EP.ui.esc(member.tag) + '</span>' : '') +
        '</div>' +
        (member.note ? '<p>' + EP.ui.esc(member.note) + '</p>' : '') +
        '</div>'
      );
    }).join('');

    const html =
      '<article class="notice-sheet">' +
      '<button type="button" class="overlay__close" data-close="1" aria-label="合上公告">×</button>' +
      '<header class="notice-head">' +
      '<p class="kicker">公告</p>' +
      '<h2 class="notice-title">写给药店门口的你</h2>' +
      '<div class="notice-head__row">' +
      '<p class="notice-sub">落花人独立，微雨燕双飞</p>' +
      '<button type="button" class="notice-jump" data-notice-team="1">制作组名单 ↓</button>' +
      '</div>' +
      '</header>' +
      '<div class="notice-scroll" id="notice-scroll" tabindex="0" aria-label="公告正文，可以滚动">' +
      intro +
      '<div class="notice-rule" aria-hidden="true"><span>制作组名单</span></div>' +
      '<section class="notice-team" id="notice-team" tabindex="-1" aria-label="制作组名单">' +
      '<p class="notice-team__intro">作品的制作离不开可爱的 414 战队，这里单开一栏。</p>' +
      members +
      '<button type="button" class="notice-back" data-notice-top="1">↑ 回到开头</button>' +
      '</section>' +
      '</div>' +
      '<footer class="notice-foot">' +
      '<span>情绪药店 · 制作组</span>' +
      '<button type="button" class="btn btn--ghost" data-close="1">合上公告</button>' +
      '</footer>' +
      '</article>';

    const dialog = EP.ui.modal(html, { label: '公告与制作组名单', className: 'overlay--notice' });
    const scroller = dialog.el.querySelector('#notice-scroll');
    const team = dialog.el.querySelector('#notice-team');
    const jump = dialog.el.querySelector('[data-notice-team]');
    const back = dialog.el.querySelector('[data-notice-top]');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function scrollToElement(el) {
      if (!el || !scroller) return;
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 10;
      scroller.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    if (jump) {
      jump.addEventListener('click', function () {
        scrollToElement(team);
        if (team) team.focus({ preventScroll: true });
      });
    }
    if (back) {
      back.addEventListener('click', function () {
        scroller.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        scroller.focus({ preventScroll: true });
      });
    }
  }

  EP.notice = { open: open };
})();
