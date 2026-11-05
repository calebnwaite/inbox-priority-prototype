/* Gmail-style phone chrome: search pill, bottom navigation bar, floating Compose button (shrinks on scroll), account sheet. */
const MobileChrome = {
  /** Bottom navigation: [key, label, icon, route]. Every other screen is in the drawer. */
  navItems: [['inbox', 'Mail', 'mail', 'mobile'], ['todo', 'To-do', 'todo', 'mobile/todo'], ['sort', 'Sort', 'sort', 'mobile/sort'], ['listen', 'Listen', 'listen', 'mobile/listen']],

  /** Which bottom-nav / drawer entry is current for a view. */
  currentKey(view) { return !view || view === 'task' ? 'inbox' : view; },

  /** The reading view uses the whole screen, like Gmail. */
  hidesNav(view) { return view === 'task'; },

  badges() {
    const s = State.get();
    return {
      inbox: s.mode === 'active' ? Domain.priorityIds().length : 0,
      todo: s.tasks.filter((t) => !t.done).length,
    };
  },

  bottomNav(route) {
    const current = MobileChrome.currentKey(route.view);
    const badges = MobileChrome.badges();
    return MobileChrome.navItems.map(([key, label, icon, path]) => {
      const count = badges[key] || 0;
      return `<button class="m-nav-item${key === current ? ' active' : ''}" data-act="m-go" data-to="${path}" aria-label="${label}${count ? `, ${count} need you` : ''}"${key === current ? ' aria-current="page"' : ''}>
        <span class="m-nav-pill">${Icon.svg(icon)}${count ? `<span class="m-nav-badge">${count}</span>` : ''}</span><span class="m-nav-label">${label}</span></button>`;
    }).join('');
  },

  avatarButton() {
    return `<button class="m-account" data-act="m-account" aria-label="Account: ${U.esc(DATA.me.name)}" style="background:${U.avatarColor(DATA.me.name)}">${U.esc(DATA.me.name[0])}</button>`;
  },

  menuButton() {
    return `<button class="m-icon-btn" data-act="m-drawer-open" aria-label="Open menu">${Icon.svg('menu')}</button>`;
  },

  /** The "Search in mail" pill at the top of the inbox. */
  searchBar(query = '') {
    return `<div class="m-searchbar" role="search">${MobileChrome.menuButton()}
      <input id="m-search" class="m-search-input" type="search" placeholder="Search in mail" aria-label="Search in mail" autocomplete="off" enterkeyhint="search" value="${U.esc(query)}">
      ${MobileChrome.avatarButton()}</div>`;
  },

  /** Extended floating action button; collapses to a round button while scrolling down. */
  fab({ label, icon, act, tour = '' }) {
    return `<div class="m-fab-host"><button class="m-fab" data-act="${act}"${tour ? ` data-tour="${tour}"` : ''} aria-label="${U.esc(label)}">${Icon.svg(icon)}<span class="m-fab-label">${U.esc(label)}</span></button></div>`;
  },

  /** Passive, rAF-batched scroll watcher: collapse the FAB on scroll down, expand on scroll up. */
  watchFab(root) {
    const fab = U.$('.m-fab', root);
    const scroller = U.$('.m-scroll', root);
    if (!fab || !scroller) return;
    let last = scroller.scrollTop;
    let queued = false;
    fab.classList.toggle('is-collapsed', last > 24);
    scroller.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const top = scroller.scrollTop;
        if (top <= 8) { fab.classList.remove('is-collapsed'); last = top; return; }
        if (Math.abs(top - last) < 6) return;
        fab.classList.toggle('is-collapsed', top > last);
        last = top;
      });
    }, { passive: true });
  },

  accountSheet() {
    const me = DATA.me;
    Overlay.show(`
      <div class="m-account-card">${U.avatar(me.name, 56)}<div><b>${U.esc(me.name)}</b><div class="muted">${U.esc(me.role)} · ${U.esc(me.company)}</div></div></div>
      <div class="m-sheet-list">
        <button class="m-sheet-item" data-act="m-go" data-to="desktop">${Icon.svg('desktop')}<span>Open the desktop (Gmail extension) view</span></button>
        <button class="m-sheet-item" data-act="m-sheet-run" data-run="open-tour">${Icon.svg('help')}<span>Show the guided tour</span></button>
        <button class="m-sheet-item" data-act="m-sheet-run" data-run="reset-demo">${Icon.svg('reset')}<span>Reset demo data</span></button>
      </div>
      <p class="fine">Prototype account. All data is fake and nothing is ever really sent.</p>`);
  },

  install() {
    Actions.register({
      'm-account': () => MobileChrome.accountSheet(),
      /** Close the sheet first, then run another registered action (tour, reset). */
      'm-sheet-run': (el, event) => { Overlay.close(); Actions.run(el.dataset.run, el, event); },
    });
  },
};
