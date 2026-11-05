/* Guided tour: a few highlighted hints per screen with Next / Skip. Re-open any time with the "?" button. */
const Tour = {
  steps: {
    desktop: [
      { sel: '.zone[data-zone="priority"]', title: 'Your Priority section', text: 'The extension puts the emails that need you at the top, ranked 1 to 4. Each has a suggested next move.' },
      { sel: '.assistant-panel .featured', title: 'Priority Assistant', text: 'Your next move. Open the email, set a reminder, or review the suggested reply. Nothing is sent until you approve it.' },
      { sel: '[data-tour="confidence"]', title: 'Sorting confidence', text: 'This goes up when you accept suggestions and changes when you correct them.' },
      { sel: '#mode-switch', title: 'Week one vs. week two', text: 'In week one the assistant only watches. Flip this to see how it behaves, or use "Skip to week 2".' },
      { sel: '#proto-nav .phone-link', title: 'Try the phone', text: 'Reminders you set here show up on the phone to-do. Open the phone view next.' },
    ],
    today: [
      { sel: '[data-tour="m-list"]', title: 'Your to-do for today', text: 'Tap the circle to check something off. It updates on your desktop too. Tap a card to open it.' },
      { sel: '[data-tour="m-record"]', title: 'Record a reply', text: 'Speak your reply. You will see the written draft and approve it before it is sent.' },
      { sel: '#phone-tabbar', title: 'More ways to work', text: 'Sort with swipes, listen to your email, see your day, and more.' },
    ],
    task: [
      { sel: '.email-card', title: 'The email', text: 'Read it here. Calls and replies are one tap away.' },
      { sel: '[data-tour="m-voice"]', title: 'Reply by voice', text: 'Tap Voice reply, speak, and approve the draft.' },
    ],
    generic: [
      { sel: '#phone-tabbar', title: 'Switch screens', text: 'Use the tabs or the More tab to try every screen. Reset demo restores the sample data.' },
    ],
  },

  index: 0,
  list: [],

  keyForRoute() {
    const route = Router.current();
    if (route.screen === 'desktop') return 'desktop';
    return Tour.steps[route.view || 'today'] ? route.view || 'today' : 'generic';
  },

  start(key = Tour.keyForRoute()) {
    Tour.end();
    Tour.list = Tour.steps[key].filter((step) => { const el = U.$(step.sel); return el && el.offsetParent !== null; });
    if (!Tour.list.length) { U.toast('Nothing to point out on this screen.', 'info'); return; }
    Tour.index = 0;
    Tour.show();
  },

  show() {
    const step = Tour.list[Tour.index];
    const target = U.$(step.sel);
    if (!target) { Tour.next(); return; }
    target.scrollIntoView({ block: 'nearest' });
    const rect = target.getBoundingClientRect();
    const last = Tour.index === Tour.list.length - 1;
    let layer = U.$('#tour-layer');
    if (!layer) { layer = document.createElement('div'); layer.id = 'tour-layer'; document.body.appendChild(layer); }
    const below = rect.bottom + 190 < window.innerHeight;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 332));
    layer.innerHTML = `<div class="tour-hole" style="top:${rect.top - 6}px;left:${rect.left - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px"></div>
      <div class="tour-card" style="left:${left}px;top:${below ? rect.bottom + 14 : Math.max(12, rect.top - 190)}px" role="dialog" aria-label="Guided tour">
        <div class="tour-step">${Tour.index + 1} of ${Tour.list.length}</div><b>${U.esc(step.title)}</b><p>${U.esc(step.text)}</p>
        <div class="btn-row"><button class="btn btn-primary" data-act="tour-next">${last ? 'Done' : 'Next'}</button><button class="btn btn-ghost" data-act="tour-skip">Skip</button></div></div>`;
  },

  next() {
    Tour.index += 1;
    if (Tour.index >= Tour.list.length) Tour.end(); else Tour.show();
  },

  end() { U.$('#tour-layer')?.remove(); Tour.list = []; },

  /** Show the tour automatically the first time a screen is opened. */
  autoStart() {
    const key = Tour.keyForRoute();
    if (State.get().toursSeen[key]) return;
    State.mutate((s) => { s.toursSeen[key] = true; });
    setTimeout(() => { if (Tour.keyForRoute() === key) Tour.start(key); }, 700);
  },

  install() {
    Actions.register({
      'open-tour': () => Tour.start(),
      'tour-next': () => Tour.next(),
      'tour-skip': () => Tour.end(),
    });
    Router.onChange(() => { Tour.end(); Tour.autoStart(); });
    window.addEventListener('resize', () => { if (Tour.list.length) Tour.show(); });
  },
};
