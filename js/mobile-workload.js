/* Concept B: folders + workload stats, computed from the shared state. */
Mobile.screens.workload = {
  stats() {
    const s = State.get();
    const sent = s.sent.filter((m) => m.kind === 'Reply').length;
    const forwarded = s.sent.filter((m) => m.kind === 'Forward').length;
    const cap = (n) => Math.max(5, Math.min(98, n));
    return [
      { label: 'Priority', value: cap(20 + Domain.priorityIds().length * 3 - sent * 4), accent: true },
      { label: 'Project', value: 80 },
      { label: 'Updates', value: 53 },
      { label: 'Forwards', value: cap(23 + forwarded * 12) },
      { label: 'Reply fast', value: cap(40 + sent * 15) },
      { label: 'Track', value: 83 },
    ];
  },

  folderCounts() {
    const s = State.get();
    return DATA.folders.map((name) => ({ name, count: DATA.emails.filter((e) => e.folder === name && s.handled[e.id]?.type !== 'trashed').length }));
  },

  render() {
    const s = State.get();
    const stats = Mobile.screens.workload.stats();
    const dueSoon = DATA.calendar.filter((e) => ['Mon', 'Tue'].includes(e.day) && e.emailId && !s.handled[e.emailId]).length;
    const grid = stats.map((st) => `<div class="stat-card"><span class="muted">${st.label}</span><b>${st.value}%</b><div class="meter${st.accent ? '' : ' dim'}"><span style="width:${st.value}%"></span></div></div>`).join('');
    const folders = Mobile.screens.workload.folderCounts();
    const max = Math.max(...folders.map((f) => f.count), 1);
    return `${Mobile.header('Workload', { eyebrow: 'THIS WEEK', back: 'mobile/more' })}
      <div class="m-scroll"><div class="stat-cards">${grid}</div>
        <p class="workload-note">Project is coming in heavy. ${dueSoon} repl${dueSoon === 1 ? 'y is' : 'ies are'} due before Wednesday.</p>
        <div class="field-label">Auto-sorted folders</div>
        <div class="folder-list">${folders.map((f) => `<div class="folder-row"><span>${U.esc(f.name)}</span><div class="meter"><span style="width:${Math.round((f.count / max) * 100)}%"></span></div><b>${f.count}</b></div>`).join('')}</div>
      </div>`;
  },
};
