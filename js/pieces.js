/**
 * pieces.js
 * OOP hierarchy for chess pieces.
 *
 * Class hierarchy:
 *   Piece (abstract base)
 *     ├── King
 *     ├── Queen
 *     ├── Rook
 *     ├── Bishop
 *     ├── Knight
 *     └── Pawn
 *
 * Each piece knows its colour ('white' | 'black'), its type name,
 * its Unicode glyph, and how to generate *pseudo-legal* moves
 * (moves that do not account for leaving own king in check — that
 * filter is applied by the Game class).
 */

'use strict';

/* ============================================================
   Unicode glyphs  (white pieces use filled, black uses outline)
   ============================================================ */
const GLYPHS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

/* ============================================================
   Helper: is [row, col] inside the board?
   ============================================================ */
function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/* ============================================================
   Base Piece class
   ============================================================ */
class Piece {
  /**
   * @param {'white'|'black'} color
   * @param {string} type  – lowercase type name
   */
  constructor(color, type) {
    this.color   = color;
    this.type    = type;
    this.glyph   = GLYPHS[color][type];
    this.hasMoved = false;    // used for castling / pawn double-step
  }

  /**
   * Generate pseudo-legal squares this piece can move to.
   * Subclasses must implement this method.
   * @param {number}   row   – current row (0 = rank 8)
   * @param {number}   col   – current col (0 = file a)
   * @param {Array}    board – 8×8 array of Piece|null
   * @param {Object|null} enPassantTarget – {row, col} of ep-capture square
   * @returns {Array<{row:number, col:number}>}
   */
  getLegalMoves(_row, _col, _board, _enPassantTarget) {
    throw new Error(`${this.constructor.name} must implement getLegalMoves()`);
  }

  /**
   * Sliding-piece helper: walk in one direction until blocked.
   */
  _slide(row, col, board, dRow, dCol) {
    const moves = [];
    let r = row + dRow;
    let c = col + dCol;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (target === null) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== this.color) moves.push({ row: r, col: c });
        break;
      }
      r += dRow;
      c += dCol;
    }
    return moves;
  }

  clone() {
    const p = new this.constructor(this.color);
    p.hasMoved = this.hasMoved;
    return p;
  }
}

/* ============================================================
   King
   ============================================================ */
class King extends Piece {
  constructor(color) { super(color, 'king'); }

  getLegalMoves(row, col, board, _enPassantTarget) {
    const moves = [];
    const dirs = [
      [-1,-1],[-1,0],[-1,1],
      [ 0,-1],        [ 0,1],
      [ 1,-1],[ 1,0],[ 1,1],
    ];
    for (const [dr, dc] of dirs) {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c)) {
        const target = board[r][c];
        if (target === null || target.color !== this.color) {
          moves.push({ row: r, col: c });
        }
      }
    }

    // Castling (pseudo-legal; check-safety is verified in Game)
    if (!this.hasMoved) {
      // King-side
      const kRook = board[row][7];
      if (
        kRook instanceof Rook && !kRook.hasMoved &&
        board[row][5] === null && board[row][6] === null
      ) {
        moves.push({ row, col: 6, castling: 'kingside' });
      }
      // Queen-side
      const qRook = board[row][0];
      if (
        qRook instanceof Rook && !qRook.hasMoved &&
        board[row][1] === null && board[row][2] === null && board[row][3] === null
      ) {
        moves.push({ row, col: 2, castling: 'queenside' });
      }
    }

    return moves;
  }
}

/* ============================================================
   Queen
   ============================================================ */
class Queen extends Piece {
  constructor(color) { super(color, 'queen'); }

  getLegalMoves(row, col, board) {
    const dirs = [
      [-1,-1],[-1,0],[-1,1],
      [ 0,-1],        [ 0,1],
      [ 1,-1],[ 1,0],[ 1,1],
    ];
    return dirs.flatMap(([dr, dc]) => this._slide(row, col, board, dr, dc));
  }
}

/* ============================================================
   Rook
   ============================================================ */
class Rook extends Piece {
  constructor(color) { super(color, 'rook'); }

  getLegalMoves(row, col, board) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    return dirs.flatMap(([dr, dc]) => this._slide(row, col, board, dr, dc));
  }
}

/* ============================================================
   Bishop
   ============================================================ */
class Bishop extends Piece {
  constructor(color) { super(color, 'bishop'); }

  getLegalMoves(row, col, board) {
    const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    return dirs.flatMap(([dr, dc]) => this._slide(row, col, board, dr, dc));
  }
}

/* ============================================================
   Knight
   ============================================================ */
class Knight extends Piece {
  constructor(color) { super(color, 'knight'); }

  getLegalMoves(row, col, board) {
    const jumps = [
      [-2,-1],[-2,1],[-1,-2],[-1,2],
      [ 1,-2],[ 1,2],[ 2,-1],[ 2,1],
    ];
    return jumps
      .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
      .filter(({ row: r, col: c }) => {
        if (!inBounds(r, c)) return false;
        const target = board[r][c];
        return target === null || target.color !== this.color;
      });
  }
}

/* ============================================================
   Pawn
   ============================================================ */
class Pawn extends Piece {
  constructor(color) { super(color, 'pawn'); }

  getLegalMoves(row, col, board, enPassantTarget) {
    const moves = [];
    // White moves up (decreasing row index), black moves down
    const dir   = this.color === 'white' ? -1 : 1;
    const start = this.color === 'white' ?  6 : 1;

    // One step forward
    if (inBounds(row + dir, col) && board[row + dir][col] === null) {
      moves.push({ row: row + dir, col });
      // Two steps from start
      if (row === start && board[row + 2 * dir][col] === null) {
        moves.push({ row: row + 2 * dir, col, doublePush: true });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const r = row + dir, c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (target !== null && target.color !== this.color) {
        moves.push({ row: r, col: c });
      }
      // En-passant
      if (
        enPassantTarget &&
        enPassantTarget.row === r &&
        enPassantTarget.col === c
      ) {
        moves.push({ row: r, col: c, enPassant: true });
      }
    }

    return moves;
  }
}

/* ============================================================
   Factory helper
   ============================================================ */
function createPiece(color, type) {
  switch (type) {
    case 'king':   return new King(color);
    case 'queen':  return new Queen(color);
    case 'rook':   return new Rook(color);
    case 'bishop': return new Bishop(color);
    case 'knight': return new Knight(color);
    case 'pawn':   return new Pawn(color);
    default: throw new Error(`Unknown piece type: ${type}`);
  }
}
