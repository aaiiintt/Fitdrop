# Browser Verification Plan

## Objective
Verify the core functionality of the FitDrop application.

## Test Cases

1.  **Page Load**
    -   Open `http://localhost:8000/` (or configured local server).
    -   Verify Title is "FitDrop 1980-2025".
    -   Verify Canvas `#world` is present.
    -   Verify "DROP TO INSPECT" zone is visible.

2.  **Physics & Rendering**
    -   Observe images falling/simulating.
    -   Verify `matter-js` is active (bodies present in canvas).

3.  **Interactions**
    -   **Info Popover**: Click "INFO" button. Verify popover appears. Click outside to close.
    -   **Drag & Drop**:
        -   Drag an item.
        -   Drop it into the "DROP TO INSPECT" zone.
        -   Verify `#info-panel` slides in (class `visible`).
        -   Verify panel content matches an item (Year, Label, Wardrobe).
    -   **Close Panel**: Click "×" on the info panel. Verify it closes.

4.  **Responsiveness (Optional)**
    -   Resize window and observe boundary adaptation.
