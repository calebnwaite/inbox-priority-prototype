/* Concept B: four-direction swipe organizer. Up = Forward, Left = Delete, Right = Reply, Down = Save. */
Mobile.screens.organize = {
  swiper: null,

  queue() {
    const s = State.get();
    return DATA.organizeQueue.filter((id) => !s.organized[id] && !s.handled[id]);
  },

  render() {
    const queue = Mobile.screens.organize.queue();
    if (!queue.length) {
      return `${Mobile.header('Organize', { eyebrow: 'ALL DONE' })}<div class="m-scroll"><div class="done-card"><div class="done-icon">✓</div><h2>Inbox sorted</h2><p class="muted">Every card was forwarded, answered, saved or deleted.</p>
        <button class="btn" data-act="organize-restart">Sort again</button></div></div>`;
    }
    const email = Domain.email(queue[0]);
    return `${Mobile.header('Organize', { eyebrow: `${queue.length} LEFT TO SORT` })}
      <div class="m-scroll no-pad">
        <div class="swipe-stage four-way" id="organize-stage">
          <div class="cue cue-up">▲ FORWARD</div><div class="cue cue-left">DELETE</div><div class="cue cue-right">REPLY</div><div class="cue cue-down">▼ SAVE</div>
          <div class="swipe-card top" id="organize-card">
            <div class="swipe-meta"><span>${U.esc(email.from)}</span><span>${U.esc(email.time)}</span></div>
            <h2>${U.esc(email.subject)}</h2><p>${U.esc(Domain.snippet(email, 170))}</p></div>
        </div>
        <p class="swipe-hint">Read this card, then swipe.</p>
        <div class="dir-buttons">
          <button class="btn btn-small" data-act="organize-choose" data-dir="up">▲ Forward</button><button class="btn btn-small" data-act="organize-choose" data-dir="left">◀ Delete</button>
          <button class="btn btn-small" data-act="organize-choose" data-dir="right">Reply ▶</button><button class="btn btn-small" data-act="organize-choose" data-dir="down">▼ Save</button>
        </div>
      </div>`;
  },

  mount(root) {
    const card = U.$('#organize-card', root);
    if (!card) return;
    Mobile.screens.organize.swiper = Swipe.attach(card, U.$('#organize-stage', root), { dirs: ['up', 'down', 'left', 'right'], onCommit: Mobile.screens.organize.commit });
  },

  commit(dir, { restore }) {
    const email = Domain.email(Mobile.screens.organize.queue()[0]);
    const finishedOr = (result) => { if (result !== 'done') restore(); };
    if (dir === 'up') ForwardFlow.open(email.id, { onClose: finishedOr });
    else if (dir === 'right') DraftFlow.open({ emailId: email.id, text: email.draft || '', source: 'suggestion', onClose: finishedOr });
    else if (dir === 'left') { Domain.trash(email.id); U.toast('Deleted (simulated)', 'info'); }
    else { State.mutate((s) => { s.organized[email.id] = 'save'; }); Domain.save(email.id); U.toast('Saved to your folder', 'info'); }
  },

  install() {
    Actions.register({
      'organize-choose': (el) => Mobile.screens.organize.swiper.fling(el.dataset.dir),
      'organize-restart': () => State.mutate((s) => { s.organized = {}; DATA.organizeQueue.forEach((id) => { if (s.handled[id]?.type === 'trashed') delete s.handled[id]; }); }),
    });
  },
};
