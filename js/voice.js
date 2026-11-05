/* Voice: animated waveform, text-to-speech, dictation. Uses real browser APIs when allowed, otherwise a simulation. */
const Waveform = {
  html(bars = 28) { return `<div class="waveform" aria-hidden="true">${'<i></i>'.repeat(bars)}</div>`; },
  /** Animate the bars inside root; returns a stop function. */
  animate(root, level = 1) {
    const bars = U.$$('.waveform i', root);
    const timer = setInterval(() => bars.forEach((bar, i) => {
      bar.style.height = `${8 + Math.abs(Math.sin(Date.now() / 160 + i)) * 40 * level * (0.4 + Math.random() * 0.6)}px`;
    }), 90);
    return () => { clearInterval(timer); bars.forEach((bar) => { bar.style.height = ''; }); };
  },
};

const Voice = {
  speechRecognitionClass() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; },

  /** Read text aloud. Falls back to a timed simulation. Returns a cancel function. */
  speak(text, onEnd = () => {}) {
    let finished = false;
    let fallbackTimer = null;
    const finish = () => { if (!finished) { finished = true; clearTimeout(fallbackTimer); onEnd(); } };
    const simulate = (why, error) => {
      U.warn(`Speech synthesis unavailable (${why}); simulating reading.`, error);
      fallbackTimer = setTimeout(finish, Math.min(9000, 1500 + text.length * 55));
    };
    try {
      if (!('speechSynthesis' in window)) { simulate('not supported'); }
      else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = finish;
        utterance.onerror = (event) => { simulate(`error: ${event.error}`); };
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) { simulate('exception', error); }
    return () => { finished = true; clearTimeout(fallbackTimer); try { window.speechSynthesis?.cancel(); } catch (error) { U.warn('Could not cancel speech.', error); } };
  },

  /**
   * Dictate. handlers: onText(text) while typing, onDone(text) when finished.
   * `fakeText` is what the simulation "hears". Returns {stop()}.
   */
  dictate(fakeText, { onText, onDone, useReal }) {
    let stopped = false;
    let simTimer = null;
    let recognition = null;
    let heard = '';

    const finish = (text) => { if (stopped) return; stopped = true; clearInterval(simTimer); onDone(text); };
    const simulate = () => {
      const words = fakeText.split(' ');
      let count = 0;
      simTimer = setInterval(() => {
        count += 1;
        heard = words.slice(0, count).join(' ');
        onText(heard);
        if (count >= words.length) finish(heard);
      }, 170);
    };

    const SR = Voice.speechRecognitionClass();
    if (useReal && SR) {
      try {
        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event) => { heard = Array.from(event.results).map((r) => r[0].transcript).join(' ').trim(); onText(heard); };
        recognition.onerror = (event) => {
          U.warn(`Speech recognition failed (${event.error}); using the simulated transcript instead.`);
          U.toast('Mic not available here, so I used a sample voice reply.', 'info');
          recognition = null; heard = ''; simulate();
        };
        recognition.onend = () => { if (recognition && !stopped) { if (heard) finish(heard); else { recognition = null; simulate(); } } };
        recognition.start();
      } catch (error) {
        U.warn('Could not start speech recognition; using the simulated transcript.', error);
        recognition = null; simulate();
      }
    } else {
      if (useReal && !SR) U.warn('SpeechRecognition is not supported in this browser; using the simulated transcript.');
      simulate();
    }
    return {
      stop() {
        if (recognition) { try { recognition.stop(); } catch (error) { U.warn('Could not stop recognition.', error); } if (heard) finish(heard); }
        else finish(heard);
      },
      cancel() { stopped = true; clearInterval(simTimer); try { recognition?.abort(); } catch (error) { U.warn('Could not abort recognition.', error); } },
    };
  },
};

/** The voice-reply sheet: tap mic, waveform + transcript, then the normal approve/edit draft flow. */
const VoiceReply = {
  ctx: null,

  open(emailId) {
    const email = Domain.email(emailId);
    if (!email) { U.fail('That email could not be found.', new Error(`unknown email ${emailId}`)); return; }
    VoiceReply.cleanup();
    VoiceReply.ctx = { emailId, state: 'idle', transcript: '' };
    const realSupported = Boolean(Voice.speechRecognitionClass());
    Overlay.show(`
      <div class="sheet-head"><b>Voice reply to ${U.esc(U.first(email.from))}</b><button class="icon-btn" data-act="overlay-close" aria-label="Close">×</button></div>
      <div class="sheet-meta">${U.esc(email.subject)}</div>
      <div class="voice-stage" id="voice-stage">
        ${Waveform.html(30)}
        <button class="mic-btn" id="mic-btn" data-act="voice-toggle" aria-label="Start recording">🎙</button>
        <div class="voice-state" id="voice-state">Tap the mic and speak your reply</div>
        <div class="transcript" id="voice-transcript" aria-live="polite"></div>
      </div>
      <label class="check-row"><input type="checkbox" id="real-mic" ${State.get().useRealMic && realSupported ? 'checked' : ''} ${realSupported ? '' : 'disabled'} data-act="voice-realmic">
        <span>Use my real microphone${realSupported ? '' : ' (not supported in this browser, so a sample reply is used)'}</span></label>
      <p class="fine">You'll review the written reply before anything is sent.</p>`, { onClose: VoiceReply.cleanup });
  },

  setState(state, message) {
    const ctx = VoiceReply.ctx;
    ctx.state = state;
    U.$('#voice-state').textContent = message;
    U.$('#voice-stage').classList.toggle('listening', state === 'listening');
    const mic = U.$('#mic-btn');
    mic.textContent = state === 'listening' ? '■' : '🎙';
    mic.setAttribute('aria-label', state === 'listening' ? 'Stop recording' : 'Start recording');
  },

  start() {
    const ctx = VoiceReply.ctx;
    const email = Domain.email(ctx.emailId);
    VoiceReply.setState('listening', 'Listening…');
    ctx.stopWave = Waveform.animate(U.$('#voice-stage'));
    ctx.dictation = Voice.dictate(email.voice || 'Thanks, I will get back to you today.', {
      useReal: State.get().useRealMic,
      onText: (text) => { ctx.transcript = text; const box = U.$('#voice-transcript'); if (box) box.textContent = text; },
      onDone: (text) => VoiceReply.finish(text),
    });
  },

  finish(text) {
    const ctx = VoiceReply.ctx;
    if (!ctx) return;
    VoiceReply.stopMedia();
    if (!text) { VoiceReply.setState('idle', 'I did not catch anything. Tap the mic to try again.'); return; }
    VoiceReply.setState('done', 'Got it. Preparing your draft…');
    const { emailId } = ctx;
    setTimeout(() => {
      if (!VoiceReply.ctx || VoiceReply.ctx.emailId !== emailId) return;
      VoiceReply.ctx = null;
      DraftFlow.open({ emailId, text: `${text.replace(/[.!?]*$/, '')}. Thanks, Jeff`, source: 'voice', transcript: text });
    }, 700);
  },

  stopMedia() {
    const ctx = VoiceReply.ctx;
    if (!ctx) return;
    ctx.stopWave?.(); ctx.stopWave = null;
  },

  cleanup() {
    const ctx = VoiceReply.ctx;
    if (!ctx) return;
    VoiceReply.stopMedia();
    ctx.dictation?.cancel();
    VoiceReply.ctx = null;
  },

  install() {
    Actions.register({
      'open-voice': (el) => VoiceReply.open(el.dataset.id),
      'voice-toggle': () => {
        const ctx = VoiceReply.ctx;
        if (ctx.state === 'listening') ctx.dictation.stop(); else VoiceReply.start();
      },
      'voice-realmic': (el) => State.mutate((s) => { s.useRealMic = el.checked; }),
    });
  },
};
