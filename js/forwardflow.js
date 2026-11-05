/* Forward suggestion with approve / change person / edit note / dismiss. Nothing goes out until Approve. */
const ForwardFlow = {
  ctx: null,

  open(emailId, { onClose = null } = {}) {
    const email = Domain.email(emailId);
    if (!email) { U.fail('That email could not be found.', new Error(`unknown email ${emailId}`)); return; }
    const suggested = email.suggest?.type === 'forward' ? email.suggest.to : 'thomas';
    ForwardFlow.ctx = { emailId, to: suggested };
    Overlay.show(`
      <div class="sheet-head"><b>Forward this email</b><span class="pill pill-warn">Draft. Not sent yet</span></div>
      <div class="sheet-meta">${U.esc(email.from)} · ${U.esc(email.subject)}</div>
      <div id="forward-slot"></div>
      <div class="field-label">Note to add</div>
      <textarea id="forward-note" class="draft-edit" rows="3" aria-label="Note to add">${U.esc(email.note || '')}</textarea>
      <div class="sheet-actions">
        <button class="btn btn-primary" data-act="forward-approve">Approve &amp; forward</button>
        <button class="btn btn-ghost" data-act="forward-dismiss">Dismiss</button>
      </div>
      <p class="fine">Nothing is sent until you approve it.</p>`, { onClose });
    ForwardFlow.renderPerson();
  },

  renderPerson() {
    const email = Domain.email(ForwardFlow.ctx.emailId);
    const person = DATA.coworkers[ForwardFlow.ctx.to];
    const isSuggested = email.suggest?.type === 'forward' && email.suggest.to === person.id;
    const others = Object.values(DATA.coworkers).filter((c) => c.id !== person.id).map((c) =>
      `<button class="chip" data-act="forward-change" data-to="${c.id}">${U.esc(U.first(c.name))}</button>`).join('');
    U.$('#forward-slot').innerHTML = `
      <div class="person-card">
        ${U.avatar(person.name, 40)}
        <div><b>Forward to ${U.esc(U.first(person.name))}</b>${isSuggested ? ' <span class="pill pill-accent">Suggested</span>' : ''}
        <div class="muted">${U.esc(person.name)} · ${U.esc(person.role)} · ${U.esc(person.owns)}</div></div>
      </div>
      ${isSuggested && email.suggest.why ? `<div class="why">Why: ${U.esc(email.suggest.why)}</div>` : ''}
      <div class="chips"><span class="muted">Someone else?</span> ${others}</div>`;
  },

  install() {
    Actions.register({
      'open-forward': (el) => ForwardFlow.open(el.dataset.id),
      'forward-change': (el) => { ForwardFlow.ctx.to = el.dataset.to; ForwardFlow.renderPerson(); },
      'forward-approve': () => {
        const { emailId, to } = ForwardFlow.ctx;
        const note = U.$('#forward-note').value.trim();
        Domain.forward(emailId, to, note);
        U.toast(`Forwarded to ${U.first(DATA.coworkers[to].name)} (simulated)`);
        Overlay.done();
      },
      'forward-dismiss': () => {
        const { emailId } = ForwardFlow.ctx;
        if (Suggestions.live(Domain.email(emailId))) Domain.dismissSuggestion(emailId);
        U.toast('Suggestion dismissed', 'info');
        Overlay.close();
      },
    });
  },
};
