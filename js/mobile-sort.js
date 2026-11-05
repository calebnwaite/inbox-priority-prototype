/* Concept C: swipe right = Priority, left = Later, with per-sender learning ("Always prioritize Corey?"). */
Mobile.screens.sort = {
  prompt: null,   // {sender, pref}

  queue() { return DATA.sortQueue.filter((id) => !State.get().sorted[id]); },

  card(email, cls) {
    return `<div class="swipe-card ${cls}" ${cls === 'top' ? 'id="sort-card"' : ''}>
      <div class="swipe-meta"><span>${U.esc(email.from)}</span><span>${U.esc(email.time)}</span></div>
      <h2>${U.esc(email.subject)}</h2><p>${U.esc(Domain.snippet(email, 190))}</p>
      <div class="swipe-org muted">${U.esc(email.org)}</div></div>`;
  },

  render() {
    const queue = Mobile.screens.sort.queue();
    const total = DATA.sortQueue.length;
    const s = State.get();
    const prompt = Mobile.screens.sort.prompt;
    const promptHtml = prompt ? `<div class="pref-prompt"><span>${prompt.pref === 'always' ? `Always prioritize <b>${U.esc(prompt.sender)}</b>?` : `Always send <b>${U.esc(prompt.sender)}</b> to Later?`}</span>
      <button class="btn btn-small btn-primary" data-act="sort-pref-yes">Yes</button><button class="btn btn-small" data-act="sort-pref-no">Not now</button></div>` : '';
    if (!queue.length) {
      return `${Mobile.header('Sort', { eyebrow: 'ALL DONE' })}<div class="m-scroll">${promptHtml}
        <div class="done-card"><div class="done-icon">✓</div><h2>All sorted</h2><p class="muted">Your desktop inbox reordered to match your swipes.</p>
        <div class="confidence"><div class="conf-head"><span>Sorting confidence</span><b>${s.confidence}%</b></div><div class="meter"><span style="width:${s.confidence}%"></span></div>
        <div class="muted small">${U.esc(s.lastLearned || 'Gets smarter with every swipe.')}</div></div>
        <div class="btn-row two"><button class="btn btn-primary" data-act="m-go" data-to="desktop">See desktop inbox</button><button class="btn" data-act="sort-restart">Sort again</button></div></div></div>`;
    }
    const [top, next] = queue.map(Domain.email);
    return `${Mobile.header('Sort', { eyebrow: `${queue.length} LEFT TO SORT`, right: `<span class="pill">${total - queue.length} of ${total}</span>` })}
      <div class="m-scroll no-pad">${promptHtml}
        <div class="swipe-stage two-way" id="sort-stage">
          <div class="cue cue-left">◀ LATER</div><div class="cue cue-right">PRIORITY ▶</div>
          ${next ? Mobile.screens.sort.card(next, 'under') : ''}${Mobile.screens.sort.card(top, 'top')}
        </div>
        <p class="swipe-hint">Swipe the card, or use the buttons</p>
      </div>
      <div class="m-bottom-action btn-row two"><button class="btn big" data-act="sort-choose" data-dir="later">◀ Later</button><button class="btn btn-accent big" data-act="sort-choose" data-dir="priority">Priority ▶</button></div>`;
  },

  mount(root) {
    const card = U.$('#sort-card', root);
    if (!card) return;
    const email = Domain.email(Mobile.screens.sort.queue()[0]);
    Mobile.screens.sort.swiper = Swipe.attach(card, U.$('#sort-stage', root), {
      dirs: ['left', 'right'],
      onCommit: (dir) => Mobile.screens.sort.decide(email, dir === 'right' ? 'priority' : 'later'),
    });
  },

  decide(email, dir) {
    const screen = Mobile.screens.sort;
    const known = State.get().senderPrefs[email.from];
    screen.prompt = known ? null : { sender: email.from, pref: dir === 'priority' ? 'always' : 'later' };
    Domain.sortDecision(email.id, dir);
    U.toast(dir === 'priority' ? 'Marked Priority' : 'Moved to Later', 'info');
  },

  install() {
    Actions.register({
      'sort-choose': (el) => Mobile.screens.sort.swiper.fling(el.dataset.dir === 'priority' ? 'right' : 'left'),
      'sort-pref-yes': () => {
        const screen = Mobile.screens.sort;
        const { sender, pref } = screen.prompt;
        screen.prompt = null;
        const changed = Domain.applySenderPref(sender, pref);
        U.toast(`Got it. ${sender} will be ${pref === 'always' ? 'prioritized' : 'deferred'} from now on${changed ? ` (${changed} email${changed === 1 ? '' : 's'} updated)` : ''}.`);
      },
      'sort-pref-no': () => { Mobile.screens.sort.prompt = null; Mobile.update(); },
      'sort-restart': () => { Mobile.screens.sort.prompt = null; State.mutate((s) => { s.sorted = {}; }); },
    });
  },
};
