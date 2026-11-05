/* Desktop: Gmail-style inbox with the extension's Priority section injected, plus the email reading view. */
const Desktop = {
  query: '',
  folder: 'inbox',   // inbox | starred | snoozed | sent | drafts | label:<name>

  matches(email) { return Domain.matches(email, Desktop.query); },

  /* ---------- small builders ---------- */
  star(email) {
    const on = State.get().starred[email.id];
    return `<button class="star${on ? ' on' : ''}" data-act="toggle-star" data-id="${email.id}" aria-label="${on ? 'Unstar' : 'Star'}">${on ? '★' : '☆'}</button>`;
  },

  handledChip(email) {
    const h = State.get().handled[email.id];
    if (!h) return '';
    const text = { replied: 'Replied ✓', forwarded: `Forwarded to ${U.first(h.to || '')} ✓`, done: 'Done ✓' }[h.type] || '';
    return text ? `<span class="pill pill-ok">${U.esc(text)}</span>` : '';
  },

  priorityActions(email) {
    const s = State.get();
    const forwardable = Suggestions.live(email) && email.suggest.type === 'forward';
    const replyLabel = email.draft ? 'Draft' : 'Reply';
    return `<span class="row-actions">
      <button class="pill-btn primary" data-act="open-draft" data-id="${email.id}" title="${email.draft ? 'Review the drafted reply' : 'Write a reply'}">${replyLabel}</button>
      ${forwardable ? `<button class="pill-btn" data-act="open-forward" data-id="${email.id}">${U.esc(email.suggest.label)}</button>` : ''}
      <button class="pill-btn" data-act="open-remind" data-id="${email.id}">${s.reminded[email.id] ? 'Reminded' : 'Remind'}</button>
    </span>`;
  },

  row(email, { rank = 0, zone = 'other' } = {}) {
    const s = State.get();
    const unread = email.unread && !s.read[email.id] && !s.handled[email.id];
    const isPriority = zone === 'priority';
    const suggestion = !isPriority && Suggestions.live(email) ? Suggestions.chip(email) : null;
    return `<div class="mail-row ${isPriority ? 'priority' : ''} ${unread ? 'unread' : ''} ${email.noise ? 'noise' : ''}" draggable="true" tabindex="0"
        data-act="open-email" data-id="${email.id}" data-zone="${zone}">
      ${isPriority ? `<span class="rank">${rank}</span>` : '<span class="check"></span>'}
      ${Desktop.star(email)}
      <span class="from">${U.esc(email.from)}</span>
      <span class="subject"><b>${U.esc(email.subject)}</b><span class="snippet"> – ${U.esc(Domain.snippet(email))}</span></span>
      ${Desktop.handledChip(email)}
      ${isPriority ? Desktop.priorityActions(email) : (suggestion ? `<button class="pill-btn suggest" data-act="${suggestion.act}" data-id="${email.id}">${U.esc(suggestion.label)}</button>` : '')}
      <span class="time">${U.esc(email.time)}</span>
      <button class="move-btn" data-act="${isPriority ? 'not-priority' : 'make-priority'}" data-id="${email.id}">${isPriority ? '↓ Not priority' : '↑ Make priority'}</button>
    </div>`;
  },

  plainRow(email, extra = '') {
    const s = State.get();
    const unread = email.unread && !s.read[email.id];
    return `<div class="mail-row ${unread ? 'unread' : ''}" tabindex="0" data-act="open-email" data-id="${email.id}">
      <span class="check"></span>${Desktop.star(email)}
      <span class="from">${U.esc(email.from)}</span>
      <span class="subject"><b>${U.esc(email.subject)}</b><span class="snippet"> – ${U.esc(Domain.snippet(email))}</span></span>
      ${extra}<span class="time">${U.esc(email.time)}</span></div>`;
  },

  /* ---------- views ---------- */
  inboxView() {
    const s = State.get();
    if (s.mode === 'learning') {
      const rows = DATA.emails.filter((e) => s.handled[e.id]?.type !== 'trashed' && Desktop.matches(e)).map((e) => Desktop.plainRow(e, Desktop.handledChip(e))).join('');
      return `<div class="notice-bar">Inbox Assistant is in week one: watching how you work, no changes to your inbox yet.</div>
        <div class="section-label plain">Inbox</div>${rows || Desktop.empty('No messages matched your search.')}`;
    }
    const priority = Domain.priorityIds().map(Domain.email).filter(Desktop.matches);
    const others = Domain.otherIds().map(Domain.email).filter(Desktop.matches);
    const priorityRows = priority.map((e) => Desktop.row(e, { rank: Domain.priorityIds().indexOf(e.id) + 1, zone: 'priority' })).join('');
    return `
      <section class="zone" data-zone="priority">
        <div class="section-label priority-label"><span class="dot"></span>Priority <span class="sub">ranked by your assistant</span><span class="count">${priority.length}</span></div>
        ${priorityRows || Desktop.empty(Desktop.query ? 'No priority emails matched.' : 'Nothing needs you right now. Drag an email here, or use ↑ Make priority.')}
      </section>
      <section class="zone" data-zone="other">
        <div class="section-label">Everything else <span class="count">${others.length}</span></div>
        ${others.map((e) => Desktop.row(e)).join('') || Desktop.empty('No messages matched your search.')}
      </section>`;
  },

  folderView() {
    const s = State.get();
    const f = Desktop.folder;
    let rows = '';
    if (f === 'starred') rows = DATA.emails.filter((e) => s.starred[e.id] && Desktop.matches(e)).map((e) => Desktop.plainRow(e)).join('') || Desktop.empty('No starred messages. Stars let you mark important messages.');
    else if (f === 'snoozed') rows = Object.keys(s.reminded).map(Domain.email).filter(Desktop.matches).map((e) => Desktop.plainRow(e, `<span class="pill pill-accent">Reminder ${U.esc(Domain.dueLabel(s.reminded[e.id]))}</span>`)).join('') || Desktop.empty('No snoozed or reminded messages. Use Remind on any email.');
    else if (f === 'sent') rows = s.sent.map((m) => `<div class="mail-row sent-row"><span class="check"></span><span class="star"></span><span class="from">To: ${U.esc(m.to)}</span><span class="subject"><b>${U.esc(m.subject)}</b><span class="snippet"> – ${U.esc(m.text)}</span></span><span class="pill">${m.kind} (simulated)</span><span class="time">Just now</span></div>`).join('') || Desktop.empty('Nothing sent yet. Approve a suggested reply to see it here.');
    else if (f === 'drafts') rows = Desktop.empty('No drafts. Suggested replies stay as suggestions until you approve them.');
    else if (f.startsWith('label:')) { const label = f.slice(6); rows = DATA.emails.filter((e) => e.folder === label && Desktop.matches(e)).map((e) => Desktop.plainRow(e)).join('') || Desktop.empty('No messages with this label.'); }
    return `<div class="section-label plain">${U.esc(Desktop.folderTitle())}</div>${rows}`;
  },

  folderTitle() {
    const f = Desktop.folder;
    return f.startsWith('label:') ? f.slice(6) : f[0].toUpperCase() + f.slice(1);
  },

  empty: (text) => `<div class="empty">${U.esc(text)}</div>`,

  readingView(email) {
    const s = State.get();
    const live = Suggestions.live(email);
    const handled = s.handled[email.id];
    const isPriority = Domain.isPriority(email.id);
    const paragraphs = email.body.split('\n\n').map((p) => `<p>${U.esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const banner = live ? `<div class="suggest-banner"><span class="spark">✦</span><div><b>Assistant suggests: ${U.esc(email.suggest.label)}</b><div class="muted">${U.esc(email.suggest.why)}</div></div>
        <button class="btn btn-primary" data-act="suggest-run" data-id="${email.id}">Review</button>
        <button class="btn btn-ghost" data-act="dismiss-suggestion" data-id="${email.id}">Dismiss</button></div>` : '';
    return `<div class="reading">
      <div class="reading-tools"><button class="icon-btn" data-act="desktop-back" aria-label="Back to inbox">←</button><span class="muted">Back to inbox</span></div>
      ${banner}
      <h1 class="reading-subject">${U.esc(email.subject)} <span class="label-chip">Inbox</span>${isPriority ? '<span class="label-chip accent">Priority</span>' : ''}${handled ? Desktop.handledChip(email) : ''}</h1>
      <div class="reading-from">${U.avatar(email.from, 40)}<div><b>${U.esc(email.from)}</b> <span class="muted">&lt;${U.esc(email.addr)}&gt;</span><div class="muted">${U.esc(email.org)} · to me</div></div><span class="time">${U.esc(email.time)}</span></div>
      <div class="reading-body">${paragraphs}</div>
      <div class="reading-actions">
        <button class="btn btn-primary" data-act="open-draft" data-id="${email.id}">↩ ${email.draft ? 'Review drafted reply' : 'Reply'}</button>
        <button class="btn" data-act="open-forward" data-id="${email.id}">Forward</button>
        <button class="btn" data-act="open-remind" data-id="${email.id}">Remind me</button>
        ${email.phone ? `<a class="btn" href="tel:${U.esc(email.phone.replace(/-/g, ''))}">Call ${U.esc(U.first(email.from))}</a>` : ''}
        <button class="btn btn-ghost" data-act="${isPriority ? 'not-priority' : 'make-priority'}" data-id="${email.id}">${isPriority ? 'Not priority' : 'Make priority'}</button>
      </div></div>`;
  },

  navItem(key, label, icon, count = '') {
    return `<button class="nav-item${Desktop.folder === key ? ' active' : ''}" data-act="desktop-folder" data-folder="${key}"><span class="nav-icon">${icon}</span><span>${label}</span><span class="nav-count">${count}</span></button>`;
  },

  renderSidebar() {
    const s = State.get();
    const unread = DATA.emails.filter((e) => e.unread && !s.read[e.id] && !s.handled[e.id]).length;
    const labels = DATA.folders.map((f) => Desktop.navItem(`label:${f}`, f, '▪')).join('');
    U.$('#gm-nav').innerHTML = [
      Desktop.navItem('inbox', 'Inbox', '▤', unread),
      Desktop.navItem('starred', 'Starred', '☆'),
      Desktop.navItem('snoozed', 'Snoozed', '◷', Object.keys(s.reminded).length || ''),
      Desktop.navItem('sent', 'Sent', '➤'),
      Desktop.navItem('drafts', 'Drafts', '✎'),
    ].join('') + `<div class="nav-heading">Labels</div>${labels}`;
  },

  update() {
    const route = Router.current();
    if (route.screen !== 'desktop') return;
    const s = State.get();
    U.$('.gmail').classList.toggle('with-panel', s.panelOpen);
    Desktop.renderSidebar();
    const main = U.$('#gm-main');
    const scroll = main.scrollTop;
    if (route.view === 'email') {
      const email = Domain.email(route.id);
      main.innerHTML = email ? Desktop.readingView(email) : Desktop.empty('That email could not be found.');
    } else {
      main.innerHTML = Desktop.folder === 'inbox' ? Desktop.inboxView() : Desktop.folderView();
    }
    main.scrollTop = route.view === 'email' ? 0 : scroll;
    U.$('#gm-search').placeholder = Desktop.folder === 'inbox' ? 'Search mail' : `Search in ${Desktop.folderTitle()}`;
    Assistant.render();
  },

  /* ---------- drag and drop between sections ---------- */
  installDragDrop() {
    const main = U.$('#gm-main');
    main.addEventListener('dragstart', (event) => {
      const row = event.target.closest('.mail-row[data-zone]');
      if (!row) return;
      event.dataTransfer.setData('text/plain', row.dataset.id);
      event.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
      main.classList.add('dragging-active');
    });
    main.addEventListener('dragend', () => {
      main.classList.remove('dragging-active');
      U.$$('.dragging, .drop-over', main).forEach((n) => n.classList.remove('dragging', 'drop-over'));
    });
    main.addEventListener('dragover', (event) => {
      const zone = event.target.closest('.zone');
      if (!zone) return;
      event.preventDefault();
      U.$$('.drop-over', main).forEach((n) => n.classList.remove('drop-over'));
      zone.classList.add('drop-over');
    });
    main.addEventListener('drop', (event) => {
      const zone = event.target.closest('.zone');
      const id = event.dataTransfer.getData('text/plain');
      if (!zone || !Domain.email(id)) return;
      event.preventDefault();
      try {
        if (zone.dataset.zone === 'priority') {
          const target = event.target.closest('.mail-row.priority');
          const index = target && target.dataset.id !== id ? State.get().priority.indexOf(target.dataset.id) : null;
          if (Domain.isPriority(id)) { if (index !== null) Domain.movePriority(id, index); }
          else { Domain.makePriority(id, { index }); U.toast('Moved to Priority. The assistant will learn from this.'); }
        } else if (Domain.isPriority(id)) {
          Domain.notPriority(id);
          U.toast('Moved to Everything else. The assistant will learn from this.');
        }
      } catch (error) { U.fail('Could not move that email.', error); }
    });
  },

  install() {
    U.$('#gm-search').addEventListener('input', (event) => { Desktop.query = event.target.value; Desktop.update(); });
    Desktop.installDragDrop();
    Actions.register({
      'open-email': (el) => {
        Domain.markRead(el.dataset.id);
        Router.go(`desktop/email/${el.dataset.id}`);
      },
      'desktop-back': () => Router.go('desktop'),
      'desktop-folder': (el) => { Desktop.folder = el.dataset.folder; if (Router.current().view) Router.go('desktop'); else Desktop.update(); },
      'toggle-star': (el, event) => { event.stopPropagation(); Domain.toggleStar(el.dataset.id); },
      'compose': () => U.toast('Compose is not part of this prototype. Try replying from the Priority section.', 'info'),
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches && event.target.matches('.mail-row[data-act="open-email"]')) event.target.click();
    });
    State.subscribe(Desktop.update);
    Router.onChange(Desktop.update);
  },
};
