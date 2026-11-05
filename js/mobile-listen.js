/* Concept B: hands-free voice inbox. "Now reading", waveform, Skip/Next, tap to reply by voice. */
Mobile.screens.listen = {
  dark: true,
  index: 0,
  stopSpeech: null,
  stopWave: null,

  queue() {
    const priority = Domain.priorityIds();
    const others = Domain.otherIds().filter((id) => !DATA.byId[id].noise && !State.get().handled[id] && !priority.includes(id));
    return [...priority, ...others].slice(0, 9);
  },

  spokenText(email) { return `${email.from}. ${email.headline || email.subject}. ${Domain.snippet(email, 160)}`; },

  render() {
    const screen = Mobile.screens.listen;
    const queue = screen.queue();
    if (!queue.length) return `${Mobile.header('All caught up', { eyebrow: 'VOICE INBOX' })}<div class="m-scroll"><p class="muted">Nothing left to listen to.</p></div>`;
    screen.index = Math.min(screen.index, queue.length - 1);
    const email = Domain.email(queue[screen.index]);
    return `${Mobile.header('Listen', { eyebrow: 'VOICE INBOX', right: `<span class="count-pill">${screen.index + 1} of ${queue.length}</span>` })}
      <div class="listen-body">
        <div class="muted-light">Now reading</div>
        <h1 class="listen-title">${U.esc(U.first(email.from))}: ${U.esc(email.headline || email.subject)}</h1>
        <p class="listen-text">${U.esc(Domain.snippet(email, 150))}</p>
        <div class="listen-wave" id="listen-wave">${Waveform.html(26)}</div>
        <button class="btn btn-soft-dark" data-act="listen-play" id="listen-play">▶ Read aloud</button>
        <button class="mic-btn big-mic" data-act="open-voice" data-id="${email.id}" aria-label="Say your reply">🎙</button>
        <div class="listen-hint">Say your reply</div>
      </div>
      <div class="m-bottom-action btn-row two dark-actions"><button class="btn btn-outline-light" data-act="listen-step" data-by="-1">Skip back</button><button class="btn btn-outline-light" data-act="listen-step" data-by="1">Next</button></div>`;
  },

  stop() {
    const screen = Mobile.screens.listen;
    screen.stopSpeech?.(); screen.stopSpeech = null;
    screen.stopWave?.(); screen.stopWave = null;
  },
  cleanup() { Mobile.screens.listen.stop(); },

  play() {
    const screen = Mobile.screens.listen;
    const button = U.$('#listen-play');
    if (screen.stopSpeech) { screen.stop(); button.textContent = '▶ Read aloud'; return; }
    const email = Domain.email(screen.queue()[screen.index]);
    button.textContent = '■ Stop';
    screen.stopWave = Waveform.animate(U.$('#listen-wave'), 1.1);
    screen.stopSpeech = Voice.speak(screen.spokenText(email), () => {
      screen.stop();
      const again = U.$('#listen-play');
      if (again) again.textContent = '▶ Read aloud';
    });
  },

  install() {
    const screen = Mobile.screens.listen;
    Actions.register({
      'listen-play': () => screen.play(),
      'listen-step': (el) => {
        screen.stop();
        const size = screen.queue().length;
        screen.index = (screen.index + Number(el.dataset.by) + size) % size;
        Mobile.update();
      },
    });
  },
};
