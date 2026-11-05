/* Remind time picker. Adds the email to the shared to-do list (shows up on the phone). */
const Remind = {
  open(emailId, { onClose = null } = {}) {
    const email = Domain.email(emailId);
    if (!email) { U.fail('That email could not be found.', new Error(`unknown email ${emailId}`)); return; }
    const suggested = email.suggest?.type === 'remind' ? email.suggest.option : null;
    const options = Domain.remindOptions.map((opt) => `
      <button class="remind-option${opt.key === suggested ? ' suggested' : ''}" data-act="remind-pick" data-id="${emailId}" data-key="${opt.key}">
        <span>${U.esc(opt.label)}</span><span class="muted">${U.esc(Domain.dueLabel(opt.due))}</span>
        ${opt.key === suggested ? '<span class="pill pill-accent">Suggested</span>' : ''}
      </button>`).join('');
    const days = DATA.days.map((d) => `<option value="${d}">${d === DATA.now.day ? 'Today' : d}</option>`).join('');
    Overlay.show(`
      <div class="sheet-head"><b>Remind me</b><button class="icon-btn" data-act="overlay-close" aria-label="Close">×</button></div>
      <div class="sheet-meta">${U.esc(email.from)} · ${U.esc(email.subject)}</div>
      <div class="remind-list">${options}</div>
      <div class="remind-custom">
        <div class="field-label">Custom</div>
        <div class="row">
          <select id="remind-day" aria-label="Day">${days}</select>
          <input id="remind-time" type="time" value="16:30" aria-label="Time">
          <button class="btn btn-primary" data-act="remind-custom" data-id="${emailId}">Set reminder</button>
        </div>
      </div>
      <p class="fine">It will appear on your phone's Today list.</p>`, { onClose });
  },

  set(emailId, due) {
    Domain.addReminder(emailId, due);
    U.toast(`Reminder set for ${Domain.dueLabel(due)}. Added to your phone to-do.`);
    Overlay.done();
  },

  to12h(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value || '');
    if (!match) return null;
    const hours = Number(match[1]);
    return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
  },

  install() {
    Actions.register({
      'open-remind': (el) => Remind.open(el.dataset.id),
      'remind-pick': (el) => Remind.set(el.dataset.id, Domain.remindOptions.find((o) => o.key === el.dataset.key).due),
      'remind-custom': (el) => {
        const time = Remind.to12h(U.$('#remind-time').value);
        if (!time) { U.fail('Pick a time for the reminder first.', new Error('empty custom reminder time')); return; }
        Remind.set(el.dataset.id, { day: U.$('#remind-day').value, time });
      },
    });
  },
};
