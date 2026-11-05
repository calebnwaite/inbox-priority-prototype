/* Gmail-style phone inbox: search pill, the extension's ranked Priority section, then everything else, and Compose. */
Mobile.screens.inbox = {
  query: '',

  chips(email, rank) {
    const s = State.get();
    const live = Suggestions.live(email);
    if (!rank && !live) return '';
    const label = live ? email.suggest.label : 'Next steps';
    return `<div class="m-row-chips">
      <button class="m-chip m-chip-suggest" data-act="m-suggest-sheet" data-id="${email.id}"${rank === 1 ? ' data-tour="m-suggest"' : ''}><span class="m-chip-face">${Icon.svg('spark', 16)}${U.esc(label)}</span></button>
      ${rank ? `<button class="m-chip" data-act="open-remind" data-id="${email.id}"><span class="m-chip-face">${Icon.svg('alarm', 16)}${s.reminded[email.id] ? 'Reminded' : 'Remind'}</span></button>` : ''}
    </div>`;
  },

  row(email, rank = 0) {
    const s = State.get();
    const unread = email.unread && !s.read[email.id] && !s.handled[email.id];
    return `<article class="m-mail-row${unread ? ' unread' : ''}${rank ? ' ranked' : ''}" data-id="${email.id}">
      <button class="m-row-open" data-act="m-open-task" data-id="${email.id}" aria-label="${rank ? `Priority ${rank}. ` : ''}${U.esc(email.from)}: ${U.esc(email.subject)}"></button>
      <span class="m-row-avatar">${U.avatar(email.from, 40)}${rank ? `<span class="m-rank" aria-hidden="true">${rank}</span>` : ''}</span>
      <div class="m-row-body">
        <div class="m-row-line"><span class="m-row-from">${U.esc(email.from)}</span><span class="m-row-time">${U.esc(email.time)}</span></div>
        <div class="m-row-subject">${U.esc(email.subject)}${Desktop.handledChip(email)}</div>
        <div class="m-row-line"><span class="m-row-snippet">${U.esc(Domain.snippet(email, 120))}</span>${Mobile.star(email)}</div>
        ${Mobile.screens.inbox.chips(email, rank)}
      </div>
    </article>`;
  },

  render() {
    const screen = Mobile.screens.inbox;
    const s = State.get();
    const learning = s.mode === 'learning';
    const priority = learning ? [] : Domain.priorityIds();
    const others = learning ? DATA.emails.filter((e) => s.handled[e.id]?.type !== 'trashed').map((e) => e.id) : Domain.otherIds();
    const prioritySection = learning
      ? `<div class="m-notice">${Icon.svg('spark', 18)}<span><b>Week one: learning how you work.</b> Your Priority section starts in week two.</span></div>`
      : `<section class="m-section m-priority" data-tour="m-priority" aria-label="Priority">
          <div class="m-section-head"><span class="m-section-title">${Icon.svg('priority', 18)}Priority</span><span class="m-section-sub">ranked by your assistant</span><span class="m-count">${priority.length}</span></div>
          ${priority.map((id, i) => screen.row(Domain.email(id), i + 1)).join('') || '<div class="empty">Nothing needs you right now.</div>'}
        </section>`;
    return `<div class="m-top">${MobileChrome.searchBar(screen.query)}</div>
      <div class="m-scroll m-inbox">
        ${prioritySection}
        <section class="m-section m-others" aria-label="${learning ? 'Inbox' : 'Everything else'}">
          <div class="m-section-head"><span class="m-section-title">${learning ? 'Inbox' : 'Everything else'}</span></div>
          ${others.map((id) => screen.row(Domain.email(id))).join('')}
        </section>
        <div class="empty m-search-empty" hidden>No messages matched your search.</div>
      </div>
      ${MobileChrome.fab({ label: 'Compose', icon: 'pencil', act: 'compose' })}`;
  },

  /** Hide rows that do not match the search (no re-render, so the keyboard stays up). */
  applyFilter(root) {
    const q = Mobile.screens.inbox.query;
    let shown = 0;
    U.$$('.m-mail-row', root).forEach((row) => {
      const hit = Domain.matches(Domain.email(row.dataset.id), q);
      row.hidden = !hit;
      if (hit) shown += 1;
    });
    U.$('.m-search-empty', root).hidden = shown > 0;
  },

  mount(root) {
    const screen = Mobile.screens.inbox;
    const input = U.$('#m-search', root);
    input.addEventListener('input', () => { screen.query = input.value; screen.applyFilter(root); });
    if (screen.query) screen.applyFilter(root);
  },
};
