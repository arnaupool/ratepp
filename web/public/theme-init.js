// Applies the saved theme before first paint so dark mode doesn't flash
// light. A separate file (not an inline script) so the CSP can stay at
// script-src 'self'.
(function () {
  try {
    if (localStorage.getItem('puntuaciones_theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    /* storage unavailable: stay on the light default */
  }
})();
