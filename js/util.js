/* Shared helpers: escaping, DOM lookup, toasts, error reporting, click-action registry. */
const U = {
  esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  $(selector, root = document) { return root.querySelector(selector); },
  $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },
  first(name) { return String(name).split(' ')[0]; },
  initials(name) { return String(name).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); },
  avatarColor(name) {
    const palette = ['#E8590C', '#2F6F9F', '#5B8C5A', '#8A5CA8', '#B5651D', '#3D7F7B', '#A33B5B', '#5C6B7A'];
    let hash = 0;
    for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[hash % palette.length];
  },
  avatar(name, size = 32) {
    return `<span class="avatar" style="width:${size}px;height:${size}px;background:${U.avatarColor(name)};font-size:${Math.round(size * 0.4)}px">${U.esc(U.initials(name))}</span>`;
  },
  toast(message, kind = 'ok') {
    const host = U.$('#toast-host');
    if (!host) { console.warn('Toast host missing:', message); return; }
    const node = document.createElement('div');
    node.className = `toast toast-${kind}`;
    node.setAttribute('role', 'status');
    node.textContent = message;
    while (host.children.length >= 2) host.firstChild.remove();
    host.appendChild(node);
    setTimeout(() => node.classList.add('toast-out'), 2600);
    setTimeout(() => node.remove(), 3100);
  },
  /** Every failure: console record + visible message. */
  fail(userMessage, error) {
    console.error(userMessage, error || '');
    U.toast(userMessage, 'error');
  },
  warn(why, error) { console.warn(why, error || ''); },
};

/** Click-action registry: elements carry data-act="name"; modules register handlers. */
const Actions = {
  handlers: {},
  register(map) { Object.assign(Actions.handlers, map); },
  /** Run a registered action by name (menus that forward to another action). */
  run(name, el, event) {
    const handler = Actions.handlers[name];
    if (!handler) { U.fail(`Unknown action "${name}".`); return; }
    handler(el, event);
  },
  install() {
    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-act]');
      if (!el) return;
      const handler = Actions.handlers[el.dataset.act];
      if (!handler) { U.fail(`Unknown action "${el.dataset.act}".`); return; }
      try { handler(el, event); } catch (error) { U.fail('Something went wrong with that action. Try Reset demo.', error); }
    });
  },
};
