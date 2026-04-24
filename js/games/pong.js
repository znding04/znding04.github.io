/* ============================================================
   PONG
   Classic two-paddle game with AI opponent, particle effects,
   and progressive ball speed. Canvas resolution is fixed at
   760x400; CSS scales it responsively.
   ============================================================ */
(function () {
    const canvas = document.getElementById('pong-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('pong-start');
    const scoreLeftEl = document.getElementById('score-left');
    const scoreRightEl = document.getElementById('score-right');

    /* --- Responsive sizing --- */
    function resizeCanvas() {
        const maxW = canvas.parentElement.clientWidth - 48;
        const aspect = 760 / 400;
        const w = Math.min(760, maxW);
        canvas.style.width = w + 'px';
        canvas.style.height = (w / aspect) + 'px';
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* --- Constants --- */
    const W = 760, H = 400;
    const PADDLE_W = 12, PADDLE_H = 80, PADDLE_SPEED = 6, BALL_R = 8;
    const COL_PADDLE_L = '#667eea';
    const COL_PADDLE_R = '#764ba2';
    const COL_BALL = '#c084fc';
    const COL_NET = 'rgba(255, 255, 255, 0.06)';

    /* --- State --- */
    let running = false, paused = false;
    let scoreL = 0, scoreR = 0;
    const left  = { x: 20, y: H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H, dy: 0 };
    const right = { x: W - 20 - PADDLE_W, y: H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H, dy: 0 };
    let ball = { x: W / 2, y: H / 2, dx: 4.5, dy: 3, speed: 4.5 };
    let particles = [];

    /* --- Particle system for hit/score effects --- */
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            particles.push({
                x, y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 1,
                decay: Math.random() * 0.03 + 0.02,
                color,
                r: Math.random() * 3 + 1
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life * 0.7;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /* --- AI opponent: reacts every 3rd frame with slight inaccuracy --- */
    let aiReact = 0;
    function updateAI() {
        aiReact++;
        if (aiReact % 3 !== 0) return;
        const center = right.y + right.h / 2;
        const target = ball.y + (Math.random() - 0.5) * 20;
        const diff = target - center;
        right.dy = Math.abs(diff) > 4 ? (diff > 0 ? 1 : -1) * PADDLE_SPEED * 0.85 : 0;
    }

    /* --- Ball reset after a point is scored --- */
    function resetBall(dir) {
        ball.x = W / 2;
        ball.y = H / 2;
        ball.speed = 4.5;
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        ball.dx = Math.cos(angle) * ball.speed * dir;
        ball.dy = Math.sin(angle) * ball.speed;
    }

    /* --- Drawing helpers --- */
    function drawGlowRect(x, y, w, h, color) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawNet() {
        ctx.fillStyle = COL_NET;
        for (let y = 8; y < H; y += 20) {
            ctx.fillRect(W / 2 - 1, y, 2, 10);
        }
    }

    function drawBall() {
        ctx.shadowBlur = 22;
        ctx.shadowColor = COL_BALL;
        ctx.fillStyle = COL_BALL;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawMessage(msg) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(msg, W / 2, H / 2);
    }

    /* --- Physics update --- */
    function update() {
        // Move paddles and clamp to canvas bounds
        left.y  = Math.max(0, Math.min(H - PADDLE_H, left.y + left.dy));
        right.y = Math.max(0, Math.min(H - PADDLE_H, right.y + right.dy));

        updateAI();

        // Trailing particle behind the ball
        spawnParticles(ball.x, ball.y, COL_BALL, 1);

        // Move ball
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Bounce off top/bottom walls
        if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.dy = Math.abs(ball.dy); }
        if (ball.y + BALL_R >= H) { ball.y = H - BALL_R; ball.dy = -Math.abs(ball.dy); }

        // Left paddle collision: deflect angle based on where the ball hits the paddle
        if (ball.dx < 0 &&
            ball.x - BALL_R <= left.x + left.w &&
            ball.x - BALL_R >= left.x &&
            ball.y >= left.y && ball.y <= left.y + left.h) {
            ball.dx = Math.abs(ball.dx);
            const hit = (ball.y - (left.y + left.h / 2)) / (left.h / 2);
            ball.dy = hit * 5;
            ball.speed = Math.min(ball.speed + 0.15, 9);
            const mag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            ball.dx = (ball.dx / mag) * ball.speed;
            ball.dy = (ball.dy / mag) * ball.speed;
            spawnParticles(left.x + left.w, ball.y, COL_PADDLE_L, 12);
        }

        // Right paddle collision
        if (ball.dx > 0 &&
            ball.x + BALL_R >= right.x &&
            ball.x + BALL_R <= right.x + right.w &&
            ball.y >= right.y && ball.y <= right.y + right.h) {
            ball.dx = -Math.abs(ball.dx);
            const hit = (ball.y - (right.y + right.h / 2)) / (right.h / 2);
            ball.dy = hit * 5;
            ball.speed = Math.min(ball.speed + 0.15, 9);
            const mag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            ball.dx = (ball.dx / mag) * ball.speed;
            ball.dy = (ball.dy / mag) * ball.speed;
            spawnParticles(right.x, ball.y, COL_PADDLE_R, 12);
        }

        // Scoring: ball exits left or right edge
        if (ball.x < -BALL_R) {
            scoreR++;
            scoreRightEl.textContent = scoreR;
            spawnParticles(0, ball.y, COL_PADDLE_R, 30);
            resetBall(1);
        }
        if (ball.x > W + BALL_R) {
            scoreL++;
            scoreLeftEl.textContent = scoreL;
            spawnParticles(W, ball.y, COL_PADDLE_L, 30);
            resetBall(-1);
        }

        updateParticles();
    }

    /* --- Render frames --- */
    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawNet();
        drawParticles();
        drawGlowRect(left.x, left.y, left.w, left.h, COL_PADDLE_L);
        drawGlowRect(right.x, right.y, right.w, right.h, COL_PADDLE_R);
        drawBall();
        if (paused) drawMessage('PAUSED');
    }

    function drawIdle() {
        ctx.clearRect(0, 0, W, H);
        drawNet();
        drawGlowRect(left.x, H / 2 - PADDLE_H / 2, left.w, left.h, COL_PADDLE_L);
        drawGlowRect(right.x, H / 2 - PADDLE_H / 2, right.w, right.h, COL_PADDLE_R);
        ctx.shadowBlur = 22;
        ctx.shadowColor = COL_BALL;
        ctx.fillStyle = COL_BALL;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        drawMessage('Press Start to Play');
    }

    /* --- Game loop --- */
    let rafId;
    function loop() {
        if (!running) return;
        if (!paused) update();
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function startGame() {
        scoreL = 0; scoreR = 0;
        scoreLeftEl.textContent = '0';
        scoreRightEl.textContent = '0';
        left.y = H / 2 - PADDLE_H / 2;
        right.y = H / 2 - PADDLE_H / 2;
        particles = [];
        paused = false;
        resetBall(1);
        running = true;
        startBtn.textContent = 'Restart';
        cancelAnimationFrame(rafId);
        loop();
    }

    startBtn.addEventListener('click', startGame);

    /* --- Keyboard input --- */
    const keys = {};
    document.addEventListener('keydown', function (e) {
        keys[e.key] = true;
        if (e.key === ' ' && running) { e.preventDefault(); paused = !paused; }
        updateKeysMovement();
    });
    document.addEventListener('keyup', function (e) {
        keys[e.key] = false;
        updateKeysMovement();
    });

    function updateKeysMovement() {
        // W/S control the left paddle
        left.dy = 0;
        if (keys['w'] || keys['W']) left.dy = -PADDLE_SPEED;
        if (keys['s'] || keys['S']) left.dy = PADDLE_SPEED;
        // Arrow keys let the player override the AI for the right paddle
        if (keys['ArrowUp'] || keys['ArrowDown']) {
            right.dy = 0;
            if (keys['ArrowUp'])   right.dy = -PADDLE_SPEED;
            if (keys['ArrowDown']) right.dy = PADDLE_SPEED;
        }
    }

    /* --- Touch controls (mobile) --- */
    const touchState = {};
    document.querySelectorAll('[data-action]').forEach(function (btn) {
        function handleStart(e) { e.preventDefault(); touchState[btn.dataset.action] = true; applyTouch(); }
        function handleEnd(e)   { e.preventDefault(); touchState[btn.dataset.action] = false; applyTouch(); }
        btn.addEventListener('touchstart', handleStart, { passive: false });
        btn.addEventListener('touchend', handleEnd, { passive: false });
        btn.addEventListener('mousedown', handleStart);
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', handleEnd);
    });

    function applyTouch() {
        left.dy = 0;
        if (touchState['left-up'])   left.dy = -PADDLE_SPEED;
        if (touchState['left-down']) left.dy = PADDLE_SPEED;
    }

    drawIdle();
})();
