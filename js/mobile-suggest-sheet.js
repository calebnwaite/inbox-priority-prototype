/* Bottom sheet with the assistant's suggested next move for one email, and the other ways to handle it. */
const SuggestSheet = {
  primaryLabel(email) {
    if (!Suggestions.live(email) || email.suggest.type === 'reply') return email.draft ? 'Review drafted reply' : 'Write a reply';
    return email.suggest.label.replace(/\?$/, '');
  },

  open(emailId) {
    const email = Domain.email(emailId);
    if (!email) { U.fail('That email could not be found.', new Error(`unknown email ${emailId}`)); return; }
    const ranked = State.get().mode === 'active' ? Domain.priorityIds() : [];
    const rank = ranked.indexOf(emailId) + 1;
    const live = Suggestions.live(email);
    Overlay.show(`
      <div class="m-suggest" data-id="${email.id}">
        <div class="m-assist-kicker">${Icon.svg('spark', 18)}Priority Assistant${rank ? ` · #${rank} of ${ranked.length}` : ''}</div>
        <h2 class="m-suggest-title">${U.esc(email.headline || email.subject)}</h2>
        <div class="m-suggest-from">${U.avatar(email.from, 32)}<span><b>${U.esc(email.from)}</b> · ${U.esc(email.subject)}</span></div>
        <div class="why">${live ? U.esc(email.suggest.why) : 'No suggestion right now. Pick what to do with it.'}</div>
        <div class="m-sheet-actions">
          <button class="btn btn-primary" data-act="suggest-run" data-id="${email.id}">${U.esc(SuggestSheet.primaryLabel(email))}</button>
          <div class="btn-row two">
            <button class="btn" data-act="open-remind" data-id="${email.id}">${Icon.svg('alarm', 18)}Remind me</button>
            <button class="btn" data-act="open-voice" data-id="${email.id}">${Icon.svg('mic', 18)}Voice reply</button>
          </div>
          <div class="btn-row two">
            <button class="btn btn-ghost" data-act="m-open-task" data-id="${email.id}">Open email</button>
            ${rank ? `<button class="btn btn-ghost" data-act="m-sheet-run" data-run="not-priority" data-id="${email.id}">Not priority</button>`
              : `<button class="btn btn-ghost" data-act="m-sheet-run" data-run="make-priority" data-id="${email.id}">Make priority</button>`}
          </div>
          ${live ? `<button class="btn btn-ghost" data-act="m-sheet-run" data-run="dismiss-suggestion" data-id="${email.id}">Dismiss suggestion</button>` : ''}
        </div>
      </div>`);
  },

  install() {
    Actions.register({ 'm-suggest-sheet': (el) => SuggestSheet.open(el.dataset.id) });
  },
};
