/* 三个界面之间的路由。界面本身不保存状态，只读取状态并绘制。 */
(function () {
  const EP = window.EP;
  const SCREENS = ['customer', 'medicine', 'archive'];

  function currentScreen() {
    const screen = EP.state.screen();
    if (SCREENS.indexOf(screen) < 0) return 'customer';
    return screen;
  }

  function paint() {
    const screen = currentScreen();
    document.querySelectorAll('[data-screen]').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-screen') === screen);
    });
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      const active = el.getAttribute('data-nav') === screen;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    const root = document.querySelector('[data-screen="' + screen + '"]');
    if (root) {
      if (screen === 'customer') EP.customer.render(root);
      else if (screen === 'medicine') EP.medicine.render(root);
      else EP.archive.render(root);
    }
    updateChrome();
    window.scrollTo(0, 0);
  }

  function updateChrome() {
    const progress = EP.state.progress();
    const label = document.getElementById('progress-label');
    if (label) {
      label.textContent = progress.completed >= progress.total ? '十次来访 · 已结束' : '来访 ' + progress.completed + ' / ' + progress.total;
    }
    const pill = document.getElementById('unread-pill');
    if (pill) {
      if (progress.unread > 0) {
        pill.hidden = false;
        pill.textContent = progress.unread + ' 封未读';
      } else {
        pill.hidden = true;
      }
    }
    document.querySelectorAll('[data-badge]').forEach(function (el) {
      const count = el.getAttribute('data-badge') === 'archive' ? progress.unread : 0;
      el.textContent = count > 0 ? String(count) : '';
      el.classList.toggle('is-on', count > 0);
    });
    document.body.classList.toggle('is-finished', !!EP.state.get().flags.finished);
  }

  function go(screen) {
    if (SCREENS.indexOf(screen) < 0) return false;
    const ok = EP.state.go(screen);
    if (!ok) return false;
    paint();
    return true;
  }

  function init() {
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        go(el.getAttribute('data-nav'));
      });
    });
    const brand = document.querySelector('[data-action="home"]');
    if (brand) {
      brand.addEventListener('click', function () {
        go('customer');
      });
    }
    const restart = document.querySelector('[data-action="restart"]');
    if (restart) {
      restart.addEventListener('click', function () {
        EP.app.confirmRestart();
      });
    }
    paint();
  }

  EP.router = {
    init: init,
    go: go,
    paint: paint,
    updateChrome: updateChrome
  };
})();
