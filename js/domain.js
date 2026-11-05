/* Business actions shared by desktop and mobile. Every state change goes through here. */
const Domain = {
  email: (id) => DATA.byId[id],
  isHandled: (id) => Boolean(State.get().handled[id]),
  isPriority: (id) => State.get().priority.includes(id) && !Domain.isHandled(id),

  /** Priority emails still needing action, in rank order. */
  priorityIds: () => State.get().priority.filter((id) => !Domain.isHandled(id)),

  /** Inbox emails outside Priority (handled ones included, shown with a chip). */
  otherIds() {
    const s = State.get();
    return DATA.emails.filter((e) => !s.priority.includes(e.id) || s.handled[e.id]).filter((e) => s.handled[e.id]?.type !== 'trashed').map((e) => e.id);
  },

  /** Search: sender, company, subject or body contains the query (case-insensitive). */
  matches(email, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return [email.from, email.org, email.subject, email.body].some((t) => (t || '').toLowerCase().includes(q));
  },

  snippet(email, max = 110) {
    const text = email.body.replace(/^(Jeff|Hi Jeff|Good morning Jeff),?\s*/i, '').replace(/\s+/g, ' ');
    if (text.length <= max) return text;
    return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
  },

  dueLabel: (due) => (due ? `${due.day === DATA.now.day ? 'Today' : due.day} ${due.time}` : ''),

  remindOptions: [
    { key: 'hour', label: 'In 1 hour', due: { day: 'Mon', time: '9:15 AM' } },
    { key: 'afternoon', label: 'This afternoon', due: { day: 'Mon', time: '3:00 PM' } },
    { key: 'tomorrow', label: 'Tomorrow 7:00 AM', due: { day: 'Tue', time: '7:00 AM' } },
  ],

  adjustConfidence(delta, learned) {
    State.mutate((s) => {
      s.confidence = Math.max(35, Math.min(98, s.confidence + delta));
      if (learned) s.lastLearned = learned;
    });
  },

  makePriority(id, { viaSuggestion = false, index = null } = {}) {
    const email = Domain.email(id);
    State.mutate((s) => {
      s.priority = s.priority.filter((x) => x !== id);
      if (index === null || index > s.priority.length) s.priority.push(id); else s.priority.splice(index, 0, id);
      if (s.handled[id]?.type === 'done') delete s.handled[id];
      s.dismissed[id] = viaSuggestion ? true : s.dismissed[id];
    });
    Domain.adjustConfidence(viaSuggestion ? 3 : 2, `Learned: ${email.from} can be priority`);
  },

  notPriority(id) {
    const email = Domain.email(id);
    State.mutate((s) => { s.priority = s.priority.filter((x) => x !== id); });
    Domain.adjustConfidence(-3, `Learned: ${email.from} is not always priority`);
  },

  movePriority(id, index) {
    State.mutate((s) => {
      s.priority = s.priority.filter((x) => x !== id);
      s.priority.splice(Math.max(0, Math.min(index, s.priority.length)), 0, id);
    });
  },

  dismissSuggestion(id) {
    State.mutate((s) => { s.dismissed[id] = true; });
    Domain.adjustConfidence(-2, 'Learned: that suggestion was not useful');
  },

  markRead(id) { State.mutate((s) => { s.read[id] = true; if (s.mode === 'learning') s.observed.opened += 1; }); },
  toggleStar(id) { State.mutate((s) => { s.starred[id] = !s.starred[id]; }); },

  addReminder(emailId, due) {
    const email = Domain.email(emailId);
    State.mutate((s) => {
      const existing = s.tasks.find((t) => t.emailId === emailId);
      if (existing) { existing.due = due; existing.done = false; existing.reminder = true; }
      else s.tasks.push({ id: `t_${emailId}`, emailId, title: email.headline || email.subject, sub: `${email.from} · ${email.subject}`, due, done: false, reminder: true });
      s.reminded[emailId] = due;
      if (s.handled[emailId]?.type === 'done') delete s.handled[emailId];
    });
    Domain.adjustConfidence(1, `Learned: you want ${U.first(email.from)} follow-ups at ${due.time}`);
  },

  setTaskDone(emailId, done) {
    State.mutate((s) => {
      const task = s.tasks.find((t) => t.emailId === emailId);
      if (task) task.done = done;
      if (done) s.handled[emailId] = { type: 'done' };
      else if (s.handled[emailId]?.type === 'done') delete s.handled[emailId];
    });
  },

  sendReply(emailId, text, { edited = false } = {}) {
    const email = Domain.email(emailId);
    State.mutate((s) => {
      s.handled[emailId] = { type: 'replied' };
      const task = s.tasks.find((t) => t.emailId === emailId);
      if (task) task.done = true;
      s.sent.unshift({ emailId, to: email.from, subject: `Re: ${email.subject}`, text, kind: 'Reply' });
    });
    Domain.adjustConfidence(edited ? 2 : 3, edited ? `Learned: your edits to ${U.first(email.from)} replies` : `Learned: your style for ${U.first(email.from)} replies`);
  },

  forward(emailId, coworkerId, note) {
    const email = Domain.email(emailId);
    const person = DATA.coworkers[coworkerId];
    State.mutate((s) => {
      s.handled[emailId] = { type: 'forwarded', to: person.name };
      const task = s.tasks.find((t) => t.emailId === emailId);
      if (task) task.done = true;
      s.sent.unshift({ emailId, to: person.name, subject: `Fwd: ${email.subject}`, text: note, kind: 'Forward' });
    });
    Domain.adjustConfidence(3, `Learned: ${email.subject} type goes to ${U.first(person.name)}`);
  },

  /** Sort screen decision: swipe right = Priority, left = Later. */
  sortDecision(emailId, dir) {
    const email = Domain.email(emailId);
    State.mutate((s) => { s.sorted[emailId] = dir; });
    if (dir === 'priority') Domain.makePriority(emailId, { viaSuggestion: true });
    else if (Domain.isPriority(emailId)) Domain.notPriority(emailId);
    else Domain.adjustConfidence(1, `Learned: ${email.from} can wait`);
  },

  trash(emailId) { State.mutate((s) => { s.handled[emailId] = { type: 'trashed' }; }); },
  save(emailId) { State.mutate((s) => { s.saved[emailId] = true; }); },

  /** "Always prioritize Corey?" answers. Applies to all matching unhandled emails. */
  applySenderPref(senderName, pref) {
    let changed = 0;
    State.mutate((s) => {
      s.senderPrefs[senderName] = pref;
      DATA.emails.filter((e) => e.from === senderName && !s.handled[e.id]).forEach((e) => {
        const inPriority = s.priority.includes(e.id);
        if (pref === 'always' && !inPriority) { s.priority.push(e.id); changed += 1; }
        if (pref === 'later' && inPriority) { s.priority = s.priority.filter((x) => x !== e.id); changed += 1; }
      });
    });
    Domain.adjustConfidence(4, `Learned: always ${pref === 'always' ? 'prioritize' : 'defer'} ${senderName}`);
    return changed;
  },

  taskFor: (emailId) => State.get().tasks.find((t) => t.emailId === emailId),
};
