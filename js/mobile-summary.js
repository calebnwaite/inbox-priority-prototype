/* Concept C: daily AI summary + "Ask about today's email" chat with keyword-matched canned answers. */
Mobile.screens.summary = {
  messages: [],   // {role: 'me' | 'ai', text}
  draft: '',
  timer: null,

  answer(question) {
    const q = question.toLowerCase();
    const hit = DATA.summary.answers.find((a) => a.keys.some((k) => q.includes(k)));
    return hit ? hit.text : DATA.summary.fallback;
  },

  chatHtml() {
    return Mobile.screens.summary.messages.map((m) => `<div class="bubble ${m.role}">${U.esc(m.text)}</div>`).join('');
  },

  render() {
    const sm = DATA.summary;
    const screen = Mobile.screens.summary;
    return `${Mobile.header('Daily Summary', { eyebrow: 'MONDAY MORNING' })}
      <div class="m-scroll" id="summary-scroll">
        <div class="field-label accent">Priority · in depth</div>
        ${sm.priority.map((p) => `<button class="summary-item" data-act="m-open-task" data-id="${p.emailId}"><b>${U.esc(p.who)}</b><span>${U.esc(p.text)}</span></button>`).join('')}
        <div class="field-label">Everything else · quick hits</div>
        ${sm.quickHits.map((p) => `<div class="quick-hit"><b>${U.esc(p.who)}</b> ${U.esc(p.text)}</div>`).join('')}
        <div class="field-label">Ask about today's email</div>
        <div class="chips">${sm.chips.map((c) => `<button class="chip" data-act="summary-ask" data-q="${U.esc(c)}">${U.esc(c)}</button>`).join('')}</div>
        <div class="chat" id="chat">${screen.chatHtml()}</div>
      </div>
      <form class="chat-form" id="chat-form" autocomplete="off">
        <input id="chat-input" type="text" placeholder="Ask about today's email…" aria-label="Ask about today's email" value="${U.esc(screen.draft)}">
        <button class="send-btn" type="submit" aria-label="Send">➤</button>
      </form>`;
  },

  ask(question) {
    const screen = Mobile.screens.summary;
    const text = question.trim();
    if (!text) { U.toast('Type a question first, or tap one of the suggestions.', 'info'); return; }
    screen.messages.push({ role: 'me', text });
    screen.draft = '';
    clearTimeout(screen.timer);
    screen.refresh();
    screen.timer = setTimeout(() => {
      screen.messages.push({ role: 'ai', text: screen.answer(text) });
      screen.refresh();
    }, 600);
  },

  refresh() {
    const chat = U.$('#chat');
    if (!chat) return;
    chat.innerHTML = Mobile.screens.summary.chatHtml();
    const input = U.$('#chat-input');
    if (input) input.value = Mobile.screens.summary.draft;
    const scroll = U.$('#summary-scroll');
    scroll.scrollTop = scroll.scrollHeight;
  },

  mount(root) {
    const screen = Mobile.screens.summary;
    U.$('#chat-form', root).addEventListener('submit', (event) => { event.preventDefault(); screen.ask(U.$('#chat-input').value); });
    U.$('#chat-input', root).addEventListener('input', (event) => { screen.draft = event.target.value; });
  },

  cleanup() { clearTimeout(Mobile.screens.summary.timer); },

  install() {
    Actions.register({ 'summary-ask': (el) => Mobile.screens.summary.ask(el.dataset.q) });
  },
};
