/* 浏览器本地存档。只保存轻量进度，不做账号与云同步。 */
(function () {
  const EP = window.EP;
  const KEY = 'emotion_pharmacy.save.v1';

  function available() {
    try {
      const probe = KEY + '.probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function save(value) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(KEY);
      return true;
    } catch (err) {
      return false;
    }
  }

  EP.storage = {
    KEY: KEY,
    available: available,
    load: load,
    save: save,
    clear: clear
  };
})();
