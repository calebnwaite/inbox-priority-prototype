/* Mobile web app inside a phone frame. Core screens: Today to-do, email detail, More. Other screens register in Mobile.screens. */
const Mobile = {
  screens: {},
  active: null,

  /** Which bottom tab is highlighted for each view. */
  tabFor(view) {
    if (!view || view === 'task') return 'today';
    return ['sort', 'listen', 'day'].includes(view) ? view : 'more';
  },

  tabs: [['today', 'To-Do', '✓', 'mobile'], ['sort', 'Sort', '⇆', 'mobile/sort'], ['listen', 'Listen', '🎧', 'mobile/listen'], ['day', 'Day', '▦', 'mobile/day'], ['more', 'More', '⋯', 'mobile/more']],

  header(title, { back = null, eyebrow = '', right = '' } = {}) {
    return `<div class="m-head">${back ? `<button class="icon-btn" data-act="m-back" data-to="${back}" aria-label="Back">←</button>` : ''}
      <div class="m-head-text">${eyebrow ? `<div class="eyebrow">${U.esc(eyebrow)}</div>` : ''}<h1>${U.esc(title)}</h1></div>${right}</div>`;
  },

  taskCard(task) {
    const email = Domain.email(task.emailId);
    return `<div class="task-card${task.done ? ' done' : ''}">
      <button class="check-btn${task.done ? ' on' : ''}" data-act="m-toggle-task" data-id="${task.emailId}" aria-label="${task.done ? 'Mark not done' : 'Mark done'}">${task.done ? '✓' : ''}</button>
      <button class="task-main" data-act="m-open-task" data-id="${task.emailId}">
        <b>${U.esc(task.title)}</b><span class="muted">${U.esc(task.sub || email.from)}</span>
        ${task.due ? `<span class="due${task.reminder ? ' reminder' : ''}">${task.reminder ? '⏰ ' : ''}${U.esc(Domain.dueLabel(task.due))}</span>` : ''}
      </button></div>`;
  },

  today: {
    render() {
      const tasks = State.get().tasks;
      const open = tasks.filter((t) => !t.done);
      const done = tasks.filter((t) => t.done);
      return `${Mobile.header('To-Do', { eyebrow: 'TODAY · MONDAY' })}
        <div class="m-scroll">
          <div class="muted m-sub" data-tour="m-count">${open.length ? `${open.length} thing${open.length === 1 ? '' : 's'} need you today` : 'All clear. Enjoy your evening.'}</div>
          <div class="task-list" data-tour="m-list">${open.map(Mobile.taskCard).join('') || '<div class="empty">Nothing left. You are done for the day.</div>'}</div>
          ${done.length ? `<div class="field-label">Done</div><div class="task-list">${done.map(Mobile.taskCard).join('')}</div>` : ''}
        </div>
        <div class="m-bottom-action"><button class="btn btn-primary wide big" data-act="m-record" data-tour="m-record">🎙 Record a reply</button></div>`;
    },
  },

  task: {
    render(route) {
      const email = Domain.email(route.id);
      if (!email) return `${Mobile.header('Not found', { back: 'mobile' })}<div class="empty">That email could not be found.</div>`;
      const s = State.get();
      const task = Domain.taskFor(email.id);
      const done = Boolean(task?.done || s.handled[email.id]);
      const live = Suggestions.live(email);
      const paragraphs = email.body.split('\n\n').map((p) => `<p>${U.esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      return `${Mobile.header(task?.title || email.subject, { back: 'mobile' })}
        <div class="m-scroll">
          <div class="from-line">${U.avatar(email.from, 36)}<div><b>${U.esc(email.from)}</b><div class="muted">${U.esc(email.org)} · ${U.esc(email.time)}</div></div></div>
          ${task?.due ? `<div class="due-banner">${task.reminder ? '⏰ Reminder' : 'Due'}: ${U.esc(Domain.dueLabel(task.due))}</div>` : ''}
          ${live ? `<div class="suggest-banner small"><span class="spark">✦</span><div><b>${U.esc(email.suggest.label)}</b><div class="muted">${U.esc(email.suggest.why)}</div></div></div>` : ''}
          <div class="field-label">EMAIL</div>
          <div class="email-card">${paragraphs}</div>
        </div>
        <div class="m-actions">
          ${email.phone ? `<button class="btn btn-danger wide" data-act="m-call" data-id="${email.id}">📞 Call ${U.esc(U.first(email.from))}</button>` : ''}
          <div class="btn-row two">
            <button class="btn" data-act="open-voice" data-id="${email.id}" data-tour="m-voice">🎙 Voice reply</button>
            <button class="btn${done ? ' btn-ok' : ''}" data-act="m-toggle-task" data-id="${email.id}" data-stay="1">${done ? '✓ Done' : 'Mark done'}</button>
          </div>
          <div class="btn-row two">
            <button class="btn btn-ghost" data-act="open-draft" data-id="${email.id}">${email.draft ? 'Review drafted reply' : 'Write reply'}</button>
            <button class="btn btn-ghost" data-act="open-remind" data-id="${email.id}">Remind me</button>
          </div>
        </div>`;
    },
  },

  more: {
    render() {
      const items = [['organize', '⇅', 'Swipe organizer', 'Four directions, four actions'], ['workload', '▤', 'Folders + workload', 'Auto-sorted, easy to read'], ['summary', '✎', 'Daily summary + chat', 'Ask about today\'s email'], ['desktop', '▭', 'Open desktop view', 'The Gmail extension screen']];
      return `${Mobile.header('More')}
        <div class="m-scroll"><div class="more-list">${items.map(([view, icon, title, sub]) => `<button class="more-item" data-act="m-go" data-to="${view === 'desktop' ? 'desktop' : `mobile/${view}`}"><span class="more-icon">${icon}</span><span><b>${title}</b><span class="muted">${sub}</span></span><span class="chev">›</span></button>`).join('')}
        <button class="more-item" data-act="open-tour"><span class="more-icon">?</span><span><b>Show the guided tour</b><span class="muted">Quick hints for this screen</span></span><span class="chev">›</span></button></div></div>`;
    },
  },

  tabbar() {
    const current = Mobile.tabFor(Router.current().view);
    return Mobile.tabs.map(([key, label, icon, path]) => `<button class="tab${key === current ? ' active' : ''}" data-act="m-go" data-to="${path}"><span>${icon}</span><small>${label}</small></button>`).join('');
  },

  update() {
    const route = Router.current();
    if (route.screen !== 'mobile') return;
    const viewKey = route.view || 'today';
    const screen = Mobile.screens[viewKey] || Mobile[viewKey];
    const root = U.$('#phone-screen');
    Mobile.active?.cleanup?.();
    if (!screen || !screen.render) {
      U.fail(`The "${viewKey}" screen is missing.`, new Error(`no mobile screen ${viewKey}`));
      root.innerHTML = Mobile.today.render();
      Mobile.active = null;
    } else {
      const scroll = Mobile.lastKey === viewKey + route.id ? U.$('.m-scroll', root)?.scrollTop || 0 : 0;
      root.className = `phone-screen view-${viewKey}${screen.dark ? ' dark' : ''}`;
      root.innerHTML = screen.render(route);
      Mobile.active = screen;
      const area = U.$('.m-scroll', root);
      if (area) area.scrollTop = scroll;
      screen.mount?.(root, route);
    }
    Mobile.lastKey = viewKey + route.id;
    U.$('#phone-tabbar').innerHTML = Mobile.tabbar();
  },

  callSheet(emailId) {
    const email = Domain.email(emailId);
    const dial = email.phone.replace(/-/g, '');
    let seconds = 0;
    let timer = null;
    Overlay.show(`
      <div class="call-sheet">${U.avatar(email.from, 64)}
        <h2>${U.esc(email.from)}</h2><div class="muted">${U.esc(email.org)} · ${U.esc(email.phone)}</div>
        <div class="call-state" id="call-state">Calling…</div>
        <div class="btn-row two"><button class="btn btn-danger" data-act="overlay-close">End call</button>
        <a class="btn" href="tel:${U.esc(dial)}">Open phone dialer</a></div>
        <p class="fine">Simulated call. On a real phone, "Open phone dialer" places the call.</p>
      </div>`, { onClose: () => clearInterval(timer) });
    setTimeout(() => {
      const label = U.$('#call-state');
      if (!label) return;
      timer = setInterval(() => { seconds += 1; const el = U.$('#call-state'); if (el) el.textContent = `Connected · 0:${String(seconds).padStart(2, '0')}`; }, 1000);
      label.textContent = 'Connected · 0:00';
    }, 1800);
  },

  install() {
    Actions.register({
      'm-go': (el) => Router.go(el.dataset.to),
      'm-back': (el) => Router.go(el.dataset.to),
      'm-open-task': (el) => { Domain.markRead(el.dataset.id); Router.go(`mobile/task/${el.dataset.id}`); },
      'm-toggle-task': (el) => {
        const id = el.dataset.id;
        const nowDone = !(Domain.taskFor(id)?.done || Domain.isHandled(id));
        Domain.setTaskDone(id, nowDone);
        if (!Domain.taskFor(id) && nowDone) U.toast('Marked done', 'ok');
      },
      'm-record': () => {
        const next = State.get().tasks.find((t) => !t.done);
        if (!next) { U.toast('Nothing left to reply to. You are all caught up.', 'info'); return; }
        VoiceReply.open(next.emailId);
      },
      'm-call': (el) => Mobile.callSheet(el.dataset.id),
    });
    State.subscribe(Mobile.update);
    Router.onChange(Mobile.update);
  },
};
