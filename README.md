# ♟ Online Chess Game

A fully-featured 2-player chess game that runs entirely in the browser — no server required.  
Built with **HTML5**, **CSS3**, and **vanilla JavaScript** using an **object-oriented** design.

---

## Features

| Feature | Details |
|---|---|
| Interactive 8×8 board | Dynamically generated via JavaScript |
| Full piece movement | All pieces follow official chess rules |
| Legal-move highlighting | Click a piece to see all valid moves |
| Drag & Drop | Drag pieces to move them (HTML5 Drag-and-Drop API) |
| Check detection | King square turns red when in check |
| Checkmate & Stalemate | Game-over overlay with result message |
| Castling | Both king-side and queen-side |
| En-passant | Full en-passant capture support |
| Pawn promotion | Modal lets you choose Queen / Rook / Bishop / Knight |
| Move history | Scrollable algebraic-notation panel |
| Captured pieces | Shown per player |
| Undo | Step back one move at a time |
| Restart | Reset the game at any point |
| Responsive design | Adapts to mobile viewports |

---

## Project Structure

```
Online-Chess-Game/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Styles (board, pieces, layout, animations)
├── js/
│   ├── pieces.js       # OOP piece hierarchy (Piece → King, Queen, …)
│   ├── game.js         # Game logic (turns, check, history, snapshots)
│   ├── board.js        # DOM rendering & user interaction
│   └── main.js         # Entry point — wires Game + Board
└── README.md
```

---

## How to Play

1. **Open** `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).  
   No build step or server needed — just open the file directly.

2. **White moves first.**  
   Click (or drag) a piece to see its legal moves highlighted on the board.

3. **Click a highlighted square** (or drop the piece there) to execute the move.

4. When a pawn reaches the opposite back rank a **promotion dialog** appears — pick your piece.

5. Use **↺ Restart Game** to reset, or **← Undo Move** to step back.

---

## OOP Architecture

```
Piece (abstract base class)
 ├── getLegalMoves(row, col, board, enPassantTarget) → [{row, col, …}]
 ├── King    – one square any direction + castling
 ├── Queen   – sliding diagonals + straights
 ├── Rook    – sliding straights
 ├── Bishop  – sliding diagonals
 ├── Knight  – L-shaped jumps
 └── Pawn    – one/two steps forward, diagonal captures, en-passant, promotion

Game
 ├── applyMove(from, to, promotionType) → result
 ├── getLegalMovesFor(row, col) → legal moves (checks filtered out)
 ├── undo() / reset()
 └── check / checkmate / stalemate detection

Board
 ├── render() – full DOM refresh
 ├── click-to-move handler
 ├── drag-and-drop handler
 ├── promotion modal
 └── game-over overlay
```

---

## Screenshots

The board renders in the browser with all pieces in their starting positions, a dark-themed UI with sidebars for move history and captured pieces, and a status bar showing whose turn it is.
<img width="1199" height="748" alt="Screenshot 2026-04-16 at 6 14 41 PM" src="https://github.com/user-attachments/assets/065246ee-ba5f-4da6-b402-671ebfadd1ea" />
<img width="1178" height="741" alt="Screenshot 2026-04-16 at 6 14 59 PM" src="https://github.com/user-attachments/assets/fcf366ee-b590-4194-9da4-307d0a392d7f" />


---

## Browser Support

Works in all modern browsers that support ES6 classes and the HTML5 Drag-and-Drop API.

