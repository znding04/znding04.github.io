/* ============================================================
   2048
   Slide-and-merge puzzle on a 4x4 grid. Supports keyboard,
   d-pad buttons, and swipe gestures. Tiles use data-value
   attributes for CSS-driven neon coloring.
   ============================================================ */
(function () {
    const gridEl = document.getElementById('g2048-grid');
    const scoreEl = document.getElementById('g2048-score');
    const bestEl = document.getElementById('g2048-best');
    const startBtn = document.getElementById('g2048-start');

    let grid, score, best = 0, gameOverState = false;

    /* --- Initialize a fresh 4x4 grid with two random tiles --- */
    function init() {
        grid = Array.from({ length: 4 }, function () { return [0, 0, 0, 0]; });
        score = 0;
        gameOverState = false;
        scoreEl.textContent = '0';
        addRandom();
        addRandom();
        render();
    }

    /* Place a 2 (90%) or 4 (10%) on a random empty cell */
    function addRandom() {
        const empty = [];
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++)
                if (grid[r][c] === 0) empty.push({ r: r, c: c });
        if (empty.length === 0) return;
        const cell = empty[Math.floor(Math.random() * empty.length)];
        grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }

    /* --- Render the grid to DOM elements --- */
    function render() {
        gridEl.innerHTML = '';

        // Clean up any previous game-over overlay
        const oldOverlay = gridEl.parentElement.querySelector('.game2048-over-overlay');
        if (oldOverlay) oldOverlay.remove();

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'game2048-cell';
                const val = grid[r][c];
                if (val > 0) {
                    cell.textContent = val;
                    // Cap data-value at 2048 so CSS handles all higher tiles uniformly
                    cell.setAttribute('data-value', val > 2048 ? '2048' : String(val));
                }
                gridEl.appendChild(cell);
            }
        }

        if (gameOverState) {
            const overlay = document.createElement('div');
            overlay.className = 'game2048-over-overlay';
            overlay.textContent = 'Game Over!';
            gridEl.parentElement.appendChild(overlay);
        }
    }

    /*
     * Slide and merge a single row to the left.
     * Returns the resulting row of length 4.
     * Side-effect: increments `score` for each merge.
     */
    function slide(row) {
        const arr = row.filter(function (v) { return v !== 0; });
        const result = [];
        let i = 0;
        while (i < arr.length) {
            if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
                const merged = arr[i] * 2;
                result.push(merged);
                score += merged;
                i += 2;
            } else {
                result.push(arr[i]);
                i++;
            }
        }
        while (result.length < 4) result.push(0);
        return result;
    }

    /*
     * Execute a move in the given direction.
     * All directions are reduced to left-slides via row/column transposition.
     * Returns true if the board changed.
     */
    function move(direction) {
        if (gameOverState) return false;
        const oldGrid = grid.map(function (r) { return r.slice(); });

        if (direction === 'left') {
            for (let r = 0; r < 4; r++) grid[r] = slide(grid[r]);
        } else if (direction === 'right') {
            for (let r = 0; r < 4; r++) grid[r] = slide(grid[r].slice().reverse()).reverse();
        } else if (direction === 'up') {
            for (let c = 0; c < 4; c++) {
                let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
                col = slide(col);
                for (let r = 0; r < 4; r++) grid[r][c] = col[r];
            }
        } else if (direction === 'down') {
            for (let c = 0; c < 4; c++) {
                let col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
                col = slide(col);
                for (let r = 0; r < 4; r++) grid[3 - r][c] = col[r];
            }
        }

        // Detect if anything moved
        let changed = false;
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++)
                if (grid[r][c] !== oldGrid[r][c]) changed = true;

        if (changed) {
            addRandom();
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            if (isGameOver()) gameOverState = true;
            render();
        }
        return changed;
    }

    /* Check if no moves remain (no empty cells and no adjacent matches) */
    function isGameOver() {
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) return false;
                if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
                if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
            }
        return true;
    }

    startBtn.addEventListener('click', init);

    /* --- Keyboard: only respond when the 2048 tab is active --- */
    document.addEventListener('keydown', function (e) {
        if (!document.getElementById('game-2048').classList.contains('active')) return;
        if (gameOverState) return;
        switch (e.key) {
            case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); move('up');    break;
            case 'ArrowDown':  case 's': case 'S': e.preventDefault(); move('down');  break;
            case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); move('left');  break;
            case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move('right'); break;
        }
    });

    /* --- D-pad touch controls --- */
    document.querySelectorAll('[data-g2048]').forEach(function (btn) {
        function handle(e) { e.preventDefault(); move(btn.dataset.g2048); }
        btn.addEventListener('touchstart', handle, { passive: false });
        btn.addEventListener('mousedown', handle);
    });

    /* --- Swipe gesture support on the grid container --- */
    (function () {
        let startX, startY;
        const container = gridEl.parentElement;

        container.addEventListener('touchstart', function (e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener('touchend', function (e) {
            if (startX === undefined) return;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            const absDx = Math.abs(dx), absDy = Math.abs(dy);

            // Require a minimum swipe distance of 30px
            if (Math.max(absDx, absDy) < 30) return;

            if (absDx > absDy) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                move(dy > 0 ? 'down' : 'up');
            }
            startX = undefined;
        }, { passive: true });
    })();

    init();
})();
