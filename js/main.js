/**
 * main.js
 * Entry point — wires the Game and Board together.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const boardEl = document.getElementById('chessboard');

  let game  = new Game();
  let board = new Board(game, boardEl);

  // Wire restart hook used by game-over overlay
  board._onRestart = restart;

  // Restart button
  document.getElementById('btn-restart').addEventListener('click', restart);

  // Undo button
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (game.undo()) {
      board._lastMove = null;
      board.clearSelection();
    }
  });

  function restart() {
    game  = new Game();
    board = new Board(game, boardEl);
    board._onRestart = restart;

    // Re-attach button listeners (Board re-creates the DOM but buttons are outside)
    // The existing listeners are still attached to the same DOM elements, so we
    // only need to update the closure variable references via restart().
  }
});
