/* Concept B: automatic calendar of reply deadlines with "Read my day aloud". */
Mobile.screens.day = {
  selected: DATA.now.day,
  stopSpeech: null,

  /** Static deadlines plus reminders set from desktop or phone, sorted by clock time. */
  events(day) {
    const s = State.get();
    const minutes = (t) => { const [h, m, ap] = t.replace(':', ' ').split(' '); return (Number(h) % 12 + (ap === 'PM' ? 12 : 0)) * 60 + Number(m); };
    const fixed = DATA.calendar.filter((e) => e.day === day).map((e) => ({ ...e, replied: Boolean(e.emailId && s.handled[e.emailId]) }));
    const reminders = s.tasks.filter((t) => t.reminder && t.due && t.due.day === day && !fixed.some((e) => e.emailId === t.emailId && e.time === t.due.time))
      .map((t) => ({ id: `r_${t.emailId}`, time: t.due.time, title: t.title, note: 'your reminder', emailId: t.emailId, accent: false, replied: t.done, reminder: true }));
    return [...fixed, ...reminders].sort((a, b) => minutes(a.time) - minutes(b.time));
  },

  render() {
    const screen = Mobile.screens.day;
    const events = screen.events(screen.selected);
    const tabs = DATA.days.map((d) => `<button class="day-tab${d === screen.selected ? ' active' : ''}" data-act="day-select" data-day="${d}">${d}</button>`).join('');
    const items = events.map((e) => `<div class="event${e.replied ? ' replied' : ''}${e.accent ? ' accent' : ''}">
        <div class="event-time">${U.esc(e.time.replace(' ', ' '))}</div>
        <div class="event-card"><b>${U.esc(e.title)}</b><span class="muted">${e.replied ? 'Replied. Saved' : U.esc(e.note)}</span>${e.emailId && !e.replied ? `<button class="pill-btn" data-act="m-open-task" data-id="${e.emailId}">Open</button>` : ''}</div></div>`).join('');
    return `${Mobile.header(screen.selected === DATA.now.day ? 'Monday' : { Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }[screen.selected], { eyebrow: "TODAY'S ITINERARY" })}
      <div class="day-tabs">${tabs}</div>
      <div class="m-scroll"><div class="events">${items || '<div class="empty">Nothing due. Enjoy the quiet.</div>'}</div></div>
      <div class="m-bottom-action"><button class="btn btn-primary wide big" data-act="day-read" id="day-read">🔊 Read my day aloud</button></div>`;
  },

  spokenDay() {
    const screen = Mobile.screens.day;
    const events = screen.events(screen.selected).filter((e) => !e.replied);
    if (!events.length) return 'You have nothing due. Enjoy the quiet.';
    return `You have ${events.length} item${events.length === 1 ? '' : 's'}. ${events.map((e) => `At ${e.time}: ${e.title}, ${e.note}.`).join(' ')}`;
  },

  cleanup() { Mobile.screens.day.stopSpeech?.(); Mobile.screens.day.stopSpeech = null; },

  install() {
    const screen = Mobile.screens.day;
    Actions.register({
      'day-select': (el) => { screen.cleanup(); screen.selected = el.dataset.day; Mobile.update(); },
      'day-read': () => {
        const button = U.$('#day-read');
        if (screen.stopSpeech) { screen.cleanup(); button.textContent = '🔊 Read my day aloud'; return; }
        button.textContent = '■ Stop reading';
        screen.stopSpeech = Voice.speak(screen.spokenDay(), () => {
          screen.stopSpeech = null;
          const again = U.$('#day-read');
          if (again) again.textContent = '🔊 Read my day aloud';
        });
      },
    });
  },
};
