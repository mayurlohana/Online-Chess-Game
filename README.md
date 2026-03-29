# ♟ Online Chess Game

A fully-featured, browser-based 2-player chess game built with **HTML**, **CSS**, and **JavaScript** using an **object-oriented** architecture. No backend or external libraries required — open `index.html` and play immediately.

---

## Features

| Feature | Details |
|---|---|
| 🎯 Full chess rules | Legal move generation for all pieces, including special moves |
| ♟ All piece types | King, Queen, Rook, Bishop, Knight, Pawn |
| ✨ Special moves | Castling (king-side & queen-side), En passant, Pawn promotion |
| 🚫 Illegal move prevention | Moves that leave the king in check are blocked |
| 👑 Check & Checkmate | Detected and announced; king square highlighted in red |
| 🤝 Stalemate | Detected and announced as a draw |
| 🟢 Legal move hints | Click or drag a piece to see all legal destination squares highlighted |
| 🖱️ Drag & Drop | Drag pieces with the HTML5 Drag-and-Drop API |
| 🖱️ Click-to-move | Click a piece then click a destination |
| 🔄 Restart | Reset the game at any time |
| ⇅ Flip board | Toggle board orientation |
| 📋 Move history | Algebraic-notation move log with move numbers |
| 🏆 Captured pieces | Both players' captured pieces displayed |
| 📱 Responsive | Scales for mobile/tablet screens |

---

## How to Play

1. Clone or download the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. **White moves first.** Click or drag a piece to select it — legal destinations are highlighted.
4. Click or drop on a highlighted square to make the move.
5. When a pawn reaches the opposite back rank, a **promotion dialog** appears — choose the piece type.
6. The game announces **Check**, **Checkmate**, or **Stalemate** automatically.
7. Press **↺ Restart** or **New Game** to start a fresh game.
8. Press **⇅ Flip Board** to flip the perspective.

---

## Project Structure

```
Online-Chess-Game/
├── index.html   # Game layout: board, panels, modals
├── style.css    # Board, pieces, highlights, responsive layout
├── chess.js     # OOP game logic + UI controller
└── README.md    # This file
```

### OOP Architecture (`chess.js`)

```
Piece (base)
  ├── King
  ├── Queen
  ├── Rook
  ├── Bishop
  ├── Knight
  └── Pawn

Board          – 8×8 grid, move application, check detection
Game           – turn management, legal moves, history, captures
UI             – DOM rendering, click/drag interaction, modals
```

---

## Screenshots

> Open `index.html` in your browser to see the game in action.

### Starting position
The board is generated dynamically with JavaScript. White pieces are at the bottom, black at the top. Rank and file labels are shown around the board.

### Legal-move highlights
Clicking (or starting a drag on) any piece highlights all legal destination squares in green/red.

### Move history & captured pieces
The right panel shows the move history in algebraic notation. Captured pieces are displayed in both side panels.

---

## Technologies Used

- **HTML5** – semantic structure, drag-and-drop API
- **CSS3** – flexbox/grid layout, transitions, responsive design
- **Vanilla JavaScript (ES6+)** – OOP, classes, arrow functions, `const`/`let`

