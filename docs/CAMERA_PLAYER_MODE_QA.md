# Camera Player Mode QA

This checklist belongs to Step 2 of the camera app roadmap: make Player Mode responsive and stable.

## Scope

Route: `/admin/camera`

Player Mode must behave like a fullscreen activity stage. It should work on large screen web first, mobile web second, and tablet as a supported middle size.

## Viewport Matrix

Required checks:

| Viewport | Device role | Must verify |
| --- | --- | --- |
| 1920 x 1080 | Large screen / TV | Stage fills viewport, HUD readable from distance, no admin layout space. |
| 1366 x 768 | Laptop / classroom display | Home grid, lobby card, game HUD, result card fit without awkward clipping. |
| 844 x 390 | Mobile landscape | Lobby and result can scroll if needed, game HUD does not cover the whole play area. |
| 430 x 932 | Mobile portrait | Buttons stack cleanly, text wraps, no horizontal overflow. |
| 390 x 844 | Mobile portrait | Home, lobby, result, and report remain usable. |
| 360 x 740 | Compact mobile | Controls remain tappable, report/history content scrolls. |
| 1024 x 768 | Tablet landscape | Stage does not split into separate video/canvas areas. |
| 768 x 1024 | Tablet portrait | UI remains readable and scrollable. |

## Screen Checks

### Home

- Mode cards fit without horizontal overflow.
- On large screens, mode cards use the extra width instead of leaving the page cramped.
- On mobile, action buttons and mode cards stack cleanly.
- Top-left player exit link does not hide primary content.

### Lobby

- Camera initialization status remains visible.
- Settings controls are tappable on mobile.
- Start button remains reachable on short landscape screens.
- The page can scroll vertically if the card is taller than the viewport.

### Game

- Canvas fills the full viewport.
- Raw video element is not visible as a separate preview.
- Timer, score, pause, mission, and feedback remain readable.
- On mobile widths, mission banner wraps below the timer/score row.
- Touch gestures do not scroll the page during gameplay.

### Result

- Stats and player scores do not overflow.
- Action buttons stack on compact mobile.
- The result card can scroll if the viewport is short.

### Report

- Chart and history list fit the available width.
- Header actions wrap on compact mobile.
- History rows wrap instead of overflowing horizontally.

## Stability Checks

- Resize the browser window while on lobby and game screens.
- Rotate mobile/tablet from portrait to landscape and back.
- Re-enter from browser background.
- Deny camera permission and confirm the error message stays in the lobby UI.
- Reload while on the route and confirm no surrounding admin layout occupies space.

## Pass Definition

Step 2 is acceptable when:

- Player Mode owns the full viewport at every required size.
- The raw camera video never appears as a second visible pane.
- Menu/result/report screens can scroll where needed.
- Game screen itself does not scroll during active play.
- No required control is clipped or unreachable.

