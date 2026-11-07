/* 启动、流程收尾与开发预览。 */
(function () {
  const EP = window.EP;
  const params = new URLSearchParams(window.location.search);
  const preview = params.has('preview') ? params.get('preview') || 'idle' : null;
  EP.previewMode = !!preview;

  function startNext() {
    const result = EP.state.beginNext();
    if (!result) return;
    EP.customer.reset();
    EP.medicine.reset();
    EP.router.paint();
    if (result.delivered.length) {
      EP.ui.toast('档案里多了一封信。');
    }
  }

  function finishEvent() {
    const result = EP.state.complete();
    if (!result) return;
    EP.customer.reset();
    EP.medicine.reset();
    EP.router.paint();
    if (result.finished) {
      setTimeout(function () {
        EP.ending.show();
      }, 350);
    } else {
      EP.ui.toast('客人推门离开了。信件会在下一位顾客到来时送到。');
    }
  }

  function confirmRestart() {
    EP.ui.confirm({
      kicker: '重新开始',
      title: '从头再来一次？',
      text: '这会清除现有的来访进度、已经收到的信件，以及你对每封信的记忆选择。',
      okLabel: '重新开始',
      cancelLabel: '再想想',
      onOk: function () {
        EP.state.restart();
        EP.customer.reset();
        EP.medicine.reset();
        EP.router.go('customer');
        EP.ui.toast('药店重新开门了。');
      }
    });
  }

  function refresh() {
    EP.router.paint();
  }

  /* ---------- 仅用于本地预览的假进度 ---------- */

  function finishOpening() {
    let guard = 0;
    while (EP.state.speakPhase() === 'opening' && guard < 200) {
      EP.state.advanceDialogue();
      guard += 1;
    }
  }

  function finishView() {
    let guard = 0;
    while (!EP.state.dialogueView().done && guard < 300) {
      EP.state.advanceDialogue();
      guard += 1;
    }
  }

  function simulate(count) {
    const order = EP.registry.medicineOrder;
    for (let i = 0; i < count; i += 1) {
      if (!EP.state.beginNext()) break;
      finishOpening();
      const ev = EP.state.currentEvent();
      if (ev && ev.questions[0]) {
        EP.state.ask(ev.questions[0].id);
        finishView();
      }
      EP.state.giveMedicine(order[i % order.length]);
      finishView();
      EP.state.toDeparture();
      finishView();
      EP.state.complete();
    }
  }

  function prepareArchive() {
    simulate(5);
    const l1 = EP.state.letterInfo('letter_001');
    const l2 = EP.state.letterInfo('letter_002');
    const l3 = EP.state.letterInfo('letter_003');
    EP.state.readLetter('letter_001');
    EP.state.readLetter('letter_002');
    EP.state.readLetter('letter_003');
    l1.memoryState = 'remembered';
    l2.memoryState = 'deferred';
    l3.memoryState = 'remembered';
    EP.state.get().screen = 'archive';
  }

  function previewSetup(mode) {
    EP.state.previewReset();
    EP.customer.reset();
    EP.medicine.reset();

    if (mode === 'opening') {
      EP.state.beginNext();
    } else if (mode === 'talk') {
      EP.state.beginNext();
      finishOpening();
      EP.state.ask('q_fear');
      finishView();
    } else if (mode === 'reaction') {
      EP.state.beginNext();
      finishOpening();
      EP.state.ask('q_sharp');
      finishView();
    } else if (mode === 'dispense' || mode === 'given' || mode === 'departure') {
      EP.state.beginNext();
      finishOpening();
      EP.state.ask('q_fear');
      finishView();
      EP.state.selectMedicine('believe');
      if (mode !== 'dispense') {
        EP.state.giveMedicine('believe');
        if (mode === 'departure') {
          finishView();
          EP.state.toDeparture();
        }
      } else {
        EP.state.get().screen = 'medicine';
      }
    } else if (mode === 'archive') {
      prepareArchive();
    } else if (mode === 'letter') {
      prepareArchive();
    } else if (mode === 'letter-deferred') {
      simulate(5);
      EP.state.get().letters.letter_001.memoryState = 'deferred';
      EP.state.get().screen = 'archive';
    } else if (mode === 'closing') {
      simulate(10);
      EP.state.get().letters.letter_001.memoryState = 'deferred';
      EP.state.get().screen = 'archive';
    } else if (mode === 'ending') {
      simulate(10);
      EP.state.get().letters.letter_001.memoryState = 'deferred';
      EP.state.get().letters.letter_003.memoryState = 'deferred';
    }

    EP.router.paint();

    if (mode === 'letter') {
      setTimeout(function () {
        EP.archive.openLetter('letter_004');
      }, 250);
    }
    if (mode === 'letter-deferred') {
      setTimeout(function () {
        EP.archive.openLetter('letter_001');
      }, 250);
    }
    if (mode === 'closing') {
      setTimeout(function () {
        EP.archive.openLetter('letter_001');
      }, 250);
    }
    if (mode === 'ending') {
      setTimeout(function () {
        EP.ending.show();
      }, 300);
    }
    if (mode === 'profile') {
      EP.state.beginNext();
      finishOpening();
      EP.router.paint();
      const ch = EP.getCharacter(EP.state.currentEvent().characterId);
      setTimeout(function () {
        EP.customer.openProfile(ch);
      }, 250);
    }
  }

  function boot() {
    EP.state.init();
    EP.router.init();
    EP.state.subscribe(function () {
      EP.router.updateChrome();
    });

    if (preview) {
      previewSetup(preview);
      return;
    }

    const st = EP.state.get();
    if (st.flags.finished && !st.flags.endingSeen) {
      setTimeout(function () {
        EP.ending.show();
      }, 500);
    }
  }

  EP.app = {
    startNext: startNext,
    finishEvent: finishEvent,
    confirmRestart: confirmRestart,
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
