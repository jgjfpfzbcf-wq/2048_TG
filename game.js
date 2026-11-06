// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#faf8ef');
}

const SIZE = 4;

class Game2048 {
    constructor() {
        this.gridEl = document.getElementById('grid');
        this.scoreEl = document.getElementById('score');
        this.bestEl = document.getElementById('best');
        this.overlay = document.getElementById('game-over');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayText = document.getElementById('overlay-text');
        this.finalScore = document.getElementById('final-score');

        this.best = parseInt(localStorage.getItem('2048-best') || '0');
        this.bestEl.textContent = this.best;

        this.bindEvents();
        this.newGame();
    }

    bindEvents() {
        document.getElementById('new-game').onclick = () => this.newGame();
        document.getElementById('restart').onclick = () => {
            this.hideOverlay();
            this.newGame();
        };
        document.getElementById('undo').onclick = () => this.undo();

        document.addEventListener('keydown', (e) => {
            const map = {
                ArrowUp: 'up', ArrowDown: 'down',
                ArrowLeft: 'left', ArrowRight: 'right',
                w: 'up', s: 'down', a: 'left', d: 'right',
            };
            const dir = map[e.key];
            if (dir) {
                e.preventDefault();
                this.move(dir);
            }
        });

        let sx = 0, sy = 0;
        this.gridEl.addEventListener('touchstart', (e) => {
            const t = e.changedTouches[0];
            sx = t.clientX;
            sy = t.clientY;
        }, { passive: true });

        this.gridEl.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (Math.max(absX, absY) < 30) return;

            if (absX > absY) {
                this.move(dx > 0 ? 'right' : 'left');
            } else {
                this.move(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });
    }

    newGame() {
        this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        this.score = 0;
        this.history = [];
        this.won = false;
        this.updateScore();
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }

    addRandomTile() {
        const empty = [];
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (this.board[r][c] === 0) empty.push([r, c]);
        if (!empty.length) return;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    move(dir) {
        if (!this.overlay.classList.contains('hidden')) return;

        this.history.push({
            board: this.board.map(row => [...row]),
            score: this.score,
        });
        if (this.history.length > 20) this.history.shift();

        const vectors = {
            up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
        };
        const [dr, dc] = vectors[dir];
        const moved = this.slide(dr, dc);

        if (moved) {
            this.addRandomTile();
            this.render();
            this.updateScore();

            if (!this.won && this.board.flat().includes(2048)) {
                this.won = true;
                this.showOverlay('Победа! 🎉', 'Вы собрали 2048!');
            } else if (!this.canMove()) {
                this.showOverlay('Игра окончена!', `Ваш счёт: ${this.score}`);
            }
        } else {
            this.history.pop();
        }
    }

    slide(dr, dc) {
        const rows = [...Array(SIZE).keys()];
        const cols = [...Array(SIZE).keys()];
        if (dr > 0) rows.reverse();
        if (dc > 0) cols.reverse();

        let moved = false;
        const merged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

        for (const r of rows) {
            for (const c of cols) {
                const val = this.board[r][c];
                if (val === 0) continue;

                let nr = r, nc = c;
                while (true) {
                    const tr = nr + dr, tc = nc + dc;
                    if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) break;

                    const target = this.board[tr][tc];
                    if (target === 0) {
                        this.board[tr][tc] = val;
                        this.board[nr][nc] = 0;
                        nr = tr; nc = tc;
                        moved = true;
                    } else if (target === val && !merged[tr][tc]) {
                        this.board[tr][tc] = val * 2;
                        this.board[nr][nc] = 0;
                        this.score += val * 2;
                        merged[tr][tc] = true;
                        moved = true;
                        break;
                    } else {
                        break;
                    }
                }
            }
        }
        return moved;
    }

    canMove() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (this.board[r][c] === 0) return true;
                if (c < SIZE - 1 && this.board[r][c] === this.board[r][c + 1]) return true;
                if (r < SIZE - 1 && this.board[r][c] === this.board[r + 1][c]) return true;
            }
        }
        return false;
    }

    undo() {
        if (!this.history.length) return;
        const prev = this.history.pop();
        this.board = prev.board;
        this.score = prev.score;
        this.updateScore();
        this.render();
    }

    updateScore() {
        this.scoreEl.textContent = this.score;
        if (this.score > this.best) {
            this.best = this.score;
            this.bestEl.textContent = this.best;
            localStorage.setItem('2048-best', this.best);
        }
    }

    render() {
        this.gridEl.innerHTML = '';
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = this.board[r][c];
                const cell = document.createElement('div');
                if (val === 0) {
                    cell.className = 'cell';
                } else {
                    cell.className = `tile t${val > 2048 ? 'big' : val}`;
                    cell.textContent = val;
                }
                this.gridEl.appendChild(cell);
            }
        }
    }

    showOverlay(title, text) {
        this.overlayTitle.textContent = title;
        this.overlayText.innerHTML = text;
        this.overlay.classList.remove('hidden');
    }

    hideOverlay() {
        this.overlay.classList.add('hidden');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
