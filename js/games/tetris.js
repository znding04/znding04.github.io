/* ============================================================
   TETRIS
   Classic falling-block puzzle with neon-themed pieces, ghost
   piece preview, next-piece display, level progression, and
   line-clear effects. Canvas-rendered at 300x600 (10x20 grid).
   ============================================================ */
(function () {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('tetris-next');
    const nextCtx = nextCanvas.getContext('2d');
    const startBtn = document.getElementById('tetris-start');
    const scoreEl = document.getElementById('tetris-score');
    const levelEl = document.getElementById('tetris-level');
    const linesEl = document.getElementById('tetris-lines');

    /* --- Responsive sizing --- */
    function resizeCanvas() {
        const maxW = canvas.parentElement.clientWidth - 48;
        const w = Math.min(300, maxW);
        canvas.style.width = w + 'px';
        canvas.style.height = (w * 2) + 'px';
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* --- Constants --- */
    const COLS = 10, ROWS = 20, CELL = 30;
    const W = COLS * CELL, H = ROWS * CELL;

    /* Tetromino shapes: each is an array of rotations, each rotation is an array of [row, col] offsets */
    const SHAPES = {
        I: { blocks: [[[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]]], color: '#0ff' },
        O: { blocks: [[[0,0],[0,1],[1,0],[1,1]],  [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0],[1,1]]], color: '#667eea' },
        T: { blocks: [[[0,0],[0,1],[0,2],[1,1]],  [[0,0],[1,0],[2,0],[1,1]], [[1,0],[1,1],[1,2],[0,1]], [[0,0],[1,0],[2,0],[1,-1]]], color: '#c084fc' },
        S: { blocks: [[[0,1],[0,2],[1,0],[1,1]],  [[0,0],[1,0],[1,1],[2,1]], [[0,1],[0,2],[1,0],[1,1]], [[0,0],[1,0],[1,1],[2,1]]], color: '#4ade80' },
        Z: { blocks: [[[0,0],[0,1],[1,1],[1,2]],  [[0,1],[1,0],[1,1],[2,0]], [[0,0],[0,1],[1,1],[1,2]], [[0,1],[1,0],[1,1],[2,0]]], color: '#f87171' },
        J: { blocks: [[[0,0],[1,0],[1,1],[1,2]],  [[0,0],[0,1],[1,0],[2,0]], [[0,0],[0,1],[0,2],[1,2]], [[0,0],[1,0],[2,0],[2,-1]]], color: '#764ba2' },
        L: { blocks: [[[0,2],[1,0],[1,1],[1,2]],  [[0,0],[1,0],[2,0],[2,1]], [[0,0],[0,1],[0,2],[1,0]], [[0,0],[0,1],[1,1],[2,1]]], color: '#fb923c' }
    };
    const SHAPE_KEYS = Object.keys(SHAPES);

    /* Neon glow colors per piece (slightly transparent for the glow effect) */
    const GLOW_ALPHA = 0.4;

    /* --- State --- */
    let board, current, next, pos, rotation, score, level, lines, running, paused, gameOver;
    let dropInterval, dropTimer, lastTime;
    let rafId;

    /* --- Helpers --- */
    function randomPiece() {
        const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
        return { key: key, shape: SHAPES[key] };
    }

    function getBlocks(piece, rot) {
        return piece.shape.blocks[rot % piece.shape.blocks.length];
    }

    /* Check if placing piece at (r,c) with given rotation is valid */
    function isValid(piece, rot, r, c) {
        const blocks = getBlocks(piece, rot);
        for (let i = 0; i < blocks.length; i++) {
            const nr = r + blocks[i][0];
            const nc = c + blocks[i][1];
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
            if (board[nr][nc]) return false;
        }
        return true;
    }

    /* Lock the current piece into the board */
    function lock() {
        const blocks = getBlocks(current, rotation);
        for (let i = 0; i < blocks.length; i++) {
            const r = pos.r + blocks[i][0];
            const c = pos.c + blocks[i][1];
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                board[r][c] = current.shape.color;
            }
        }
    }

    /* Clear completed lines and return count */
    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(function (cell) { return cell !== null; })) {
                board.splice(r, 1);
                board.unshift(new Array(COLS).fill(null));
                cleared++;
                r++; // re-check this row since rows shifted down
            }
        }
        return cleared;
    }

    /* Score system: 1 line = 100, 2 = 300, 3 = 500, 4 (Tetris) = 800, multiplied by level */
    const LINE_SCORES = [0, 100, 300, 500, 800];

    /* Calculate ghost piece Y position (where the piece would land) */
    function ghostRow() {
        let gr = pos.r;
        while (isValid(current, rotation, gr + 1, pos.c)) gr++;
        return gr;
    }

    /* --- Init --- */
    function init() {
        board = [];
        for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
        score = 0; level = 1; lines = 0;
        scoreEl.textContent = '0';
        levelEl.textContent = '1';
        linesEl.textContent = '0';
        running = true;
        paused = false;
        gameOver = false;
        dropInterval = 1000; // ms, decreases with level
        dropTimer = 0;
        lastTime = 0;
        current = randomPiece();
        next = randomPiece();
        rotation = 0;
        pos = { r: 0, c: Math.floor(COLS / 2) - 1 };
        drawNext();
    }

    /* --- Spawn next piece --- */
    function spawnPiece() {
        current = next;
        next = randomPiece();
        rotation = 0;
        pos = { r: 0, c: Math.floor(COLS / 2) - 1 };

        // If the new piece can't be placed, game over
        if (!isValid(current, rotation, pos.r, pos.c)) {
            gameOver = true;
            running = false;
            startBtn.textContent = 'Try Again';
        }
        drawNext();
    }

    /* --- Movement --- */
    function moveLeft() {
        if (isValid(current, rotation, pos.r, pos.c - 1)) pos.c--;
    }
    function moveRight() {
        if (isValid(current, rotation, pos.r, pos.c + 1)) pos.c++;
    }
    function moveDown() {
        if (isValid(current, rotation, pos.r + 1, pos.c)) {
            pos.r++;
            return true;
        }
        return false;
    }
    function hardDrop() {
        while (isValid(current, rotation, pos.r + 1, pos.c)) {
            pos.r++;
            score += 2; // bonus points for hard drop
        }
        lockAndAdvance();
    }
    function rotate() {
        const newRot = (rotation + 1) % 4;
        // Try basic rotation, then wall kicks at offsets -1 and +1
        if (isValid(current, newRot, pos.r, pos.c)) {
            rotation = newRot;
        } else if (isValid(current, newRot, pos.r, pos.c - 1)) {
            rotation = newRot; pos.c--;
        } else if (isValid(current, newRot, pos.r, pos.c + 1)) {
            rotation = newRot; pos.c++;
        } else if (isValid(current, newRot, pos.r - 1, pos.c)) {
            rotation = newRot; pos.r--;
        }
    }

    function lockAndAdvance() {
        lock();
        const cleared = clearLines();
        if (cleared > 0) {
            lines += cleared;
            score += LINE_SCORES[Math.min(cleared, 4)] * level;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 80);
            scoreEl.textContent = score;
            levelEl.textContent = level;
            linesEl.textContent = lines;
        }
        scoreEl.textContent = score;
        spawnPiece();
    }

    /* --- Drawing --- */
    function drawCell(ctx, x, y, size, color, glow) {
        if (glow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, size - 2, size - 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner highlight for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x + 2, y + 2, size - 4, 3);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
        }

        // Locked cells
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawCell(ctx, c * CELL, r * CELL, CELL, board[r][c], true);
                }
            }
        }

        if (!current || gameOver) return;

        // Ghost piece (landing preview)
        const gr = ghostRow();
        const ghostBlocks = getBlocks(current, rotation);
        for (let i = 0; i < ghostBlocks.length; i++) {
            const r = gr + ghostBlocks[i][0];
            const c = pos.c + ghostBlocks[i][1];
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.roundRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, 3);
                ctx.fill();
            }
        }

        // Current piece
        const blocks = getBlocks(current, rotation);
        for (let i = 0; i < blocks.length; i++) {
            const r = pos.r + blocks[i][0];
            const c = pos.c + blocks[i][1];
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                drawCell(ctx, c * CELL, r * CELL, CELL, current.shape.color, true);
            }
        }
    }

    function drawNext() {
        const size = 20;
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const blocks = getBlocks(next, 0);

        // Center the preview piece
        let minR = 4, maxR = 0, minC = 4, maxC = 0;
        for (let i = 0; i < blocks.length; i++) {
            minR = Math.min(minR, blocks[i][0]);
            maxR = Math.max(maxR, blocks[i][0]);
            minC = Math.min(minC, blocks[i][1]);
            maxC = Math.max(maxC, blocks[i][1]);
        }
        const pieceH = maxR - minR + 1;
        const pieceW = maxC - minC + 1;
        const offX = (nextCanvas.width - pieceW * size) / 2 - minC * size;
        const offY = (nextCanvas.height - pieceH * size) / 2 - minR * size;

        for (let i = 0; i < blocks.length; i++) {
            const x = offX + blocks[i][1] * size;
            const y = offY + blocks[i][0] * size;
            drawCell(nextCtx, x, y, size, next.shape.color, false);
        }
    }

    function drawOverlay(msg) {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.65)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c084fc';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#c084fc';
        ctx.font = '700 24px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(msg, W / 2, H / 2 - 10);
        ctx.shadowBlur = 0;
        if (gameOver) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('Score: ' + score, W / 2, H / 2 + 18);
        }
    }

    function drawIdle() {
        ctx.clearRect(0, 0, W, H);
        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
        }

        // Draw a few static pieces as decoration
        const demoBlocks = [
            { r: 18, c: 0, color: '#0ff' }, { r: 18, c: 1, color: '#0ff' }, { r: 18, c: 2, color: '#0ff' }, { r: 18, c: 3, color: '#0ff' },
            { r: 19, c: 0, color: '#764ba2' }, { r: 19, c: 1, color: '#764ba2' }, { r: 19, c: 2, color: '#667eea' }, { r: 19, c: 3, color: '#667eea' },
            { r: 19, c: 4, color: '#c084fc' }, { r: 19, c: 5, color: '#c084fc' }, { r: 19, c: 6, color: '#c084fc' },
            { r: 18, c: 5, color: '#c084fc' },
            { r: 19, c: 7, color: '#4ade80' }, { r: 19, c: 8, color: '#4ade80' }, { r: 18, c: 8, color: '#4ade80' }, { r: 18, c: 9, color: '#4ade80' }
        ];
        for (let i = 0; i < demoBlocks.length; i++) {
            const b = demoBlocks[i];
            drawCell(ctx, b.c * CELL, b.r * CELL, CELL, b.color, true);
        }

        // Falling T-piece
        const tBlocks = [[12, 4], [12, 5], [12, 6], [13, 5]];
        for (let i = 0; i < tBlocks.length; i++) {
            drawCell(ctx, tBlocks[i][1] * CELL, tBlocks[i][0] * CELL, CELL, '#c084fc', true);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Start to Play', W / 2, H / 2 - 40);
    }

    /* --- Game loop --- */
    function loop(time) {
        if (!running) return;
        rafId = requestAnimationFrame(loop);

        if (paused) {
            drawBoard();
            drawOverlay('PAUSED');
            return;
        }

        const delta = time - lastTime;
        lastTime = time;
        dropTimer += delta;

        // Auto-drop the piece at the current interval
        if (dropTimer >= dropInterval) {
            dropTimer = 0;
            if (!moveDown()) {
                lockAndAdvance();
            }
        }

        drawBoard();

        if (gameOver) {
            drawOverlay('GAME OVER');
        }
    }

    /* --- Start / restart --- */
    startBtn.addEventListener('click', function () {
        init();
        startBtn.textContent = 'Restart';
        cancelAnimationFrame(rafId);
        lastTime = performance.now();
        dropTimer = 0;
        rafId = requestAnimationFrame(loop);
    });

    /* --- Keyboard: only respond when the Tetris tab is active --- */
    document.addEventListener('keydown', function (e) {
        if (!document.getElementById('game-tetris').classList.contains('active')) return;
        if (!running) return;

        if (e.key === ' ') {
            e.preventDefault();
            if (gameOver) return;
            paused = !paused;
            if (!paused) { lastTime = performance.now(); dropTimer = 0; }
            return;
        }

        if (paused || gameOver) return;

        switch (e.key) {
            case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); moveLeft();  break;
            case 'ArrowRight': case 'd': case 'D': e.preventDefault(); moveRight(); break;
            case 'ArrowDown':  case 's': case 'S': e.preventDefault(); moveDown(); score += 1; scoreEl.textContent = score; break;
            case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); rotate();    break;
            case 'Enter': e.preventDefault(); hardDrop(); break;
        }
    });

    /* --- D-pad touch controls --- */
    document.querySelectorAll('[data-tetris]').forEach(function (btn) {
        function handle(e) {
            e.preventDefault();
            if (!running || paused || gameOver) return;
            const d = btn.dataset.tetris;
            if (d === 'left')  moveLeft();
            if (d === 'right') moveRight();
            if (d === 'down')  { moveDown(); score += 1; scoreEl.textContent = score; }
            if (d === 'up')    rotate();
            if (d === 'drop')  hardDrop();
        }
        btn.addEventListener('touchstart', handle, { passive: false });
        btn.addEventListener('mousedown', handle);
    });

    drawIdle();

    // Clear the next-piece preview on load
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
})();
