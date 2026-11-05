/* Approve / Edit / Dismiss flow for a drafted reply. Nothing is "sent" until Approve. Used by desktop, phone and voice. */
const DraftFlow = {
  ctx: null,

  open({ emailId, text, source = 'suggestion', transcript = '', onClose = null }) {
    const email = Domain.email(emailId);
    if (!email) { U.fail('That email could not be found.', new Error(`unknown email ${emailId}`)); return; }
    const blank = !text;
    DraftFlow.ctx = { emailId, original: text || '', source, editing: blank };
    const why = source === 'voice'
      ? `Cleaned up from your voice note: “${transcript}”`
      : (email.suggest?.why ? `Why: ${email.suggest.why}` : 'Write your reply below.');
    Overlay.show(`
      <div class="sheet-head"><b>${source === 'voice' ? 'Your voice reply' : 'Suggested reply'}</b><span class="pill pill-warn">Draft. Not sent yet</span></div>
      <div class="sheet-meta">To: ${U.esc(email.from)} &lt;${U.esc(email.addr)}&gt;<br>Subject: Re: ${U.esc(email.subject)}</div>
      <div class="why">${U.esc(why)}</div>
      <div id="draft-slot"></div>
      <div class="sheet-actions">
        <button class="btn btn-primary" data-act="draft-approve">Approve &amp; send</button>
        <button class="btn" data-act="draft-edit" id="draft-edit-btn">Edit</button>
        <button class="btn btn-ghost" data-act="draft-dismiss">${source === 'voice' ? 'Discard' : 'Dismiss'}</button>
      </div>
      <p class="fine">Nothing is sent until you approve it.</p>`, { onClose });
    DraftFlow.renderBody();
  },

  currentText() {
    const box = U.$('#draft-text');
    return box ? box.value.trim() : DraftFlow.ctx.text;
  },

  renderBody() {
    const { original, editing } = DraftFlow.ctx;
    DraftFlow.ctx.text = original;
    const slot = U.$('#draft-slot');
    slot.innerHTML = editing
      ? `<textarea id="draft-text" class="draft-edit" rows="6" aria-label="Edit your reply">${U.esc(original)}</textarea>`
      : `<div class="draft-body">${U.esc(original)}</div>`;
    U.$('#draft-edit-btn').textContent = editing ? 'Done editing' : 'Edit';
    if (editing) U.$('#draft-text').focus();
  },

  install() {
    Actions.register({
      'open-draft': (el) => {
        const email = Domain.email(el.dataset.id);
        DraftFlow.open({ emailId: email.id, text: email.draft || '', source: 'suggestion' });
      },
      'draft-edit': () => {
        const ctx = DraftFlow.ctx;
        if (ctx.editing) { ctx.original = DraftFlow.currentText(); ctx.edited = true; }
        ctx.editing = !ctx.editing;
        DraftFlow.renderBody();
      },
      'draft-approve': () => {
        const ctx = DraftFlow.ctx;
        const text = DraftFlow.currentText();
        if (!text) { U.fail('Write something before sending.', new Error('empty draft')); return; }
        Domain.sendReply(ctx.emailId, text, { edited: Boolean(ctx.edited) || text !== (Domain.email(ctx.emailId).draft || '') && ctx.source === 'suggestion' });
        U.toast('Sent (simulated)');
        Overlay.done();
      },
      'draft-dismiss': () => {
        const ctx = DraftFlow.ctx;
        if (ctx.source === 'suggestion' && Suggestions.live(Domain.email(ctx.emailId))) Domain.dismissSuggestion(ctx.emailId);
        U.toast(ctx.source === 'voice' ? 'Voice reply discarded' : 'Suggestion dismissed', 'info');
        Overlay.close();
      },
    });
  },
};
