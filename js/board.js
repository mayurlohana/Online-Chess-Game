/**
 * board.js
 * Board class – handles all DOM rendering and user interaction.
 *
 * Responsibilities:
 *  - Render the 8×8 grid of squares and pieces
 *  - Highlight selected square, legal-move targets, last-move, check
 *  - Handle click-to-move and HTML5 drag-and-drop
 *  - Trigger pawn-promotion modal
 *  - Display move history and captured pieces
 *  - Show / hide game-over overlay
 */

'use strict';

class Board {
  /**
   * @param {Game}    game     – Game instance
   * @param {Element} boardEl  – #chessboard element
   */
  constructor(game, boardEl) {
    this.game    = game;
    this.boardEl = boardEl;

    // Selection state
    this._selected    = null;   // {row, col}
    this._legalMoves  = [];     // [{row,col,...}]
    this._lastMove    = null;   // {from:{row,col}, to:{row,col}}
    this._dragFrom    = null;   // {row, col}

    // DOM references
    this._squares     = [];     // [row][col] → <div>
    this._turnEl      = document.getElementById('turn-indicator');
    this._checkEl     = document.getElementById('check-indicator');
    this._historyEl   = document.getElementById('move-history');
    this._capWhiteEl  = document.getElementById('captured-by-white');
    this._capBlackEl  = document.getElementById('captured-by-black');

    // Promotion modal
    this._promoOverlay = this._buildPromotionModal();
    document.body.appendChild(this._promoOverlay);
    this._promiseResolve = null;   // resolves when player picks promotion piece

    // Game-over overlay
    this._gameOverOverlay = this._buildGameOverOverlay();
    document.body.appendChild(this._gameOverOverlay);

    this._buildBoardDOM();
    this._buildLabels();
    this.render();
  }

  /* ----------------------------------------------------------
     DOM construction
     ---------------------------------------------------------- */
  _buildBoardDOM() {
    this.boardEl.innerHTML = '';
    this._squares = [];

    for (let r = 0; r < 8; r++) {
      this._squares[r] = [];
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;
        sq.setAttribute('role', 'gridcell');

        // Click handler
        sq.addEventListener('click', () => this._onSquareClick(r, c));

        // Drag-and-drop (drop target)
        sq.addEventListener('dragover',  e => e.preventDefault());
        sq.addEventListener('drop',      e => this._onDrop(e, r, c));

        this.boardEl.appendChild(sq);
        this._squares[r][c] = sq;
      }
    }
  }

  _buildLabels() {
    const rankEl = document.getElementById('rank-labels');
    const fileEl = document.getElementById('file-labels');
    if (!rankEl || !fileEl) return;

    rankEl.innerHTML = '';
    fileEl.innerHTML = '';
    const ranks = '87654321';
    const files = 'abcdefgh';

    for (let i = 0; i < 8; i++) {
      const r = document.createElement('span');
      r.classList.add('label');
      r.textContent = ranks[i];
      rankEl.appendChild(r);
    }
    for (let i = 0; i < 8; i++) {
      const f = document.createElement('span');
      f.classList.add('label');
      f.textContent = files[i];
      fileEl.appendChild(f);
    }
  }

  _buildPromotionModal() {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay', 'hidden');
    overlay.innerHTML = `
      <div class="modal">
        <h2>Promote Pawn</h2>
        <div class="promotion-choices" id="promo-choices"></div>
      </div>`;
    return overlay;
  }

  _buildGameOverOverlay() {
    const overlay = document.createElement('div');
    overlay.classList.add('game-over-overlay', 'hidden');
    overlay.innerHTML = `
      <div class="game-over-box">
        <h2 id="game-over-title">Game Over</h2>
        <p  id="game-over-msg"></p>
        <button class="btn btn--primary" id="game-over-restart">Play Again</button>
      </div>`;
    overlay.querySelector('#game-over-restart').addEventListener('click', () => {
      overlay.classList.add('hidden');
      this._onRestart();
    });
    return overlay;
  }

  /* ----------------------------------------------------------
     Full render pass
     ---------------------------------------------------------- */
  render() {
    const { board } = this.game;
    const inCheck   = this.game.isInCheck(this.game.currentTurn);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this._renderSquare(r, c, board[r][c], inCheck);
      }
    }
    this._updateStatusBar(inCheck);
    this._updateHistory();
    this._updateCaptured();
  }

  _renderSquare(r, c, piece, inCheck) {
    const sq = this._squares[r][c];

    // Reset state classes (keep light/dark)
    sq.classList.remove('selected','legal-move','empty','last-move','in-check');

    // Last-move highlight
    if (this._lastMove) {
      const { from, to } = this._lastMove;
      if ((r === from.row && c === from.col) || (r === to.row && c === to.col)) {
        sq.classList.add('last-move');
      }
    }

    // Check highlight on king
    if (inCheck && piece instanceof King && piece.color === this.game.currentTurn) {
      sq.classList.add('in-check');
    }

    // Selected
    if (this._selected && this._selected.row === r && this._selected.col === c) {
      sq.classList.add('selected');
    }

    // Legal-move targets
    const isLegal = this._legalMoves.some(m => m.row === r && m.col === c);
    if (isLegal) {
      sq.classList.add('legal-move');
      if (!piece) sq.classList.add('empty');
    }

    // Piece glyph
    sq.innerHTML = '';
    if (piece) {
      const span = document.createElement('span');
      span.classList.add('piece');
      span.textContent = piece.glyph;
      span.dataset.row  = r;
      span.dataset.col  = c;
      span.draggable    = piece.color === this.game.currentTurn;

      span.addEventListener('dragstart', e => this._onDragStart(e, r, c));
      span.addEventListener('dragend',   e => this._onDragEnd(e));

      sq.appendChild(span);
    }
  }

  /* ----------------------------------------------------------
     Click-to-move
     ---------------------------------------------------------- */
  _onSquareClick(row, col) {
    if (this.game.isOver) return;

    const piece = this.game.board[row][col];

    // Nothing selected yet
    if (!this._selected) {
      if (piece && piece.color === this.game.currentTurn) {
        this._select(row, col);
      }
      return;
    }

    // Clicking the already-selected square → deselect
    if (this._selected.row === row && this._selected.col === col) {
      this._deselect();
      return;
    }

    // Clicking another own piece → switch selection
    if (piece && piece.color === this.game.currentTurn) {
      this._select(row, col);
      return;
    }

    // Attempt to move
    this._tryMove(this._selected.row, this._selected.col, row, col);
  }

  _select(row, col) {
    this._selected   = { row, col };
    this._legalMoves = this.game.getLegalMovesFor(row, col);
    this.render();
  }

  _deselect() {
    this._selected   = null;
    this._legalMoves = [];
    this.render();
  }

  /* ----------------------------------------------------------
     Move execution (shared by click and drag)
     ---------------------------------------------------------- */
  async _tryMove(fromRow, fromCol, toRow, toCol) {
    // Check if promotion is needed
    const piece = this.game.board[fromRow][fromCol];
    let promotionType = 'queen';

    if (
      piece instanceof Pawn &&
      ((piece.color === 'white' && toRow === 0) ||
       (piece.color === 'black' && toRow === 7))
    ) {
      promotionType = await this._askPromotion(piece.color);
    }

    const result = this.game.applyMove(fromRow, fromCol, toRow, toCol, promotionType);
    if (!result) {
      // Invalid move – just deselect
      this._deselect();
      return;
    }

    this._lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    this._deselect();  // also calls render()

    if (result.isOver) {
      setTimeout(() => this._showGameOver(result.gameOverMsg), 600);
    }
  }

  /* ----------------------------------------------------------
     HTML5 Drag-and-drop
     ---------------------------------------------------------- */
  _onDragStart(e, row, col) {
    const piece = this.game.board[row][col];
    if (!piece || piece.color !== this.game.currentTurn) {
      e.preventDefault();
      return;
    }
    this._dragFrom = { row, col };
    e.currentTarget.classList.add('dragging');

    // Show legal moves while dragging
    this._selected   = { row, col };
    this._legalMoves = this.game.getLegalMovesFor(row, col);
    this.render();

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${row},${col}`);
  }

  _onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    this._dragFrom = null;
  }

  _onDrop(e, toRow, toCol) {
    e.preventDefault();
    if (!this._dragFrom) return;
    const { row: fromRow, col: fromCol } = this._dragFrom;
    this._dragFrom = null;
    this._tryMove(fromRow, fromCol, toRow, toCol);
  }

  /* ----------------------------------------------------------
     Promotion modal
     ---------------------------------------------------------- */
  _askPromotion(color) {
    return new Promise(resolve => {
      const choicesEl = this._promoOverlay.querySelector('#promo-choices');
      choicesEl.innerHTML = '';
      const types = ['queen','rook','bishop','knight'];
      for (const type of types) {
        const btn = document.createElement('button');
        btn.classList.add('promotion-btn');
        btn.textContent = GLYPHS[color][type];
        btn.title = type.charAt(0).toUpperCase() + type.slice(1);
        btn.addEventListener('click', () => {
          this._promoOverlay.classList.add('hidden');
          resolve(type);
        });
        choicesEl.appendChild(btn);
      }
      this._promoOverlay.classList.remove('hidden');
    });
  }

  /* ----------------------------------------------------------
     Game-over overlay
     ---------------------------------------------------------- */
  _showGameOver(msg) {
    this._gameOverOverlay.querySelector('#game-over-msg').textContent = msg;
    this._gameOverOverlay.classList.remove('hidden');
  }

  /* ----------------------------------------------------------
     Status bar
     ---------------------------------------------------------- */
  _updateStatusBar(inCheck) {
    const turn = this.game.currentTurn;
    this._turnEl.textContent = turn === 'white' ? "White's Turn" : "Black's Turn";
    this._turnEl.className   = `turn-indicator turn--${turn}`;

    if (inCheck && !this.game.isOver) {
      this._checkEl.classList.remove('hidden');
    } else {
      this._checkEl.classList.add('hidden');
    }
  }

  /* ----------------------------------------------------------
     Move history
     ---------------------------------------------------------- */
  _updateHistory() {
    this._historyEl.innerHTML = '';
    // Show most recent at top
    const history = [...this.game.moveHistory].reverse();
    for (const notation of history) {
      const li = document.createElement('li');
      li.textContent = notation;
      this._historyEl.appendChild(li);
    }
  }

  /* ----------------------------------------------------------
     Captured pieces
     ---------------------------------------------------------- */
  _updateCaptured() {
    this._renderCaptured(this._capWhiteEl, this.game.capturedByWhite);
    this._renderCaptured(this._capBlackEl, this.game.capturedByBlack);
  }

  _renderCaptured(el, pieces) {
    el.innerHTML = '';
    for (const p of pieces) {
      const span = document.createElement('span');
      span.classList.add('captured-piece');
      span.textContent = p.glyph;
      el.appendChild(span);
    }
  }

  /* ----------------------------------------------------------
     Restart / Undo hooks (wired by main.js)
     ---------------------------------------------------------- */
  _onRestart() { /* overridden by main.js */ }

  /** Public method to clear the current piece selection and re-render. */
  clearSelection() {
    this._selected   = null;
    this._legalMoves = [];
    this.render();
  }
}
