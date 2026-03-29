/**
 * Online Chess Game
 * OOP Architecture: Piece → [King, Queen, Rook, Bishop, Knight, Pawn]
 *                   Board, Game, UI
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const COLORS = { WHITE: 'white', BLACK: 'black' };
const TYPES  = { KING: 'King', QUEEN: 'Queen', ROOK: 'Rook',
                 BISHOP: 'Bishop', KNIGHT: 'Knight', PAWN: 'Pawn' };

/** Unicode chess symbols keyed by [color][type] */
const GLYPHS = {
  white: { King:'♔', Queen:'♕', Rook:'♖', Bishop:'♗', Knight:'♘', Pawn:'♙' },
  black: { King:'♚', Queen:'♛', Rook:'♜', Bishop:'♝', Knight:'♞', Pawn:'♟' }
};

/* ═══════════════════════════════════════════════════════════════
   PIECE BASE CLASS
═══════════════════════════════════════════════════════════════ */
class Piece {
  /**
   * @param {string} color  - COLORS.WHITE or COLORS.BLACK
   * @param {string} type   - TYPES.*
   * @param {number} row    - 0-7 (0 = rank 8)
   * @param {number} col    - 0-7 (0 = file a)
   */
  constructor(color, type, row, col) {
    this.color    = color;
    this.type     = type;
    this.row      = row;
    this.col      = col;
    this.hasMoved = false;
    this.glyph    = GLYPHS[color][type];
  }

  /** Clone this piece (preserves hasMoved) */
  clone() {
    const p = new this.constructor(this.color, this.type, this.row, this.col);
    p.hasMoved = this.hasMoved;
    return p;
  }

  /**
   * Return pseudo-legal squares this piece can move to (ignores check).
   * Implemented by subclasses.
   * @param {Board} board
   * @returns {Array<{row:number, col:number}>}
   */
  pseudoLegalMoves(_board) { return []; }

  /** Helper: is (r,c) inside the board? */
  static inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  /**
   * Slide moves along a direction until blocked.
   * @param {Board} board
   * @param {Array<[number,number]>} directions
   */
  slideMoves(board, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
      let r = this.row + dr, c = this.col + dc;
      while (Piece.inBounds(r, c)) {
        const occupant = board.pieceAt(r, c);
        if (!occupant) {
          moves.push({ row: r, col: c });
        } else {
          if (occupant.color !== this.color) moves.push({ row: r, col: c }); // capture
          break;
        }
        r += dr; c += dc;
      }
    }
    return moves;
  }

  /** Step moves (King, Knight) – just one step per direction */
  stepMoves(board, deltas) {
    const moves = [];
    for (const [dr, dc] of deltas) {
      const r = this.row + dr, c = this.col + dc;
      if (!Piece.inBounds(r, c)) continue;
      const occupant = board.pieceAt(r, c);
      if (!occupant || occupant.color !== this.color) moves.push({ row: r, col: c });
    }
    return moves;
  }

  toString() { return `${this.color} ${this.type} at (${this.row},${this.col})`; }
}

/* ═══════════════════════════════════════════════════════════════
   PIECE SUBCLASSES
═══════════════════════════════════════════════════════════════ */
class King extends Piece {
  constructor(color, row, col) { super(color, TYPES.KING, row, col); }

  pseudoLegalMoves(board) {
    const moves = this.stepMoves(board, [
      [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]
    ]);
    // Castling
    if (!this.hasMoved) {
      const rank = this.row;
      // King-side
      const kRook = board.pieceAt(rank, 7);
      if (kRook && kRook.type === TYPES.ROOK && !kRook.hasMoved &&
          !board.pieceAt(rank, 5) && !board.pieceAt(rank, 6) &&
          !board.isSquareAttacked(rank, 4, this.color) &&
          !board.isSquareAttacked(rank, 5, this.color) &&
          !board.isSquareAttacked(rank, 6, this.color)) {
        moves.push({ row: rank, col: 6, castling: 'kingside' });
      }
      // Queen-side
      const qRook = board.pieceAt(rank, 0);
      if (qRook && qRook.type === TYPES.ROOK && !qRook.hasMoved &&
          !board.pieceAt(rank, 1) && !board.pieceAt(rank, 2) && !board.pieceAt(rank, 3) &&
          !board.isSquareAttacked(rank, 4, this.color) &&
          !board.isSquareAttacked(rank, 3, this.color) &&
          !board.isSquareAttacked(rank, 2, this.color)) {
        moves.push({ row: rank, col: 2, castling: 'queenside' });
      }
    }
    return moves;
  }

  clone() {
    const p = new King(this.color, this.row, this.col);
    p.hasMoved = this.hasMoved;
    return p;
  }
}

class Queen extends Piece {
  constructor(color, row, col) { super(color, TYPES.QUEEN, row, col); }
  pseudoLegalMoves(board) {
    return this.slideMoves(board, [
      [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]
    ]);
  }
  clone() { const p = new Queen(this.color, this.row, this.col); p.hasMoved = this.hasMoved; return p; }
}

class Rook extends Piece {
  constructor(color, row, col) { super(color, TYPES.ROOK, row, col); }
  pseudoLegalMoves(board) {
    return this.slideMoves(board, [[-1,0],[1,0],[0,-1],[0,1]]);
  }
  clone() { const p = new Rook(this.color, this.row, this.col); p.hasMoved = this.hasMoved; return p; }
}

class Bishop extends Piece {
  constructor(color, row, col) { super(color, TYPES.BISHOP, row, col); }
  pseudoLegalMoves(board) {
    return this.slideMoves(board, [[-1,-1],[-1,1],[1,-1],[1,1]]);
  }
  clone() { const p = new Bishop(this.color, this.row, this.col); p.hasMoved = this.hasMoved; return p; }
}

class Knight extends Piece {
  constructor(color, row, col) { super(color, TYPES.KNIGHT, row, col); }
  pseudoLegalMoves(board) {
    return this.stepMoves(board, [
      [-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]
    ]);
  }
  clone() { const p = new Knight(this.color, this.row, this.col); p.hasMoved = this.hasMoved; return p; }
}

class Pawn extends Piece {
  constructor(color, row, col) { super(color, TYPES.PAWN, row, col); }

  pseudoLegalMoves(board) {
    const moves = [];
    const dir   = this.color === COLORS.WHITE ? -1 : 1;
    const r1    = this.row + dir;

    // Single push
    if (Piece.inBounds(r1, this.col) && !board.pieceAt(r1, this.col)) {
      moves.push({ row: r1, col: this.col });
      // Double push from starting rank
      const startRank = this.color === COLORS.WHITE ? 6 : 1;
      const r2 = this.row + 2 * dir;
      if (this.row === startRank && !board.pieceAt(r2, this.col)) {
        moves.push({ row: r2, col: this.col, doublePush: true });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const rc = this.col + dc;
      if (!Piece.inBounds(r1, rc)) continue;
      const occupant = board.pieceAt(r1, rc);
      if (occupant && occupant.color !== this.color) {
        moves.push({ row: r1, col: rc });
      }
      // En passant
      if (board.enPassantTarget &&
          board.enPassantTarget.row === r1 &&
          board.enPassantTarget.col === rc) {
        moves.push({ row: r1, col: rc, enPassant: true });
      }
    }

    return moves;
  }

  clone() {
    const p = new Pawn(this.color, this.row, this.col);
    p.hasMoved = this.hasMoved;
    return p;
  }
}

/* ═══════════════════════════════════════════════════════════════
   BOARD CLASS
═══════════════════════════════════════════════════════════════ */
class Board {
  constructor() {
    /** @type {Array<Array<Piece|null>>} grid[row][col] */
    this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    /** En-passant target square set after a double pawn push */
    this.enPassantTarget = null;
  }

  /** Return piece at (row, col) or null */
  pieceAt(row, col) { return this.grid[row][col]; }

  /** Place piece on the board */
  place(piece) { this.grid[piece.row][piece.col] = piece; }

  /** Remove piece from its current square */
  remove(piece) { this.grid[piece.row][piece.col] = null; }

  /** Deep-clone the board (for move legality testing) */
  clone() {
    const b = new Board();
    b.enPassantTarget = this.enPassantTarget
      ? { row: this.enPassantTarget.row, col: this.enPassantTarget.col }
      : null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.grid[r][c]) b.grid[r][c] = this.grid[r][c].clone();
      }
    }
    return b;
  }

  /** Return all pieces of a given color */
  piecesOf(color) {
    const list = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.grid[r][c] && this.grid[r][c].color === color) list.push(this.grid[r][c]);
    return list;
  }

  /** Find king of given color */
  findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.grid[r][c];
        if (p && p.color === color && p.type === TYPES.KING) return p;
      }
    return null;
  }

  /**
   * Is square (row,col) attacked by any piece of the opposite color?
   * @param {number}  row
   * @param {number}  col
   * @param {string}  friendlyColor - color of the piece occupying (row,col)
   */
  isSquareAttacked(row, col, friendlyColor) {
    const enemy = friendlyColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const enemies = this.piecesOf(enemy);
    for (const piece of enemies) {
      // Pawns attack diagonally – handle specially to avoid infinite recursion
      if (piece.type === TYPES.PAWN) {
        const dir = piece.color === COLORS.WHITE ? -1 : 1;
        if (piece.row + dir === row &&
            Math.abs(piece.col - col) === 1) return true;
        continue;
      }
      const moves = piece.pseudoLegalMoves(this);
      if (moves.some(m => m.row === row && m.col === col)) return true;
    }
    return false;
  }

  /** Is the king of `color` in check? */
  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    return this.isSquareAttacked(king.row, king.col, color);
  }

  /**
   * Execute a move on this board (mutates).
   * Returns the captured piece (or null).
   */
  applyMove(piece, toRow, toCol, options = {}) {
    let captured = this.grid[toRow][toCol];

    // En passant capture
    if (options.enPassant) {
      const capRow = piece.row; // same row as pawn before move
      captured = this.grid[capRow][toCol];
      this.grid[capRow][toCol] = null;
    }

    // Move piece
    this.grid[piece.row][piece.col] = null;
    piece.row = toRow;
    piece.col = toCol;
    piece.hasMoved = true;
    this.grid[toRow][toCol] = piece;

    // Castling: move rook too
    if (options.castling) {
      const rank = piece.row;
      if (options.castling === 'kingside') {
        const rook = this.grid[rank][7];
        this.grid[rank][7] = null;
        rook.col = 5; rook.hasMoved = true;
        this.grid[rank][5] = rook;
      } else {
        const rook = this.grid[rank][0];
        this.grid[rank][0] = null;
        rook.col = 3; rook.hasMoved = true;
        this.grid[rank][3] = rook;
      }
    }

    // Update en-passant target
    this.enPassantTarget = options.doublePush
      ? { row: (piece.row + (piece.color === COLORS.WHITE ? 1 : -1)), col: piece.col }
      : null;

    return captured;
  }

  /** Set up standard chess starting position */
  setupStandard() {
    this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.enPassantTarget = null;

    // Back ranks
    const backRankOrder = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook];
    for (let c = 0; c < 8; c++) {
      this.place(new backRankOrder[c](COLORS.BLACK, 0, c));
      this.place(new Pawn(COLORS.BLACK, 1, c));
      this.place(new Pawn(COLORS.WHITE, 6, c));
      this.place(new backRankOrder[c](COLORS.WHITE, 7, c));
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   GAME CLASS
═══════════════════════════════════════════════════════════════ */
class Game {
  constructor() {
    this.board            = new Board();
    this.currentTurn      = COLORS.WHITE;
    this.moveHistory      = [];   // [{piece, fromRow, fromCol, toRow, toCol, captured, san, ...}]
    this.capturedByWhite  = [];   // pieces captured by white
    this.capturedByBlack  = [];   // pieces captured by black
    this.status           = 'playing'; // 'playing' | 'check' | 'checkmate' | 'stalemate'
    this.board.setupStandard();
    this._updateStatus();
  }

  /** Legal moves for piece (filters moves that leave own king in check) */
  legalMovesFor(piece) {
    if (piece.color !== this.currentTurn) return [];
    const pseudo = piece.pseudoLegalMoves(this.board);
    return pseudo.filter(mv => {
      const testBoard = this.board.clone();
      const testPiece = testBoard.pieceAt(piece.row, piece.col);
      testBoard.applyMove(testPiece, mv.row, mv.col, mv);
      return !testBoard.isInCheck(piece.color);
    });
  }

  /** Return all legal moves for the current player */
  allLegalMoves() {
    const moves = [];
    const pieces = this.board.piecesOf(this.currentTurn);
    for (const p of pieces) {
      for (const mv of this.legalMovesFor(p)) {
        moves.push({ piece: p, ...mv });
      }
    }
    return moves;
  }

  /** Update game status (check / checkmate / stalemate) */
  _updateStatus() {
    const legal = this.allLegalMoves();
    const inCheck = this.board.isInCheck(this.currentTurn);
    if (legal.length === 0) {
      this.status = inCheck ? 'checkmate' : 'stalemate';
    } else {
      this.status = inCheck ? 'check' : 'playing';
    }
  }

  /**
   * Attempt to make a move. Returns an object describing the result.
   * @param {Piece}  piece
   * @param {number} toRow
   * @param {number} toCol
   * @param {string} [promotionType] - promotion piece type
   */
  makeMove(piece, toRow, toCol, promotionType) {
    if (this.status === 'checkmate' || this.status === 'stalemate') {
      return { ok: false, reason: 'game over' };
    }

    const legal = this.legalMovesFor(piece);
    const mv = legal.find(m => m.row === toRow && m.col === toCol);
    if (!mv) return { ok: false, reason: 'illegal' };

    // Promotion check
    const isPromotion = piece.type === TYPES.PAWN &&
      ((piece.color === COLORS.WHITE && toRow === 0) ||
       (piece.color === COLORS.BLACK && toRow === 7));
    if (isPromotion && !promotionType) {
      return { ok: false, needsPromotion: true, pendingMove: { piece, toRow, toCol, mv } };
    }

    // Save origin before the move mutates the piece
    const fromRow = piece.row;
    const fromCol = piece.col;

    // Build SAN-like notation before the move
    const san = this._buildNotation(piece, toRow, toCol, mv, isPromotion, promotionType);

    // Apply the move
    const captured = this.board.applyMove(piece, toRow, toCol, mv);

    // Promotion: replace pawn
    if (isPromotion) {
      const PromoClass = { Queen, Rook, Bishop, Knight }[promotionType] || Queen;
      this.board.grid[toRow][toCol] = null;
      const promoted = new PromoClass(piece.color, toRow, toCol);
      promoted.hasMoved = true;
      this.board.place(promoted);
    }

    // Track captures
    if (captured) {
      if (piece.color === COLORS.WHITE) this.capturedByWhite.push(captured);
      else                              this.capturedByBlack.push(captured);
    }

    // Record history
    this.moveHistory.push({
      number: Math.ceil((this.moveHistory.length + 1) / 2),
      color: piece.color,
      san,
      fromRow,
      fromCol,
      toRow, toCol, captured
    });

    // Switch turns
    this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    this._updateStatus();

    return { ok: true, captured, isPromotion, san, status: this.status };
  }

  /** Build algebraic-like move notation */
  _buildNotation(piece, toRow, toCol, mv, isPromotion, promotionType) {
    const files = 'abcdefgh';
    const toFile = files[toCol];
    const toRank = 8 - toRow;
    const captured = this.board.pieceAt(toRow, toCol) || (mv.enPassant
      ? this.board.pieceAt(piece.row, toCol) : null);

    if (mv.castling === 'kingside')  return 'O-O';
    if (mv.castling === 'queenside') return 'O-O-O';

    let san = '';
    if (piece.type !== TYPES.PAWN) {
      san += piece.type[0]; // K Q R B N
    }
    if (piece.type === TYPES.PAWN && captured) {
      san += files[piece.col];
    }
    if (captured) san += 'x';
    san += `${toFile}${toRank}`;
    if (isPromotion) san += `=${(promotionType || 'Q')[0]}`;
    return san;
  }

  /** Reset to a fresh game */
  reset() {
    this.board           = new Board();
    this.currentTurn     = COLORS.WHITE;
    this.moveHistory     = [];
    this.capturedByWhite = [];
    this.capturedByBlack = [];
    this.status          = 'playing';
    this.board.setupStandard();
    this._updateStatus();
  }
}

/* ═══════════════════════════════════════════════════════════════
   UI CLASS
═══════════════════════════════════════════════════════════════ */
class UI {
  constructor(game) {
    this.game       = game;
    this.selected   = null;   // currently selected piece
    this.legalMoves = [];     // legal moves for selected piece
    this.flipped    = false;  // board orientation
    this.lastMove   = null;   // { fromRow, fromCol, toRow, toCol }
    this.pendingPromotion = null; // waiting for user to pick promo piece

    this._initDOM();
    this._bindEvents();
    this.render();
  }

  /** Cache DOM references */
  _initDOM() {
    this.boardEl         = document.getElementById('board');
    this.turnEl          = document.getElementById('turn-indicator');
    this.checkEl         = document.getElementById('check-indicator');
    this.capturedWhiteEl = document.getElementById('captured-white');
    this.capturedBlackEl = document.getElementById('captured-black');
    this.historyBodyEl   = document.getElementById('history-body');
    this.promoModal      = document.getElementById('promotion-modal');
    this.promoChoices    = document.getElementById('promotion-choices');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.gameOverTitle   = document.getElementById('game-over-title');
    this.gameOverMsg     = document.getElementById('game-over-message');
  }

  /** Bind button and modal events */
  _bindEvents() {
    document.getElementById('btn-restart').addEventListener('click', () => this.restart());
    document.getElementById('btn-flip').addEventListener('click', () => {
      this.flipped = !this.flipped;
      this.render();
    });
    document.getElementById('btn-new-game').addEventListener('click', () => this.restart());
  }

  /** Full re-render */
  render() {
    this._renderBoard();
    this._renderStatus();
    this._renderCaptured();
    this._renderHistory();
  }

  /* ── Board rendering ──────────────────────────────────────── */
  _renderBoard() {
    this.boardEl.innerHTML = '';
    const king = this.game.status === 'check' || this.game.status === 'checkmate'
      ? this.game.board.findKing(this.game.currentTurn) : null;

    for (let visualRow = 0; visualRow < 8; visualRow++) {
      for (let visualCol = 0; visualCol < 8; visualCol++) {
        const row = this.flipped ? 7 - visualRow : visualRow;
        const col = this.flipped ? 7 - visualCol : visualCol;

        const sq = document.createElement('div');
        sq.classList.add('square', (row + col) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = row;
        sq.dataset.col = col;

        // Last-move highlight
        if (this.lastMove) {
          if (row === this.lastMove.fromRow && col === this.lastMove.fromCol)
            sq.classList.add('last-move-from');
          if (row === this.lastMove.toRow && col === this.lastMove.toCol)
            sq.classList.add('last-move-to');
        }

        // Selected highlight
        if (this.selected && row === this.selected.row && col === this.selected.col)
          sq.classList.add('selected');

        // Legal-move highlights
        const lm = this.legalMoves.find(m => m.row === row && m.col === col);
        if (lm) {
          sq.classList.add(this.game.board.pieceAt(row, col) || lm.enPassant
            ? 'legal-capture' : 'legal-move');
        }

        // King in check
        if (king && row === king.row && col === king.col)
          sq.classList.add('in-check');

        // Piece
        const piece = this.game.board.pieceAt(row, col);
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.classList.add('piece');
          pieceEl.textContent   = piece.glyph;
          pieceEl.draggable     = piece.color === this.game.currentTurn;
          pieceEl.dataset.row   = row;
          pieceEl.dataset.col   = col;

          // Drag events
          pieceEl.addEventListener('dragstart', e => this._onDragStart(e, piece));
          pieceEl.addEventListener('dragend',   e => this._onDragEnd(e));

          sq.appendChild(pieceEl);
        }

        // Square click
        sq.addEventListener('click',      e => this._onSquareClick(e, row, col));
        sq.addEventListener('dragover',   e => this._onDragOver(e));
        sq.addEventListener('dragleave',  e => this._onDragLeave(e));
        sq.addEventListener('drop',       e => this._onDrop(e, row, col));

        this.boardEl.appendChild(sq);
      }
    }
  }

  /* ── Status rendering ─────────────────────────────────────── */
  _renderStatus() {
    const color = this.game.currentTurn;
    const name  = color.charAt(0).toUpperCase() + color.slice(1);

    if (this.game.status === 'checkmate') {
      const winner = color === COLORS.WHITE ? 'Black' : 'White';
      this.turnEl.textContent = `${winner} wins!`;
      this.checkEl.classList.add('hidden');
      this._showGameOver('Checkmate!', `${winner} wins by checkmate.`);
    } else if (this.game.status === 'stalemate') {
      this.turnEl.textContent = 'Stalemate – Draw!';
      this.checkEl.classList.add('hidden');
      this._showGameOver('Stalemate!', 'The game is a draw.');
    } else {
      this.turnEl.textContent = `${name}'s Turn`;
      if (this.game.status === 'check') {
        this.checkEl.classList.remove('hidden');
      } else {
        this.checkEl.classList.add('hidden');
      }
    }
  }

  _showGameOver(title, message) {
    this.gameOverTitle.textContent   = title;
    this.gameOverMsg.textContent     = message;
    this.gameOverOverlay.classList.remove('hidden');
  }

  /* ── Captured pieces rendering ────────────────────────────── */
  _renderCaptured() {
    this.capturedWhiteEl.textContent = this.game.capturedByWhite.map(p => p.glyph).join(' ');
    this.capturedBlackEl.textContent = this.game.capturedByBlack.map(p => p.glyph).join(' ');
  }

  /* ── Move history rendering ───────────────────────────────── */
  _renderHistory() {
    const history = this.game.moveHistory;
    this.historyBodyEl.innerHTML = '';

    // Group into pairs (white, black)
    const rows = [];
    for (let i = 0; i < history.length; i += 2) {
      rows.push({ num: Math.floor(i / 2) + 1, white: history[i], black: history[i + 1] });
    }

    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.num}</td><td>${r.white ? r.white.san : ''}</td><td>${r.black ? r.black.san : ''}</td>`;
      this.historyBodyEl.appendChild(tr);
    }

    // Auto-scroll to bottom
    const moveHistoryDiv = document.getElementById('move-history');
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  }

  /* ── Interaction: click ───────────────────────────────────── */
  _onSquareClick(e, row, col) {
    e.stopPropagation();
    if (this.pendingPromotion) return; // waiting for promotion choice

    const piece = this.game.board.pieceAt(row, col);

    // If a piece is already selected, try to move
    if (this.selected) {
      const move = this.legalMoves.find(m => m.row === row && m.col === col);
      if (move) {
        this._executeMove(this.selected, row, col, move);
        return;
      }
    }

    // Select a piece of the current player
    if (piece && piece.color === this.game.currentTurn) {
      this.selected   = piece;
      this.legalMoves = this.game.legalMovesFor(piece);
    } else {
      this.selected   = null;
      this.legalMoves = [];
    }
    this._renderBoard();
  }

  /* ── Interaction: drag ────────────────────────────────────── */
  _onDragStart(e, piece) {
    if (piece.color !== this.game.currentTurn) { e.preventDefault(); return; }
    this.selected   = piece;
    this.legalMoves = this.game.legalMovesFor(piece);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${piece.row},${piece.col}`);
    // Make the dragged piece appear translucent
    setTimeout(() => {
      const el = e.target;
      if (el) el.classList.add('dragging');
    }, 0);
    this._renderBoard();
  }

  _onDragEnd(e) {
    const el = e.target;
    if (el) el.classList.remove('dragging');
  }

  _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sq = e.currentTarget;
    sq.classList.add('drag-over');
  }

  _onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  _onDrop(e, row, col) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!this.selected) return;
    const move = this.legalMoves.find(m => m.row === row && m.col === col);
    if (move) {
      this._executeMove(this.selected, row, col, move);
    }
  }

  /* ── Execute move (with promotion handling) ───────────────── */
  _executeMove(piece, toRow, toCol, moveHint) {
    const fromRow = piece.row, fromCol = piece.col;

    const isPromotion = piece.type === TYPES.PAWN &&
      ((piece.color === COLORS.WHITE && toRow === 0) ||
       (piece.color === COLORS.BLACK && toRow === 7));

    if (isPromotion) {
      this.pendingPromotion = { piece, toRow, toCol, moveHint };
      this._showPromotionModal(piece.color, (type) => {
        this._finishMove(piece, toRow, toCol, type, fromRow, fromCol);
      });
      return;
    }

    this._finishMove(piece, toRow, toCol, null, fromRow, fromCol);
  }

  _finishMove(piece, toRow, toCol, promotionType, fromRow, fromCol) {
    const result = this.game.makeMove(piece, toRow, toCol, promotionType);
    if (!result.ok) return;

    this.lastMove = { fromRow, fromCol, toRow, toCol };
    this.selected = null;
    this.legalMoves = [];
    this.pendingPromotion = null;
    this.render();
  }

  /* ── Promotion modal ──────────────────────────────────────── */
  _showPromotionModal(color, callback) {
    this.promoChoices.innerHTML = '';
    const options = [
      { type: 'Queen',  glyph: GLYPHS[color]['Queen']  },
      { type: 'Rook',   glyph: GLYPHS[color]['Rook']   },
      { type: 'Bishop', glyph: GLYPHS[color]['Bishop'] },
      { type: 'Knight', glyph: GLYPHS[color]['Knight'] }
    ];
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.classList.add('promo-btn');
      btn.textContent = opt.glyph;
      btn.title       = opt.type;
      btn.addEventListener('click', () => {
        this.promoModal.classList.add('hidden');
        callback(opt.type);
      });
      this.promoChoices.appendChild(btn);
    }
    this.promoModal.classList.remove('hidden');
  }

  /* ── Restart ──────────────────────────────────────────────── */
  restart() {
    this.game.reset();
    this.selected   = null;
    this.legalMoves = [];
    this.lastMove   = null;
    this.pendingPromotion = null;
    this.gameOverOverlay.classList.add('hidden');
    this.promoModal.classList.add('hidden');
    this.render();
  }
}

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  new UI(game);
});
