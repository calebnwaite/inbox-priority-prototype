/* Hash routing: #/desktop, #/desktop/email/e1, #/mobile, #/mobile/task/e1, #/mobile/sort ...
   With no hash, phones (same query as the full-screen CSS) open the phone app; laptops open the desktop. */
const Router = {
  PHONE_QUERY: '(max-width: 600px), (pointer: coarse) and (max-height: 500px)',
  listeners: [],
  isPhone() { return Boolean(window.matchMedia?.(Router.PHONE_QUERY).matches); },
  current() {
    const parts = (location.hash.replace(/^#\/?/, '') || (Router.isPhone() ? 'mobile' : 'desktop')).split('/');
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
