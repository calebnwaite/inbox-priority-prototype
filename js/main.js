/* Boot: wire modules, top bar, reset, global error handling. */
const App = {
  navKey(route) {
    if (route.screen === 'desktop') return 'desktop';
    return !route.view || route.view === 'task' ? 'inbox' : route.view;
  },

  renderChrome(route) {
    document.body.dataset.screen = route.screen;
    U.$('#screen-desktop').hidden = route.screen !== 'desktop';
    U.$('#screen-mobile').hidden = route.screen !== 'mobile';
    const key = App.navKey(route);
    U.$$('#proto-nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
  },

  reset() {
    State.reset();
    Desktop.query = '';
    Desktop.folder = 'inbox';
    U.$('#gm-search').value = '';
    Overlay.close(false);
    Tour.end();
    Router.go(Router.current().screen);
    Desktop.update();
    Mobile.update();
    U.toast('Demo reset. Sample data restored.', 'info');
  },

  boot() {
    window.addEventListener('error', (event) => U.fail('Something went wrong. Try Reset demo.', event.error || event.message));
    window.addEventListener('unhandledrejection', (event) => U.fail('Something went wrong. Try Reset demo.', event.reason));
    Actions.install();
    Overlay.install();
    Remind.install();
    DraftFlow.install();
    ForwardFlow.install();
    Suggestions.install();
    VoiceReply.install();
    Assistant.install();
    Desktop.install();
    MobileChrome.install();
    MobileDrawer.install();
    SuggestSheet.install();
    Mobile.install();
    Object.values(Mobile.screens).forEach((screen) => screen.install?.());
    Tour.install();
    Actions.register({ 'reset-demo': () => App.reset() });
    Router.onChange(App.renderChrome);
    Router.start();
    Desktop.update();
    Mobile.update();
    Tour.autoStart();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  try { App.boot(); } catch (error) { U.fail('The prototype failed to start. Try reloading.', error); }
});
