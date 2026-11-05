/* Gmail-style navigation drawer (hamburger): mailboxes, the assistant's screens, demo tools. Slides with transform only. */
const MobileDrawer = {
  host() { return U.$('#phone-drawer'); },

  groups() {
    const s = State.get();
    const unread = DATA.emails.filter((e) => e.unread && !s.read[e.id] && !s.handled[e.id]).length;
    const badges = MobileChrome.badges();
    return [
      ['', [['inbox', 'Inbox', 'inbox', 'mobile', unread], ['todo', 'To-do', 'todo', 'mobile/todo', badges.todo]]],
      ['Priority Assistant', [
        ['sort', 'Sort: Priority or Later', 'sort', 'mobile/sort'], ['listen', 'Listen (voice inbox)', 'listen', 'mobile/listen'],
        ['day', 'My day', 'day', 'mobile/day'], ['organize', 'Swipe organizer', 'organize', 'mobile/organize'],
        ['workload', 'Folders + workload', 'workload', 'mobile/workload'], ['summary', 'Daily summary', 'summary', 'mobile/summary'],
      ]],
      ['Prototype', [['desktop', 'Desktop view', 'desktop', 'desktop']]],
    ];
  },

  render() {
    const current = MobileChrome.currentKey(Router.current().view);
    const items = MobileDrawer.groups().map(([title, entries]) => `${title ? `<div class="m-drawer-title">${U.esc(title)}</div>` : ''}
      ${entries.map(([key, label, icon, path, count]) => `<button class="m-drawer-item${key === current ? ' active' : ''}" data-act="m-drawer-go" data-to="${path}"${key === current ? ' aria-current="page"' : ''}>
        ${Icon.svg(icon)}<span>${U.esc(label)}</span>${count ? `<b class="m-drawer-count">${count}</b>` : ''}</button>`).join('')}`).join('<hr>');
    return `<div class="m-drawer-scrim" data-act="m-drawer-close"></div>
      <nav class="m-drawer-panel" aria-label="Mailboxes and screens">
        <div class="m-drawer-brand"><span class="m-brand-mark">✦</span>Mail <small>with Priority Assistant</small></div>
        ${items}<hr>
        <button class="m-drawer-item" data-act="m-drawer-run" data-run="open-tour">${Icon.svg('help')}<span>Guided tour</span></button>
        <button class="m-drawer-item" data-act="m-drawer-run" data-run="reset-demo">${Icon.svg('reset')}<span>Reset demo</span></button>
      </nav>`;
  },

  isOpen() { return Boolean(MobileDrawer.host()?.classList.contains('open')); },

  open() {
    const host = MobileDrawer.host();
    if (!host) { U.fail('Could not open the menu.', new Error('#phone-drawer missing')); return; }
    host.innerHTML = MobileDrawer.render();
    host.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => host.classList.add('open'));
    U.$('.m-drawer-item.active, .m-drawer-item', host)?.focus({ preventScroll: true });
  },

  close() {
    const host = MobileDrawer.host();
    if (!host || !host.classList.contains('open')) return;
    host.classList.remove('open');
    host.setAttribute('aria-hidden', 'true');
  },

  install() {
    Actions.register({
      'm-drawer-open': () => MobileDrawer.open(),
      'm-drawer-close': () => MobileDrawer.close(),
      'm-drawer-go': (el) => { MobileDrawer.close(); Router.go(el.dataset.to); },
      'm-drawer-run': (el, event) => { MobileDrawer.close(); Actions.run(el.dataset.run, el, event); },
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') MobileDrawer.close(); });
    Router.onChange(() => MobileDrawer.close());
  },
};
