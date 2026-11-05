/* What the assistant suggests per email, and the click actions that run a suggestion. */
const Suggestions = {
  live(email) {
    const s = State.get();
    return Boolean(email && email.suggest && s.mode === 'active' && !s.handled[email.id] && !s.dismissed[email.id]);
  },

  /** Button label and action for an email's suggestion. */
  chip(email) {
    const { type, label } = email.suggest;
    if (type === 'reply') return { label: email.draft ? 'Draft' : 'Reply', act: 'open-draft' };
    if (type === 'forward') return { label: `${label}?`, act: 'open-forward' };
    if (type === 'remind') return { label: label.endsWith('?') ? label : 'Remind me', act: 'open-remind' };
    return { label: `${label}?`, act: 'accept-sort' };
  },

  /** Ordered list for the assistant: priority emails by rank, then live suggestions elsewhere. */
  queue() {
    const prioritized = Domain.priorityIds().map(Domain.email);
    const elsewhere = Domain.otherIds().map(Domain.email).filter((e) => Suggestions.live(e));
    return [...prioritized, ...elsewhere];
  },

  /** One-line description of the suggested action (assistant panel rows). */
  summaryLine(email) {
    if (!Suggestions.live(email)) return 'Open to review';
    return email.suggest.label;
  },

  install() {
    Actions.register({
      'suggest-run': (el) => {
        const email = Domain.email(el.dataset.id);
        const type = Suggestions.live(email) ? email.suggest.type : 'reply';
        if (type === 'forward') ForwardFlow.open(email.id);
        else if (type === 'remind') Remind.open(email.id);
        else if (type === 'sort') Actions.handlers['accept-sort'](el);
        else DraftFlow.open({ emailId: email.id, text: email.draft || '' });
      },
      'accept-sort': (el) => {
        const email = Domain.email(el.dataset.id);
        Domain.makePriority(email.id, { viaSuggestion: true });
        U.toast(`${email.subject} moved to Priority`);
      },
      'make-priority': (el) => { Domain.makePriority(el.dataset.id); U.toast('Moved to Priority. The assistant will learn from this.'); },
      'not-priority': (el) => { Domain.notPriority(el.dataset.id); U.toast('Moved to Everything else. The assistant will learn from this.'); },
      'dismiss-suggestion': (el) => { Domain.dismissSuggestion(el.dataset.id); U.toast('Suggestion dismissed', 'info'); },
    });
  },
};
