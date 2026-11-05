/* Phone To-do (Today): the extension's synced task list. Checking one off updates the desktop inbox too. */
Mobile.screens.todo = {
  card(task) {
    const email = Domain.email(task.emailId);
    return `<div class="task-card${task.done ? ' done' : ''}">
      <button class="check-btn${task.done ? ' on' : ''}" data-act="m-toggle-task" data-id="${task.emailId}" aria-label="${task.done ? 'Mark not done' : 'Mark done'}" aria-pressed="${task.done}"><span class="check-face">${task.done ? Icon.svg('check', 18) : ''}</span></button>
      <button class="task-main" data-act="m-open-task" data-id="${task.emailId}">
        <b>${U.esc(task.title)}</b><span class="muted">${U.esc(task.sub || email.from)}</span>
        ${task.due ? `<span class="due${task.reminder ? ' reminder' : ''}">${Icon.svg('alarm', 14)}${U.esc(Domain.dueLabel(task.due))}</span>` : ''}
      </button></div>`;
  },

  render() {
    const screen = Mobile.screens.todo;
    const tasks = State.get().tasks;
    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    return `${Mobile.header('To-do', { eyebrow: 'TODAY · MONDAY', right: MobileChrome.avatarButton() })}
      <div class="m-scroll">
        <div class="muted m-sub" data-tour="m-count">${open.length ? `${open.length} thing${open.length === 1 ? '' : 's'} need you today` : 'All clear. Enjoy your evening.'}</div>
        <div class="task-list" data-tour="m-list">${open.map(screen.card).join('') || '<div class="empty">Nothing left. You are done for the day.</div>'}</div>
        ${done.length ? `<div class="field-label">Done</div><div class="task-list">${done.map(screen.card).join('')}</div>` : ''}
      </div>
      ${MobileChrome.fab({ label: 'Record a reply', icon: 'mic', act: 'm-record', tour: 'm-record' })}`;
  },

  install() {
    Actions.register({
      'm-record': () => {
        const next = State.get().tasks.find((t) => !t.done);
        if (!next) { U.toast('Nothing left to reply to. You are all caught up.', 'info'); return; }
        VoiceReply.open(next.emailId);
      },
    });
  },
};
