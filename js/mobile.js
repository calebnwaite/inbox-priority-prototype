/* Gmail-style phone app (full screen on phones, inside a phone frame on laptops). Core: screen switching, the
   app bar, the email reading view and More. Inbox, To-do and the other screens register in Mobile.screens. */
const Mobile = {
  screens: {},
  active: null,

  /** Gmail-style top app bar: hamburger (or back arrow), title, optional right-hand content. */
  header(title, { back = null, eyebrow = '', right = '' } = {}) {
    const lead = back
      ? `<button class="m-icon-btn" data-act="m-back" data-to="${back}" aria-label="Back">${Icon.svg('back')}</button>`
      : MobileChrome.menuButton();
    return `<div class="m-head">${lead}
      <div class="m-head-text">${eyebrow ? `<div class="eyebrow">${U.esc(eyebrow)}</div>` : ''}<h1>${U.esc(title)}</h1></div>${right}</div>`;
  },

  star(email) {
    const on = Boolean(State.get().starred[email.id]);
    return `<button class="m-star${on ? ' on' : ''}" data-act="toggle-star" data-id="${email.id}" aria-label="${on ? 'Unstar' : 'Star'}" aria-pressed="${on}">${Icon.svg(on ? 'starOn' : 'star', 20)}</button>`;
  },

  /** Gmail-style reading view for one email, with the assistant's suggestion and the phone actions. */
  task: {
    render(route) {
      const email = Domain.email(route.id);
      if (!email) return `${Mobile.header('Not found', { back: 'mobile' })}<div class="empty">That email could not be found.</div>`;
      const s = State.get();
      const task = Domain.taskFor(email.id);
      const done = Boolean(task?.done || s.handled[email.id]);
      const live = Suggestions.live(email);
      const rank = s.mode === 'active' ? Domain.priorityIds().indexOf(email.id) + 1 : 0;
      const paragraphs = email.body.split('\n\n').map((p) => `<p>${U.esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      return `<div class="m-head m-reading-bar">
          <button class="m-icon-btn" data-act="m-back" data-to="mobile" aria-label="Back">${Icon.svg('back')}</button>
          <span class="m-head-text"></span>
          <button class="m-icon-btn" data-act="m-toggle-task" data-id="${email.id}" data-stay="1" aria-label="${done ? 'Move back to inbox (not done)' : 'Archive (mark done)'}">${Icon.svg('archive')}</button>
          <button class="m-icon-btn" data-act="m-trash" data-id="${email.id}" aria-label="Delete">${Icon.svg('trash')}</button>
        </div>
        <div class="m-scroll m-reading">
          <div class="m-reading-subject"><h1>${U.esc(email.subject)}</h1>${Mobile.star(email)}</div>
          <div class="m-labels">${rank ? `<span class="label-chip accent">Priority #${rank}</span>` : ''}<span class="label-chip">Inbox</span>${Desktop.handledChip(email)}</div>
          <div class="m-reading-from">${U.avatar(email.from, 40)}
            <div class="m-reading-who"><div><b>${U.esc(email.from)}</b> <span class="muted">${U.esc(email.time)}</span></div><div class="muted">to me · ${U.esc(email.org)}</div></div>
            <button class="m-icon-btn" data-act="open-draft" data-id="${email.id}" aria-label="Reply">${Icon.svg('reply')}</button></div>
          ${task?.due ? `<div class="due-banner">${Icon.svg('alarm', 18)}<span>${task.reminder ? 'Reminder' : 'Due'}: ${U.esc(Domain.dueLabel(task.due))}</span></div>` : ''}
          ${live ? `<div class="m-assist-card"><div class="m-assist-kicker">${Icon.svg('spark', 18)}Priority Assistant suggests</div>
            <b>${U.esc(email.suggest.label)}</b><div class="muted">${U.esc(email.suggest.why)}</div>
            <button class="btn btn-tonal" data-act="m-suggest-sheet" data-id="${email.id}">See options</button></div>` : ''}
          <div class="email-card m-mail-body">${paragraphs}</div>
        </div>
        <div class="m-actions">
          ${email.phone ? `<button class="btn btn-call" data-act="m-call" data-id="${email.id}">${Icon.svg('call', 18)}Call ${U.esc(U.first(email.from))}</button>` : ''}
          <button class="btn" data-act="open-voice" data-id="${email.id}" data-tour="m-voice">${Icon.svg('mic', 18)}Voice reply</button>
          <button class="btn" data-act="open-draft" data-id="${email.id}">${Icon.svg('reply', 18)}${email.draft ? 'Review draft' : 'Reply'}</button>
          <button class="btn" data-act="open-remind" data-id="${email.id}">${Icon.svg('alarm', 18)}Remind me</button>
          <button class="btn${done ? ' btn-ok' : ''}" data-act="m-toggle-task" data-id="${email.id}" data-stay="1">${Icon.svg('check', 18)}${done ? 'Done' : 'Mark done'}</button>
        </div>`;
    },
  },

  more: {
    render() {
      const items = [['organize', 'organize', 'Swipe organizer', 'Four directions, four actions'], ['workload', 'workload', 'Folders + workload', 'Auto-sorted, easy to read'], ['summary', 'summary', 'Daily summary + chat', 'Ask about today\'s email'], ['desktop', 'desktop', 'Open desktop view', 'The Gmail extension screen']];
      return `${Mobile.header('More')}
        <div class="m-scroll"><div class="more-list">${items.map(([view, icon, title, sub]) => `<button class="more-item" data-act="m-go" data-to="${view === 'desktop' ? 'desktop' : `mobile/${view}`}"><span class="more-icon">${Icon.svg(icon)}</span><span><b>${title}</b><span class="muted">${sub}</span></span>${Icon.svg('chevron')}</button>`).join('')}
        <button class="more-item" data-act="open-tour"><span class="more-icon">${Icon.svg('help')}</span><span><b>Show the guided tour</b><span class="muted">Quick hints for this screen</span></span>${Icon.svg('chevron')}</button></div></div>`;
    },
  },

  update() {
    const route = Router.current();
    if (route.screen !== 'mobile') return;
    const viewKey = route.view || 'inbox';
    const screen = Mobile.screens[viewKey] || Mobile[viewKey];
    const root = U.$('#phone-screen');
    Mobile.active?.cleanup?.();
    if (!screen || !screen.render) {
      U.fail(`The "${viewKey}" screen is missing.`, new Error(`no mobile screen ${viewKey}`));
      root.innerHTML = Mobile.screens.inbox.render();
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
    MobileChrome.watchFab(root);
    Mobile.lastKey = viewKey + route.id;
    const nav = U.$('#phone-tabbar');
    nav.innerHTML = MobileChrome.bottomNav(route);
    nav.hidden = MobileChrome.hidesNav(viewKey);
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
      'm-back': (el) => Router.back(el.dataset.to),
      'm-open-task': (el) => { Domain.markRead(el.dataset.id); Router.go(`mobile/task/${el.dataset.id}`); },
      'm-toggle-task': (el) => {
        const id = el.dataset.id;
        const nowDone = !(Domain.taskFor(id)?.done || Domain.isHandled(id));
        Domain.setTaskDone(id, nowDone);
        if (!Domain.taskFor(id) && nowDone) U.toast('Marked done', 'ok');
      },
      'm-trash': (el) => { Domain.trash(el.dataset.id); U.toast('Deleted (simulated)', 'info'); Router.back('mobile'); },
      'm-call': (el) => Mobile.callSheet(el.dataset.id),
    });
    State.subscribe(Mobile.update);
    Router.onChange(Mobile.update);
  },
};
