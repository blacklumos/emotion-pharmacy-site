/* 通用界面小工具：安全转义、浮层、提示条。 */
(function () {
  const EP = window.EP;

  const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ESCAPE[ch];
    });
  }

  function modal(innerHtml, options) {
    const opts = options || {};
    const root = document.getElementById('overlay-root');
    const previousFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'overlay' + (opts.className ? ' ' + opts.className : '');
    wrap.innerHTML =
      '<div class="overlay__scrim" data-close="1"></div>' +
      '<div class="overlay__panel" role="dialog" aria-modal="true" aria-label="' + esc(opts.label || '面板') + '">' +
      innerHtml +
      '</div>';
    root.appendChild(wrap);
    document.body.classList.add('is-overlay');

    const app = document.querySelector('.app');
    if (app) app.inert = true;

    const panel = wrap.querySelector('.overlay__panel');
    panel.setAttribute('tabindex', '-1');

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      wrap.classList.remove('is-open');
      setTimeout(function () {
        wrap.remove();
        if (!root.children.length) {
          document.body.classList.remove('is-overlay');
          if (app) app.inert = false;
          if (previousFocus && previousFocus.focus && document.contains(previousFocus)) {
            previousFocus.focus({ preventScroll: true });
          }
        }
      }, 180);
      if (opts.onClose) opts.onClose();
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
    }
    wrap.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', onKey);
    void wrap.offsetWidth;
    wrap.classList.add('is-open');
    panel.focus({ preventScroll: true });
    return { el: wrap, close: close };
  }

  function toast(message, kind) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('is-in');
    });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 2800);
  }

  function confirm(options) {
    const opts = options || {};
    const html =
      '<div class="modal-card">' +
      '<p class="modal-kicker">' + esc(opts.kicker || '请确认') + '</p>' +
      '<h2 class="modal-title">' + esc(opts.title || '') + '</h2>' +
      (opts.text ? '<p class="modal-text">' + esc(opts.text) + '</p>' : '') +
      '<div class="modal-actions">' +
      '<button class="btn btn--ghost" data-close="1">' + esc(opts.cancelLabel || '再想想') + '</button>' +
      '<button class="btn btn--primary" data-confirm="1">' + esc(opts.okLabel || '继续') + '</button>' +
      '</div></div>';
    const dialog = modal(html, { label: opts.title || '确认', className: 'overlay--center' });
    const ok = dialog.el.querySelector('[data-confirm]');
    if (ok) {
      ok.addEventListener('click', function () {
        dialog.close();
        if (opts.onOk) opts.onOk();
      });
    }
    return dialog;
  }

  EP.ui = {
    esc: esc,
    modal: modal,
    toast: toast,
    confirm: confirm
  };
})();
