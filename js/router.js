/* Hash routing: #/desktop, #/desktop/email/e1, #/mobile, #/mobile/task/e1, #/mobile/sort ... */
const Router = {
  listeners: [],
  current() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'desktop').split('/');
    const screen = parts[0] === 'mobile' ? 'mobile' : 'desktop';
    return { screen, view: parts[1] || '', id: parts[2] || '', hash: location.hash };
  },
  go(path) { location.hash = `#/${path}`; },
  back(fallback) {
    if (history.length > 1 && document.referrer !== undefined && Router.navigatedInApp) history.back();
    else Router.go(fallback);
  },
  onChange(fn) { Router.listeners.push(fn); },
  start() {
    window.addEventListener('hashchange', () => { Router.navigatedInApp = true; Router.listeners.forEach((fn) => fn(Router.current())); });
    Router.listeners.forEach((fn) => fn(Router.current()));
  },
};
