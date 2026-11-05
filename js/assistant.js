/* The floating "Priority Assistant" overlay on the desktop: next move, up next, learning state, confidence. */
const Assistant = {
  reasonFor(email) {
    const pref = State.get().senderPrefs[email.from];
    if (pref === 'always') return `You told me to always prioritize ${U.first(email.from)}`;
    return email.suggest?.why || `You usually answer ${U.first(email.from)} quickly`;
  },

  header(subtitle) {
    return `<div class="assistant-head"><span class="logo-spark">✦</span><div><b>Priority Assistant</b><div class="muted">${subtitle}</div></div>
      <button class="icon-btn" data-act="panel-toggle" aria-label="Collapse assistant">–</button></div>`;
  },

  modeSwitch() {
    const learning = State.get().mode === 'learning';
    return `<label class="switch-row" id="mode-switch"><span>Learning mode (week one)</span>
      <button class="switch${learning ? ' on' : ''}" role="switch" aria-checked="${learning}" data-act="set-mode" data-mode="${learning ? 'active' : 'learning'}"><span></span></button></label>`;
  },

  learningPanel() {
    const s = State.get();
    const { day, of, stats, notes } = DATA.learning;
    const stat = stats.map(([label, n], i) => `<div class="stat"><b>${i === 0 ? s.observed.opened : n}</b><span>${U.esc(label)}</span></div>`).join('');
    return `${Assistant.header(`Week one · day ${day} of ${of}`)}
      <div class="assistant-body">
        <div class="learn-card">
          <div class="learn-title">Week one: learning how you work</div>
          <p class="muted">I'm watching quietly. No suggestions and no changes to your inbox until week two.</p>
          <div class="progress" aria-label="Learning progress"><span style="width:${Math.round((day / of) * 100)}%"></span></div>
          <div class="muted small">Day ${day} of ${of}. Open a few emails and I'll count them.</div>
        </div>
        <div class="stat-grid">${stat}</div>
        <div class="field-label">What I've noticed so far</div>
        <ul class="notes">${notes.map((n) => `<li>${U.esc(n)}</li>`).join('')}</ul>
        <button class="btn btn-primary wide" data-act="set-mode" data-mode="active" id="skip-week2">Skip to week 2 (demo)</button>
      </div>
      <div class="assistant-foot">${Assistant.modeSwitch()}</div>`;
  },

  featuredCard(email) {
    const live = Suggestions.live(email);
    return `<div class="featured" data-tour="featured">
      <div class="eyebrow">NEXT MOVE</div>
      <div class="featured-title">${U.esc(email.headline || email.subject)}</div>
      <p class="muted">${U.esc(Assistant.reasonFor(email))}</p>
      <div class="btn-row">
        <button class="btn btn-primary" data-act="open-email" data-id="${email.id}">Open email</button>
        <button class="btn" data-act="open-remind" data-id="${email.id}">Remind</button>
        ${live ? `<button class="btn btn-soft" data-act="suggest-run" data-id="${email.id}">✦ ${U.esc(email.suggest.label)}</button>` : ''}
      </div></div>`;
  },

  upNextRow(email, index) {
    const live = Suggestions.live(email);
    const priority = Domain.isPriority(email.id);
    const chip = live ? Suggestions.chip(email) : { label: email.draft ? 'Draft' : 'Reply', act: 'open-draft' };
    return `<div class="next-row">
      <span class="next-rank">${priority ? index : '✦'}</span>
      <button class="next-main" data-act="open-email" data-id="${email.id}"><b>${U.esc(email.headline || email.subject)}</b>
        <span class="muted">${U.esc(live ? email.suggest.label : 'Open to review')}</span></button>
      <button class="pill-btn" data-act="${live && email.suggest.type === 'sort' ? 'accept-sort' : chip.act}" data-id="${email.id}">${U.esc(live && email.suggest.type === 'sort' ? 'Make priority' : chip.label.replace(/\?$/, '').replace(/^Forward to .*/, 'Forward'))}</button>
      ${live ? `<button class="icon-btn small" data-act="dismiss-suggestion" data-id="${email.id}" aria-label="Dismiss suggestion">×</button>` : ''}
    </div>`;
  },

  confidenceBlock() {
    const s = State.get();
    const why = s.whyOpen ? `<ul class="why-list">${Domain.priorityIds().map((id, i) => `<li><b>${i + 1}. ${U.esc(Domain.email(id).from)}</b> ${U.esc(Assistant.reasonFor(Domain.email(id)))}</li>`).join('') || '<li class="muted">Nothing in Priority yet.</li>'}</ul>` : '';
    return `<div class="confidence" data-tour="confidence">
      <div class="conf-head"><span>Sorting confidence</span><b id="confidence-value">${s.confidence}%</b></div>
      <div class="meter"><span style="width:${s.confidence}%"></span></div>
      <div class="muted small">${U.esc(s.lastLearned || 'Gets smarter every time you accept or correct a suggestion.')}</div>
      <button class="link-btn" data-act="toggle-why">${s.whyOpen ? 'Hide' : 'Why this order?'}</button>${why}
    </div>`;
  },

  activePanel() {
    const queue = Suggestions.queue();
    const priority = Domain.priorityIds();
    const featured = priority.length ? Domain.email(priority[0]) : null;
    const rest = queue.filter((e) => e !== featured).slice(0, 4);
    const upNext = rest.map((e, i) => Assistant.upNextRow(e, priority.indexOf(e.id) + 1)).join('');
    return `${Assistant.header('Week 2 · suggestions on')}
      <div class="assistant-body">
        ${featured ? Assistant.featuredCard(featured) : '<div class="featured"><div class="featured-title">You are caught up</div><p class="muted">Nothing in Priority needs you right now.</p></div>'}
        ${rest.length ? `<div class="field-label">Up next</div><div class="next-list">${upNext}</div>` : ''}
        ${Assistant.confidenceBlock()}
      </div>
      <div class="assistant-foot">${Assistant.modeSwitch()}</div>`;
  },

  render() {
    const s = State.get();
    const root = U.$('#assistant');
    if (!s.panelOpen) {
      const waiting = s.mode === 'active' ? Suggestions.queue().length : 0;
      root.innerHTML = `<button class="assistant-pill" data-act="panel-toggle">✦ Priority Assistant${waiting ? ` <span class="badge">${waiting}</span>` : ''}</button>`;
      return;
    }
    const scroll = U.$('.assistant-body', root)?.scrollTop || 0;
    root.innerHTML = `<div class="assistant-panel">${s.mode === 'learning' ? Assistant.learningPanel() : Assistant.activePanel()}</div>`;
    const body = U.$('.assistant-body', root);
    if (body) body.scrollTop = scroll;
  },

  install() {
    Actions.register({
      'panel-toggle': () => State.mutate((s) => { s.panelOpen = !s.panelOpen; }),
      'toggle-why': () => State.mutate((s) => { s.whyOpen = !s.whyOpen; }),
      'set-mode': (el) => {
        const mode = el.dataset.mode;
        State.mutate((s) => { s.mode = mode; });
        U.toast(mode === 'active' ? 'Week 2: suggestions are now on.' : 'Back to week one: learning quietly.', 'info');
      },
    });
  },
};
