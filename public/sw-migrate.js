// One-time cleanup of service workers / caches from older builds (was an inline
// <script> in index.html; moved here so the Content-Security-Policy can stay 'self').
(function () {
  var V = 'nq21-sw-v2';
  try {
    if (localStorage.getItem('sw_migrated') === V) return;
  } catch (e) {
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    });
  }
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) { caches.delete(k); });
    });
  }
  localStorage.setItem('sw_migrated', V);
})();
