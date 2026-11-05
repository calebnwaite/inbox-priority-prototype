/* One shared store for desktop and mobile. Persists to localStorage; syncs across tabs. */
const State = (() => {
  const KEY = 'inbox-assistant-proto-v1';
  const listeners = new Set();
  let state = load();

  function seed() {
    return {
      mode: 'active',            // 'learning' (week one, passive) | 'active' (week two, suggesting)
      panelOpen: true,
      whyOpen: false,
      confidence: 62,
      lastLearned: '',
      priority: DATA.initialPriority.slice(),
      handled: {},               // emailId -> {type: replied|forwarded|done|trashed, ...}
      dismissed: {},             // emailId -> true (suggestion dismissed)
      read: {},
      starred: {},
      saved: {},
      tasks: DATA.seedTasks.map((t) => ({ id: `t_${t.emailId}`, done: false, ...t })),
      reminded: {},              // emailId -> due
      sent: [],                  // simulated sent messages
      senderPrefs: {},           // sender name -> 'always' | 'later'
      sorted: {},                // sort-screen decisions
      organized: {},             // organizer decisions
      observed: { opened: DATA.learning.stats[0][1] },
      toursSeen: {},
      useRealMic: false,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...seed(), ...JSON.parse(raw) };
    } catch (error) {
      console.error('Could not read saved demo state; starting fresh.', error);
      setTimeout(() => U.toast('Saved demo data was unreadable, so it was reset.', 'error'), 0);
    }
    return seed();
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Could not save demo state (private mode or storage full).', error);
      if (!persist.warned) { persist.warned = true; U.toast('Changes will not survive a reload in this browser.', 'error'); }
    }
  }

  function notify() { listeners.forEach((fn) => { try { fn(state); } catch (error) { U.fail('A screen failed to update. Try Reset demo.', error); } }); }

  window.addEventListener('storage', (event) => {
    if (event.key === KEY) { state = load(); notify(); }
  });

  return {
    get: () => state,
    mutate(fn) { fn(state); persist(); notify(); },
    subscribe(fn) { listeners.add(fn); },
    reset() {
      try { localStorage.removeItem(KEY); } catch (error) { console.error('Could not clear saved demo state.', error); }
      state = seed();
      notify();
    },
  };
})();
