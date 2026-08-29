const BEST_KEY = 'stacker.best';

function readBest() {
  const stored = Number(localStorage.getItem(BEST_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

/** Everything outside the canvas: score, overlays, hints. */
export class Hud {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.bestEl = document.getElementById('best');
    this.comboEl = document.getElementById('combo');
    this.startEl = document.getElementById('start');
    this.overEl = document.getElementById('gameover');
    this.finalEl = document.getElementById('final-score');
    this.recordEl = document.getElementById('record');
    this.hintEl = document.getElementById('hint');

    this.best = readBest();
    this.renderBest();
  }

  renderBest() {
    this.bestEl.textContent = `BEST ${this.best}`;
  }

  setScore(score) {
    this.scoreEl.textContent = String(score);
    if (score > 0) {
      this.scoreEl.classList.remove('pop');
      void this.scoreEl.offsetWidth; // restart the animation
      this.scoreEl.classList.add('pop');
    }
  }

  showCombo(streak) {
    this.comboEl.textContent = streak > 1 ? `PERFECT ×${streak}` : 'PERFECT';
    this.comboEl.classList.remove('show');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('show');
  }

  onStart() {
    clearTimeout(this.overTimer);
    this.startEl.classList.add('hidden');
    this.overEl.classList.add('hidden');
    this.hintEl.classList.add('show');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hintEl.classList.remove('show'), 2600);
  }

  gameOver(score) {
    const record = score > this.best;
    if (record) {
      this.best = score;
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        // Private browsing: keeping the record in memory is good enough.
      }
      this.renderBest();
    }

    this.finalEl.textContent = String(score);
    this.recordEl.classList.toggle('hidden', !record);
    this.hintEl.classList.remove('show');
    clearTimeout(this.hintTimer);
    // Let the missed floor fall out of frame before the overlay lands.
    this.overTimer = setTimeout(() => this.overEl.classList.remove('hidden'), 750);
  }

  clearOverlays() {
    clearTimeout(this.overTimer);
    this.overEl.classList.add('hidden');
    this.startEl.classList.add('hidden');
  }
}
