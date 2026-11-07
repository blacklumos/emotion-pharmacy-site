/* 游戏状态与流程控制。
 * 这里不接触任何 DOM：界面只读取状态、触发操作，再自行重绘。
 *
 * 交谈与配药是并行的两条线：
 * - 任何时候都可以切到配药界面，再切回来继续说话；
 * - 只有真正把药交出去（giveMedicine）才会结束交谈；
 * - 每段对话用 view.shown 记录已经显示到第几句，切界面或刷新都不会丢进度。
 */
(function () {
  const EP = window.EP;
  const SCREENS = ['customer', 'medicine', 'archive'];
  const PHASES = ['opening', 'talk', 'handover', 'departure'];
  const VIEW_KINDS = ['opening', 'talkPrompt', 'question', 'reaction', 'recovery', 'handover', 'departure'];

  let data = null;
  const listeners = [];

  function initial() {
    return {
      v: 2,
      screen: 'customer',
      queueIndex: 0,
      active: null,
      completed: {},
      letters: {},
      pending: [],
      flags: {
        started: false,
        finished: false,
        endingSeen: false,
        closingShown: false
      },
      createdAt: Date.now()
    };
  }

  function cloneView(view) {
    return {
      kind: view && view.kind ? view.kind : 'talkPrompt',
      questionId: view && view.questionId ? view.questionId : null,
      shown: view && Number.isFinite(view.shown) ? view.shown : 1
    };
  }

  function cloneActive(a) {
    return {
      eventId: a.eventId,
      phase: a.phase,
      asked: Array.isArray(a.asked) ? a.asked.slice() : [],
      reaction: a.reaction || null,
      reactionQuestion: a.reactionQuestion || null,
      locked: !!a.locked,
      apologised: !!a.apologised,
      medicine: a.medicine || null,
      draft: a.draft || null,
      view: cloneView(a.view)
    };
  }

  function findQuestion(ev, questionId) {
    if (!ev || !questionId) return null;
    return ev.questions.filter(function (q) {
      return q.id === questionId;
    })[0] || null;
  }

  function beatsFor(ev, active) {
    if (!ev || !active) return [];
    const view = active.view || { kind: 'talkPrompt' };
    switch (view.kind) {
      case 'opening':
        return ev.opening;
      case 'talkPrompt':
        return ev.talkPrompt ? [{ type: 'narration', text: ev.talkPrompt }] : [];
      case 'question':
      case 'reaction': {
        const q = findQuestion(ev, view.questionId);
        return q ? q.beats : [];
      }
      case 'recovery': {
        const q = findQuestion(ev, view.questionId);
        if (!q) return [];
        return [{ type: 'owner', text: EP.PLAYER_APOLOGY }].concat(q.recovery);
      }
      case 'handover': {
        const response = active.medicine ? ev.medicineResponses[active.medicine] : null;
        return ev.handover.concat(response ? response.beats : []);
      }
      case 'departure':
        return ev.departure;
      default:
        return [];
    }
  }

  function defaultView(phase) {
    if (phase === 'opening') return { kind: 'opening', questionId: null, shown: 1 };
    if (phase === 'handover') return { kind: 'handover', questionId: null, shown: 1 };
    if (phase === 'departure') return { kind: 'departure', questionId: null, shown: 1 };
    return { kind: 'talkPrompt', questionId: null, shown: 1 };
  }

  function normalizeView(saved, active, ev, version) {
    let view = saved && VIEW_KINDS.indexOf(saved.kind) >= 0 ? cloneView(saved) : null;
    if (!view) view = defaultView(active.phase);

    if (active.phase === 'opening') view = { kind: 'opening', questionId: null, shown: view.shown || 1 };
    if (active.phase === 'talk') {
      if (['opening', 'talkPrompt', 'question', 'reaction', 'recovery'].indexOf(view.kind) < 0) {
        view = defaultView('talk');
      }
    }
    if (active.phase === 'handover') {
      if (view.kind !== 'handover') view = defaultView('handover');
    }
    if (active.phase === 'departure') {
      if (view.kind !== 'departure') view = defaultView('departure');
    }

    if (['question', 'reaction', 'recovery'].indexOf(view.kind) >= 0 && !findQuestion(ev, view.questionId)) {
      view = defaultView('talk');
    }
    if (view.kind === 'handover' && !active.medicine) {
      view = defaultView('talk');
      active.phase = 'talk';
    }

    if (!Number.isFinite(view.shown) || view.shown < 1) view.shown = 1;
    if (version === 1) view.shown = 1;

    const total = beatsFor(ev, active).length;
    if (total === 0) view.shown = 0;
    else view.shown = Math.min(view.shown, total);

    if (active.phase === 'opening' && view.kind === 'opening' && total > 0 && view.shown >= total) {
      active.phase = 'talk';
    }

    return view;
  }

  function normalize(saved) {
    if (!saved || (saved.v !== 1 && saved.v !== 2)) return null;
    const base = initial();
    const d = {
      v: 2,
      screen: SCREENS.indexOf(saved.screen) >= 0 ? saved.screen : base.screen,
      queueIndex: Number.isFinite(saved.queueIndex) ? saved.queueIndex : 0,
      active: saved.active && saved.active.eventId ? cloneActive(saved.active) : null,
      completed: saved.completed && typeof saved.completed === 'object' ? saved.completed : {},
      letters: saved.letters && typeof saved.letters === 'object' ? saved.letters : {},
      pending: Array.isArray(saved.pending) ? saved.pending.slice() : [],
      flags: Object.assign(base.flags, saved.flags || {}),
      createdAt: saved.createdAt || Date.now()
    };

    const queue = EP.eventQueue();
    if (d.queueIndex < 0) d.queueIndex = 0;
    if (d.queueIndex > queue.length) d.queueIndex = queue.length;

    if (d.active) {
      const ev = EP.getEvent(d.active.eventId);
      if (!ev || d.completed[d.active.eventId]) {
        d.active = null;
      } else {
        if (d.active.phase === 'dispense') d.active.phase = 'talk';
        if (PHASES.indexOf(d.active.phase) < 0) d.active.phase = 'talk';
        if (!Array.isArray(d.active.asked)) d.active.asked = [];

        if (d.active.medicine) {
          const med = EP.getMedicine(d.active.medicine);
          if (!med) d.active.medicine = null;
        }
        if (d.active.draft) {
          const draft = EP.getMedicine(d.active.draft);
          if (!draft) d.active.draft = null;
        }
        if ((d.active.phase === 'handover' || d.active.phase === 'departure') && !d.active.medicine) {
          d.active.phase = 'talk';
        }
        if (d.active.locked && !findQuestion(ev, d.active.reactionQuestion)) {
          d.active.locked = false;
          d.active.reactionQuestion = null;
        }
        d.active.view = normalizeView(saved.active ? saved.active.view : null, d.active, ev, saved.v);
      }
    }

    if (!d.active && !d.flags.started) d.queueIndex = 0;

    Object.keys(d.letters).forEach(function (id) {
      const l = d.letters[id];
      if (!l || typeof l !== 'object') return;
      l.unlocked = !!l.unlocked;
      l.read = !!l.read;
      if (EP.MEMORY_STATES.indexOf(l.memoryState) < 0) l.memoryState = 'unmarked';
    });

    d.pending = d.pending.filter(function (id) {
      return !!EP.getLetter(id);
    });

    return d;
  }

  function save() {
    if (EP.previewMode) return;
    EP.storage.save(data);
  }

  function emit(reason) {
    save();
    listeners.forEach(function (fn) {
      try {
        fn(reason, data);
      } catch (err) {
        if (window.console) console.error(err);
      }
    });
  }

  function ensureLetter(id) {
    if (!data.letters[id]) {
      data.letters[id] = { unlocked: false, read: false, memoryState: 'unmarked' };
    }
    return data.letters[id];
  }

  function currentEvent() {
    return data && data.active ? EP.getEvent(data.active.eventId) : null;
  }

  function nextEvent() {
    if (!data) return null;
    return EP.getEvent(EP.eventQueue()[data.queueIndex]) || null;
  }

  function deliverPending() {
    const delivered = [];
    data.pending.forEach(function (id) {
      if (!EP.getLetter(id)) return;
      const letter = ensureLetter(id);
      if (!letter.unlocked) {
        letter.unlocked = true;
        delivered.push(id);
      }
    });
    data.pending = [];
    return delivered;
  }

  function viewInfo() {
    const ev = currentEvent();
    const active = data ? data.active : null;
    if (!ev || !active) {
      return { beats: [], shown: 0, total: 0, done: true, kind: null, questionId: null };
    }
    const beats = beatsFor(ev, active);
    const total = beats.length;
    const shown = Math.min(total, Math.max(0, active.view ? active.view.shown : 0));
    return {
      beats: beats,
      shown: shown,
      total: total,
      done: shown >= total,
      kind: active.view ? active.view.kind : null,
      questionId: active.view ? active.view.questionId : null
    };
  }

  const state = {
    init: function () {
      const saved = EP.storage.load();
      data = normalize(saved) || initial();
      save();
      return data;
    },

    get: function () {
      return data;
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },

    touch: function (reason) {
      emit(reason || 'touch');
    },

    currentEvent: currentEvent,
    nextEvent: nextEvent,
    findQuestion: findQuestion,

    isFresh: function () {
      return !!data && !data.flags.started && data.queueIndex === 0 && !data.active;
    },

    isFinished: function () {
      return !!data && (data.flags.finished || (data.queueIndex >= EP.eventQueue().length && !data.active));
    },

    hasActive: function () {
      return !!(data && data.active);
    },

    /* 兼容旧调用：现在只要店里有客人，就可以随时进入配药界面。 */
    canDispense: function () {
      return !!(data && data.active);
    },

    canAsk: function () {
      return !!(data && data.active && data.active.phase === 'talk' && !data.active.locked);
    },

    speakPhase: function () {
      return data && data.active ? data.active.phase : null;
    },

    dialogueView: viewInfo,

    advanceDialogue: function () {
      if (!data || !data.active) return viewInfo();
      const view = viewInfo();
      if (view.done) return view;
      data.active.view.shown = view.shown + 1;
      if (data.active.view.kind === 'opening' && data.active.view.shown >= view.total) {
        data.active.phase = 'talk';
      }
      emit('dialogue');
      return viewInfo();
    },

    beginNext: function () {
      if (!data || data.active) return null;
      const queue = EP.eventQueue();
      const eventId = queue[data.queueIndex];
      if (!eventId) return null;
      const ev = EP.getEvent(eventId);
      const delivered = deliverPending();
      const openingTotal = ev ? ev.opening.length : 0;
      data.active = {
        eventId: eventId,
        phase: openingTotal <= 1 ? 'talk' : 'opening',
        asked: [],
        reaction: null,
        reactionQuestion: null,
        locked: false,
        apologised: false,
        medicine: null,
        draft: null,
        view: {
          kind: openingTotal > 0 ? 'opening' : 'talkPrompt',
          questionId: null,
          shown: openingTotal > 0 ? 1 : 0
        }
      };
      data.queueIndex += 1;
      data.flags.started = true;
      data.screen = 'customer';
      emit('begin');
      return { eventId: eventId, delivered: delivered };
    },

    ask: function (questionId) {
      if (!data || !data.active || data.active.phase !== 'talk' || data.active.locked) return null;
      const view = viewInfo();
      if (!view.done) return null;
      const ev = currentEvent();
      if (!ev) return null;
      const q = findQuestion(ev, questionId);
      if (!q) return null;

      const already = data.active.asked.indexOf(questionId) >= 0;
      if (!already) {
        data.active.asked.push(questionId);
        data.active.reaction = q.reaction;
      }

      const closes = (q.reaction === 'anger' || q.reaction === 'silence') && !already;
      if (closes) {
        data.active.locked = true;
        data.active.reactionQuestion = questionId;
        data.active.apologised = false;
      }

      data.active.view = {
        kind: closes ? 'reaction' : 'question',
        questionId: questionId,
        shown: 1
      };
      emit('ask');
      return q;
    },

    apologise: function () {
      if (!data || !data.active) return false;
      const a = data.active;
      if (!a.locked || !a.reactionQuestion) return false;
      if (!viewInfo().done) return false;
      const q = findQuestion(currentEvent(), a.reactionQuestion);
      if (!q || q.reaction === 'silence') return false;
      a.apologised = true;
      a.locked = false;
      a.view = { kind: 'recovery', questionId: a.reactionQuestion, shown: 1 };
      emit('apologise');
      return true;
    },

    selectMedicine: function (medicineId) {
      if (!data || !data.active) return false;
      if (!EP.getMedicine(medicineId)) return false;
      if (data.active.phase !== 'opening' && data.active.phase !== 'talk') return false;
      data.active.draft = medicineId;
      emit('draft');
      return true;
    },

    draftMedicine: function () {
      return data && data.active ? data.active.draft : null;
    },

    giveMedicine: function (medicineId) {
      if (!data || !data.active) return false;
      if (data.active.phase !== 'opening' && data.active.phase !== 'talk') return false;
      const med = medicineId || data.active.draft;
      if (!med || !EP.getMedicine(med)) return false;
      data.active.draft = med;
      data.active.medicine = med;
      data.active.phase = 'handover';
      data.active.view = { kind: 'handover', questionId: null, shown: 1 };
      data.screen = 'medicine';
      emit('medicine');
      return true;
    },

    toDeparture: function () {
      if (!data || !data.active || data.active.phase !== 'handover') return false;
      const view = viewInfo();
      if (!view.done) return false;
      data.active.phase = 'departure';
      data.active.view = { kind: 'departure', questionId: null, shown: 1 };
      data.screen = 'medicine';
      emit('departure');
      return true;
    },

    complete: function () {
      if (!data || !data.active || !data.active.medicine) return null;
      if (data.active.phase !== 'departure') return null;
      const view = viewInfo();
      if (!view.done) return null;

      const ev = currentEvent();
      const a = data.active;
      data.completed[ev.id] = {
        medicine: a.medicine,
        asked: a.asked.slice(),
        reaction: a.reaction,
        apologised: a.apologised,
        earlyTalk: a.asked.length === 0
      };
      data.pending.push(ev.letterId);
      data.active = null;

      const finished = data.queueIndex >= EP.eventQueue().length;
      let delivered = [];
      if (finished) {
        data.flags.finished = true;
        data.flags.endingSeen = false;
        delivered = deliverPending();
      }
      data.screen = 'customer';
      emit('complete');
      return { eventId: ev.id, letterId: ev.letterId, finished: finished, delivered: delivered };
    },

    go: function (screen) {
      if (!data) return false;
      if (SCREENS.indexOf(screen) < 0) return false;
      data.screen = screen;
      emit('screen');
      return true;
    },

    screen: function () {
      return data ? data.screen : 'customer';
    },

    letterInfo: function (letterId) {
      const l = data && data.letters[letterId];
      return l || { unlocked: false, read: false, memoryState: 'unmarked' };
    },

    /* 取出这封信“按当时所配的药”写成的样子。
     * 已完成的事件看存档里的 medicine；正在进行的来访先看已交的药和预选，
     * 这样交药之后立刻打开档案也不会看到另一篇。
     */
    letterView: function (letterId) {
      const letter = EP.getLetter(letterId);
      if (!letter) return null;
      const done = data && data.completed ? data.completed[letter.eventId] : null;
      let medId = done && done.medicine ? done.medicine : null;
      if (!medId && data && data.active && data.active.eventId === letter.eventId) {
        medId = data.active.medicine || data.active.draft;
      }
      return EP.letterFor(letterId, medId);
    },

    ensureLetter: ensureLetter,

    readLetter: function (letterId) {
      const info = state.letterInfo(letterId);
      if (!info.unlocked) return false;
      if (!info.read) {
        info.read = true;
        emit('letter-read');
      }
      return true;
    },

    setMemory: function (letterId, memoryState) {
      if (EP.MEMORY_STATES.indexOf(memoryState) < 0) return { ok: false, closing: false };
      const info = state.letterInfo(letterId);
      if (!info.unlocked) return { ok: false, closing: false };
      const previous = info.memoryState;
      info.memoryState = memoryState;

      let closing = false;
      if (
        letterId === 'letter_001' &&
        previous === 'deferred' &&
        memoryState === 'remembered' &&
        data.flags.finished &&
        !data.flags.closingShown
      ) {
        data.flags.closingShown = true;
        closing = true;
      }
      emit('memory');
      return { ok: true, closing: closing };
    },

    markEndingSeen: function () {
      if (!data) return;
      if (!data.flags.endingSeen) {
        data.flags.endingSeen = true;
        emit('ending-seen');
      }
    },

    progress: function () {
      if (!data) {
        return { completed: 0, total: 0, unread: 0, remembered: 0, deferred: 0, received: 0 };
      }
      const total = EP.eventQueue().length;
      let unread = 0;
      let remembered = 0;
      let deferred = 0;
      let received = 0;
      EP.letterQueue().forEach(function (id) {
        const info = state.letterInfo(id);
        if (!info.unlocked) return;
        received += 1;
        if (!info.read) unread += 1;
        if (info.memoryState === 'remembered') remembered += 1;
        if (info.memoryState === 'deferred') deferred += 1;
      });
      return {
        completed: Object.keys(data.completed).length,
        total: total,
        unread: unread,
        remembered: remembered,
        deferred: deferred,
        received: received
      };
    },

    unreadLetters: function () {
      return EP.letterQueue().filter(function (id) {
        const info = state.letterInfo(id);
        return info.unlocked && !info.read;
      });
    },

    deferredLetters: function () {
      return EP.letterQueue().filter(function (id) {
        return state.letterInfo(id).memoryState === 'deferred';
      });
    },

    deliveredLetters: function () {
      return EP.letterQueue().filter(function (id) {
        return state.letterInfo(id).unlocked;
      });
    },

    pendingLetters: function () {
      return data ? data.pending.slice() : [];
    },

    restart: function () {
      if (!EP.previewMode) EP.storage.clear();
      data = initial();
      emit('restart');
      return data;
    },

    /* 仅用于开发预览：换掉内存中的状态，不写入存档。 */
    previewReset: function () {
      data = initial();
      return data;
    }
  };

  EP.state = state;
})();
