/* ============================================================
   SNAKE
   Grid-based snake game with gradient body coloring, glow
   effects on the head and food, and wall/self collision.
   Runs on a fixed interval (110ms per step).
   ============================================================ */
(function () {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('snake-start');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');

    const SIZE = 400, CELL = 20;
    const COLS = SIZE / CELL, ROWS = SIZE / CELL;
    const SPEED = 110; // ms between each step

    /* --- Responsive sizing --- */
    function resizeCanvas() {
        const maxW = canvas.parentElement.clientWidth - 48;
        const w = Math.min(SIZE, maxW);
        canvas.style.width = w + 'px';
        canvas.style.height = w + 'px';
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* --- State --- */
    let snake, dir, nextDir, food, score, best = 0;
    let running = false, paused = false, gameOver = false;
    let intervalId;

    /* --- Initialize a new game --- */
    function init() {
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        gameOver = false;
        paused = false;
        scoreEl.textContent = '0';
        placeFood();
    }

    /* Place food on a random empty cell */
    function placeFood() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } while (snake.some(function (s) { return s.x === pos.x && s.y === pos.y; }));
        food = pos;
    }

    /* --- Single game step: move, check collisions, grow or trim --- */
    function step() {
        if (paused || gameOver) return;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { endGame(); return; }
        // Self collision
        if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) { endGame(); return; }

        snake.unshift(head);

        // Check if food is eaten
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            placeFood();
        } else {
            snake.pop(); // remove tail to maintain length
        }

        draw();
    }

    function endGame() {
        gameOver = true;
        running = false;
        clearInterval(intervalId);
        startBtn.textContent = 'Try Again';
        draw();
    }

    /* --- Draw helpers --- */
    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
        }
        for (let i = 0; i <= ROWS; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
        }
    }

    /* --- Main draw --- */
    function draw() {
        ctx.clearRect(0, 0, SIZE, SIZE);
        drawGrid();

        // Food with neon glow
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#c084fc';
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Snake body: gradient from blue (head) to purple (tail)
        for (let i = 0; i < snake.length; i++) {
            const s = snake[i];
            const t = i / snake.length;
            const r = Math.round(102 + (118 - 102) * t);
            const g = Math.round(126 + (75 - 126) * t);
            const b = Math.round(234 + (162 - 234) * t);

            if (i === 0) { ctx.shadowBlur = 12; ctx.shadowColor = '#667eea'; }
            ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
            ctx.beginPath();
            ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Overlay messages
        if (paused) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', SIZE / 2, SIZE / 2);
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.6)';
            ctx.fillRect(0, 0, SIZE, SIZE);
            ctx.fillStyle = '#c084fc';
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#c084fc';
            ctx.font = '700 24px Courier New, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', SIZE / 2, SIZE / 2 - 10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('Score: ' + score, SIZE / 2, SIZE / 2 + 18);
        }
    }

    /* --- Idle screen shown before first game --- */
    function drawIdle() {
        ctx.clearRect(0, 0, SIZE, SIZE);
        drawGrid();

        // Static demo snake
        const demo = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        for (let i = 0; i < demo.length; i++) {
            ctx.fillStyle = i === 0 ? '#667eea' : '#764ba2';
            ctx.beginPath();
            ctx.roundRect(demo[i].x * CELL + 1, demo[i].y * CELL + 1, CELL - 2, CELL - 2, 4);
            ctx.fill();
        }

        // Demo food
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(14 * CELL + CELL / 2, 10 * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Start to Play', SIZE / 2, SIZE / 2 + 60);
    }

    /* --- Start / restart --- */
    startBtn.addEventListener('click', function () {
        init();
        running = true;
        startBtn.textContent = 'Restart';
        clearInterval(intervalId);
        draw();
        intervalId = setInterval(step, SPEED);
    });

    /* --- Keyboard: only respond when the Snake tab is active --- */
    document.addEventListener('keydown', function (e) {
        if (!document.getElementById('game-snake').classList.contains('active')) return;
        if (e.key === ' ' && running && !gameOver) { e.preventDefault(); paused = !paused; draw(); return; }
        if (!running || paused || gameOver) return;

        // Prevent 180-degree reversal by checking current direction
        switch (e.key) {
            case 'ArrowUp':    case 'w': case 'W': if (dir.y !== 1)  nextDir = { x: 0, y: -1 }; e.preventDefault(); break;
            case 'ArrowDown':  case 's': case 'S': if (dir.y !== -1) nextDir = { x: 0, y: 1 };  e.preventDefault(); break;
            case 'ArrowLeft':  case 'a': case 'A': if (dir.x !== 1)  nextDir = { x: -1, y: 0 }; e.preventDefault(); break;
            case 'ArrowRight': case 'd': case 'D': if (dir.x !== -1) nextDir = { x: 1, y: 0 };  e.preventDefault(); break;
        }
    });

    /* --- D-pad touch controls --- */
    document.querySelectorAll('[data-snake]').forEach(function (btn) {
        function handle(e) {
            e.preventDefault();
            if (!running || paused || gameOver) return;
            const d = btn.dataset.snake;
            if (d === 'up'    && dir.y !== 1)  nextDir = { x: 0, y: -1 };
            if (d === 'down'  && dir.y !== -1) nextDir = { x: 0, y: 1 };
            if (d === 'left'  && dir.x !== 1)  nextDir = { x: -1, y: 0 };
            if (d === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
        }
        btn.addEventListener('touchstart', handle, { passive: false });
        btn.addEventListener('mousedown', handle);
    });

    drawIdle();
})();
