/**
 * game.js
 * Game class – orchestrates the chess game logic.
 *
 * Responsibilities:
 *  - Initialise / reset the board state
 *  - Track whose turn it is
 *  - Enforce legal-move rules (including check-prevention)
 *  - Detect check, checkmate, and stalemate
 *  - Handle special moves: castling, en-passant, pawn promotion
 *  - Maintain move history and captured-piece lists
 *  - Expose an applyMove() API consumed by the Board (UI layer)
 */

'use strict';

class Game {
  constructor() {
    /** @type {Array<Array<Piece|null>>} 8×8 board */
    this.board = [];
    /** @type {'white'|'black'} */
    this.currentTurn = 'white';
    /** @type {{row:number,col:number}|null} en-passant capture square */
    this.enPassantTarget = null;
    /** @type {Piece[]} */
    this.capturedByWhite = [];   // black pieces captured by white
    /** @type {Piece[]} */
    this.capturedByBlack = [];   // white pieces captured by black
    /** @type {string[]} algebraic notation strings */
    this.moveHistory = [];
    /** @type {Array} snapshot stack for undo */
    this._snapshots = [];
    /** @type {boolean} */
    this.isOver = false;
    /** @type {string} */
    this.resultMessage = '';

    this._init();
  }

  /* ----------------------------------------------------------
     Initialisation
     ---------------------------------------------------------- */
  _init() {
    this.board           = this._buildStartingBoard();
    this.currentTurn     = 'white';
    this.enPassantTarget = null;
    this.capturedByWhite = [];
    this.capturedByBlack = [];
    this.moveHistory     = [];
    this._snapshots      = [];
    this.isOver          = false;
    this.resultMessage   = '';
  }

  _buildStartingBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRow = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

    for (let c = 0; c < 8; c++) {
      b[0][c] = createPiece('black', backRow[c]);
      b[1][c] = createPiece('black', 'pawn');
      b[6][c] = createPiece('white', 'pawn');
      b[7][c] = createPiece('white', backRow[c]);
    }
    return b;
  }

  /* ----------------------------------------------------------
     Public API: apply a move
     Returns an object describing what happened so the UI can react.
     ---------------------------------------------------------- */
  applyMove(fromRow, fromCol, toRow, toCol, promotionType = 'queen') {
    if (this.isOver) return null;

    const legalMoves = this.getLegalMovesFor(fromRow, fromCol);
    const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
    if (!move) return null;

    // Save snapshot for undo
    this._snapshots.push(this._snapshot());

    const piece    = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    let   special  = null;

    // --- En-passant capture ---
    if (move.enPassant) {
      const capturedPawnRow = fromRow; // same row as moving pawn
      const capturedPawn    = this.board[capturedPawnRow][toCol];
      this.board[capturedPawnRow][toCol] = null;
      this._recordCapture(capturedPawn);
      special = 'enPassant';
    }

    // --- Castling ---
    if (move.castling) {
      const rookFromCol = move.castling === 'kingside' ? 7 : 0;
      const rookToCol   = move.castling === 'kingside' ? 5 : 3;
      const rook = this.board[fromRow][rookFromCol];
      this.board[fromRow][rookToCol]   = rook;
      this.board[fromRow][rookFromCol] = null;
      rook.hasMoved = true;
      special = move.castling;
    }

    // --- Normal capture ---
    if (captured) this._recordCapture(captured);

    // --- Move piece ---
    this.board[toRow][toCol]     = piece;
    this.board[fromRow][fromCol] = null;
    piece.hasMoved = true;

    // --- Pawn promotion ---
    let promoted = false;
    if (piece instanceof Pawn) {
      if (toRow === 0 || toRow === 7) {
        this.board[toRow][toCol] = createPiece(piece.color, promotionType);
        this.board[toRow][toCol].hasMoved = true;
        promoted = true;
        special = 'promotion';
      }
    }

    // --- Update en-passant target ---
    this.enPassantTarget = move.doublePush
      ? { row: fromRow + (toRow - fromRow) / 2, col: toCol }
      : null;

    // --- Record move notation ---
    const notation = this._toNotation(piece, fromRow, fromCol, toRow, toCol,
                                       !!captured || move.enPassant, special, promoted, promotionType);
    this.moveHistory.push(notation);

    // --- Switch turn ---
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

    // --- Check / checkmate / stalemate ---
    const inCheck     = this.isInCheck(this.currentTurn);
    const hasLegal    = this._hasAnyLegalMove(this.currentTurn);
    let   gameOverMsg = null;

    if (!hasLegal) {
      this.isOver = true;
      if (inCheck) {
        const winner = this.currentTurn === 'white' ? 'Black' : 'White';
        this.resultMessage = `Checkmate! ${winner} wins! 🏆`;
        gameOverMsg        = this.resultMessage;
      } else {
        this.resultMessage = "Stalemate! It's a draw. 🤝";
        gameOverMsg        = this.resultMessage;
      }
    }

    return {
      notation,
      captured,
      special,
      inCheck,
      isOver: this.isOver,
      gameOverMsg,
    };
  }

  /* ----------------------------------------------------------
     Undo last move
     ---------------------------------------------------------- */
  undo() {
    if (this._snapshots.length === 0) return false;
    this._restoreSnapshot(this._snapshots.pop());
    this.moveHistory.pop();
    return true;
  }

  /* ----------------------------------------------------------
     Reset
     ---------------------------------------------------------- */
  reset() {
    this._init();
  }

  /* ----------------------------------------------------------
     Check detection
     ---------------------------------------------------------- */
  isInCheck(color) {
    const kingPos = this._findKing(color);
    if (!kingPos) return false;
    return this._isSquareAttackedBy(kingPos.row, kingPos.col, this._opponent(color));
  }

  _findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p instanceof King && p.color === color) return { row: r, col: c };
      }
    }
    return null;
  }

  _isSquareAttackedBy(row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== attackerColor) continue;
        // Use raw pseudo-legal moves (no en-passant needed for attack detection)
        const moves = p.getLegalMoves(r, c, this.board, null);
        if (moves.some(m => m.row === row && m.col === col)) return true;
      }
    }
    return false;
  }

  _wouldLeaveKingInCheck(fromRow, fromCol, move) {
    // Make move on a temporary copy
    const saved  = this._snapshotBoard();
    const piece  = this.board[fromRow][fromCol];

    // En-passant
    if (move.enPassant) this.board[fromRow][move.col] = null;

    this.board[move.row][move.col] = piece;
    this.board[fromRow][fromCol]   = null;

    // Castling: also move rook
    if (move.castling) {
      const rookFromCol = move.castling === 'kingside' ? 7 : 0;
      const rookToCol   = move.castling === 'kingside' ? 5 : 3;
      this.board[fromRow][rookToCol]   = this.board[fromRow][rookFromCol];
      this.board[fromRow][rookFromCol] = null;
    }

    const inCheck = this.isInCheck(piece.color);

    // Restore
    this._restoreBoard(saved);
    return inCheck;
  }

  /* Castling safety: king must not pass through attacked square */
  _castlingPathSafe(color, side) {
    const row  = color === 'white' ? 7 : 0;
    const cols = side === 'kingside' ? [4, 5, 6] : [4, 3, 2];
    const opp  = this._opponent(color);
    return cols.every(c => !this._isSquareAttackedBy(row, c, opp));
  }

  /* ----------------------------------------------------------
     Legal-move existence check (for checkmate/stalemate)
     ---------------------------------------------------------- */
  _hasAnyLegalMove(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;
        const pseudo = p.getLegalMoves(r, c, this.board, this.enPassantTarget);
        if (pseudo.some(m => !this._wouldLeaveKingInCheck(r, c, m))) return true;
      }
    }
    return false;
  }

  /* ----------------------------------------------------------
     Public API: get legal moves for a piece (used by Board UI).
     Includes castling safety: king must not move through check.
     ---------------------------------------------------------- */
  getLegalMovesFor(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.color !== this.currentTurn) return [];

    const pseudo = piece.getLegalMoves(row, col, this.board, this.enPassantTarget);
    return pseudo.filter(move => {
      if (move.castling) {
        // King must not be currently in check, and must not pass through attacked squares
        if (this.isInCheck(piece.color)) return false;
        if (!this._castlingPathSafe(piece.color, move.castling)) return false;
      }
      return !this._wouldLeaveKingInCheck(row, col, move);
    });
  }

  /* ----------------------------------------------------------
     ---------------------------------------------------------- */
  _recordCapture(piece) {
    if (piece.color === 'black') {
      this.capturedByWhite.push(piece);
    } else {
      this.capturedByBlack.push(piece);
    }
  }

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */
  _opponent(color) {
    return color === 'white' ? 'black' : 'white';
  }

  _snapshotBoard() {
    return this.board.map(row => row.map(p => {
      if (!p) return null;
      const clone = createPiece(p.color, p.type);
      clone.hasMoved = p.hasMoved;
      return clone;
    }));
  }

  _restoreBoard(saved) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.board[r][c] = saved[r][c];
      }
    }
  }

  _snapshot() {
    return {
      board:           this._snapshotBoard(),
      currentTurn:     this.currentTurn,
      enPassantTarget: this.enPassantTarget
        ? { ...this.enPassantTarget } : null,
      capturedByWhite: [...this.capturedByWhite],
      capturedByBlack: [...this.capturedByBlack],
      isOver:          this.isOver,
      resultMessage:   this.resultMessage,
    };
  }

  _restoreSnapshot(snap) {
    this._restoreBoard(snap.board);
    this.currentTurn     = snap.currentTurn;
    this.enPassantTarget = snap.enPassantTarget;
    this.capturedByWhite = snap.capturedByWhite;
    this.capturedByBlack = snap.capturedByBlack;
    this.isOver          = snap.isOver;
    this.resultMessage   = snap.resultMessage;
  }

  /* ----------------------------------------------------------
     Algebraic notation (simplified)
     ---------------------------------------------------------- */
  _toNotation(piece, fr, fc, tr, tc, isCapture, special, promoted, promotionType) {
    const files = 'abcdefgh';
    const ranks = '87654321';

    if (special === 'kingside')  return 'O-O';
    if (special === 'queenside') return 'O-O-O';

    let str = '';
    if (!(piece instanceof Pawn)) {
      str += piece.type.charAt(0).toUpperCase();
      if (piece instanceof Knight) str = 'N';
    }
    if (isCapture && piece instanceof Pawn) str += files[fc];
    if (isCapture) str += 'x';
    str += files[tc] + ranks[tr];
    if (promoted) str += '=' + promotionType.charAt(0).toUpperCase();
    if (special === 'enPassant') str += ' e.p.';
    return str;
  }
}
