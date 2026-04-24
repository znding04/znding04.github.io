/* ============================================================
   TAB SWITCHING
   Toggles active class on tabs and corresponding game panels.
   ============================================================ */
document.querySelectorAll('.game-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.game-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.game-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('game-' + tab.dataset.game).classList.add('active');
    });
});
