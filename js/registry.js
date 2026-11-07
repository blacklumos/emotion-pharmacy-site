/* 全局命名空间与数据注册表。
 * 数据文件只负责调用 EP.defineXxx 注册内容，不接触任何界面代码。
 */
(function () {
  const EP = (window.EP = window.EP || {});

  const BEAT_TYPES = { n: 'narration', c: 'customer', o: 'owner' };
  const REACTIONS = ['normal', 'uneasy', 'evade', 'anger', 'silence', 'defensive'];
  const MEMORY_STATES = ['unmarked', 'deferred', 'remembered'];

  const reg = (EP.registry = {
    characters: {},
    medicines: {},
    medicineOrder: [],
    events: {},
    letters: {},
    queue: []
  });

  function beats(list) {
    return (list || []).map(function (b) {
      if (Array.isArray(b)) {
        const type = BEAT_TYPES[b[0]];
        return { type: type || 'narration', text: String(b[1] == null ? '' : b[1]) };
      }
      return { type: b.type || 'narration', text: String(b.text == null ? '' : b.text) };
    });
  }

  function normalizeQuestion(q) {
    return {
      id: q.id,
      text: q.text,
      kind: q.kind === 'sharp' ? 'sharp' : 'deep',
      reaction: REACTIONS.indexOf(q.reaction) >= 0 ? q.reaction : 'normal',
      beats: beats(q.beats),
      recovery: beats(q.recovery),
      lockNote: q.lockNote || ''
    };
  }

  EP.defineMedicines = function (list) {
    list.forEach(function (m) {
      reg.medicines[m.id] = m;
      if (reg.medicineOrder.indexOf(m.id) < 0) reg.medicineOrder.push(m.id);
    });
  };

  EP.defineCharacters = function (list) {
    list.forEach(function (c) {
      reg.characters[c.id] = c;
    });
  };

  EP.defineEvents = function (list) {
    list.forEach(function (e) {
      const responses = {};
      Object.keys(e.medicineResponses || {}).forEach(function (key) {
        responses[key] = { beats: beats(e.medicineResponses[key].beats || e.medicineResponses[key]) };
      });
      reg.events[e.id] = {
        id: e.id,
        characterId: e.characterId,
        order: e.order,
        title: e.title,
        visitLabel: e.visitLabel || '',
        scene: e.scene || {},
        opening: beats(e.opening),
        talkPrompt: e.talkPrompt || '',
        handover: beats(e.handover),
        questions: (e.questions || []).map(normalizeQuestion),
        medicineResponses: responses,
        departure: beats(e.departure),
        letterId: e.letterId,
        freezeTalk: !!e.freezeTalk
      };
    });
  };

  /* 一封信按“当时配出的那味药”可以有不同写法。
   * variants 的键是药物 ID；顶层字段只作为兜底，正常情况下写 variants 就够了。
   */
  function normalizeVariant(v, fallback) {
    const source = v || {};
    return {
      title: source.title || fallback.title || '',
      salutation: source.salutation || fallback.salutation || '',
      lines: Array.isArray(source.lines) ? source.lines.slice() : (fallback.lines || []).slice(),
      signature: source.signature || fallback.signature || '',
      echoPrefix: source.echoPrefix || fallback.echoPrefix || ''
    };
  }

  EP.defineLetters = function (list) {
    list.forEach(function (l) {
      const variants = {};
      Object.keys(l.variants || {}).forEach(function (medId) {
        variants[medId] = normalizeVariant(l.variants[medId], l);
      });
      reg.letters[l.id] = {
        id: l.id,
        characterId: l.characterId,
        eventId: l.eventId,
        number: l.number,
        title: l.title || '',
        salutation: l.salutation || '',
        lines: (l.lines || []).slice(),
        signature: l.signature || '',
        echoPrefix: l.echoPrefix || '',
        variants: variants,
        variantOrder: Object.keys(variants),
        callback: l.callback || null
      };
    });
  };

  /* 按药物取出这封信的写法；没有对应写法时退回第一种，避免界面出现空信。 */
  EP.letterFor = function (letterId, medicineId) {
    const l = reg.letters[letterId];
    if (!l) return null;
    const medId = medicineId && l.variants[medicineId] ? medicineId : l.variantOrder[0];
    const v = medId ? l.variants[medId] : null;
    const base = {
      id: l.id,
      characterId: l.characterId,
      eventId: l.eventId,
      number: l.number,
      title: l.title,
      salutation: l.salutation,
      lines: l.lines.slice(),
      signature: l.signature,
      echoPrefix: l.echoPrefix,
      callback: l.callback,
      medicineId: medId || null
    };
    if (!v) return base;
    return {
      id: l.id,
      characterId: l.characterId,
      eventId: l.eventId,
      number: l.number,
      title: v.title || l.title,
      salutation: v.salutation || l.salutation,
      lines: v.lines.length ? v.lines.slice() : l.lines.slice(),
      signature: v.signature || l.signature,
      echoPrefix: v.echoPrefix || l.echoPrefix,
      callback: l.callback,
      medicineId: medId
    };
  };

  EP.setEventQueue = function (ids) {
    reg.queue = ids.slice();
  };

  EP.getCharacter = function (id) {
    return reg.characters[id] || null;
  };

  EP.getEvent = function (id) {
    return reg.events[id] || null;
  };

  EP.getLetter = function (id) {
    return reg.letters[id] || null;
  };

  EP.getMedicine = function (id) {
    return reg.medicines[id] || null;
  };

  EP.medicines = function () {
    return reg.medicineOrder.map(function (id) {
      return reg.medicines[id];
    });
  };

  EP.eventQueue = function () {
    return reg.queue.slice();
  };

  EP.letterQueue = function () {
    return reg.queue.map(function (id) {
      return reg.events[id] && reg.events[id].letterId;
    }).filter(Boolean);
  };

  EP.letterNumber = function (letterId) {
    return EP.letterQueue().indexOf(letterId) + 1;
  };

  EP.eventNumber = function (eventId) {
    return reg.queue.indexOf(eventId) + 1;
  };

  EP.isLastEvent = function (eventId) {
    return reg.queue[reg.queue.length - 1] === eventId;
  };

  EP.MEMORY_STATES = MEMORY_STATES;
  EP.REACTIONS = REACTIONS;
  EP.PLAYER_APOLOGY = '抱歉，是我问得太急了。';
})();
