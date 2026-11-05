/* One modal/bottom-sheet at a time, hosted inside whichever screen is visible. */
const Overlay = {
  onClose: null,
  host() {
    return U.$(Router.current().screen === 'mobile' ? '#phone-overlay' : '#desktop-overlay');
  },
  show(html, { onClose = null } = {}) {
    const host = Overlay.host();
    if (!host) { U.fail('Could not open that panel.', new Error('overlay host missing')); return; }
    Overlay.close(false);
    Overlay.onClose = onClose;
    host.innerHTML = `<div class="overlay-backdrop" data-act="overlay-backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    host.classList.add('open');
    const focusable = U.$('textarea, button.btn-primary', host);
    if (focusable) focusable.focus({ preventScroll: true });
  },
  /** Close and report why (done / cancelled) to whoever opened it. */
  close(notify = true, result = 'cancelled') {
    U.$$('.overlay-host.open').forEach((host) => { host.classList.remove('open'); host.innerHTML = ''; });
    const callback = Overlay.onClose;
    Overlay.onClose = null;
    if (notify && callback) callback(result);
  },
  done() { Overlay.close(true, 'done'); },
  install() {
    Actions.register({
      'overlay-close': () => Overlay.close(),
      'overlay-backdrop': (el, event) => { if (event.target === el) Overlay.close(); },
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') Overlay.close(); });
    Router.onChange(() => Overlay.close(false));
  },
};
