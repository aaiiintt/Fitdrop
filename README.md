# FitDrop 1980-2025

**FitDrop** is an interactive, physics-based fashion timeline that explores iconic looks from 1980 to 2025. It uses a physics engine to simulate a "pile" of generated fashion images, allowing users to interactively drag, drop, and inspect details of each era's style.

## Features

-   **Physics Simulation**: powered by `matter.js`, images tumble and stack realistically.
-   **Interactive Inspection**: Drag "models" to the drop zone to reveal detailed wardrobe information.
-   **Generative Content**: Images and wardrobe data generated using Gemini 3 Pro (Nano Banana).
-   **Responsive Design**: Mobile-friendly layout with touch interactions.

## Technology Stack

-   **Frontend**: HTML5, CSS3, Vanilla JavaScript
-   **Physics**: [Matter.js](https://brm.io/matter-js/)
-   **AI/Generation**: Google Gemini 3 Pro
-   **Font**: Space Mono (Google Fonts)

## Installation & Usage

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/fitdrop.git
    cd fitdrop
    ```

2.  **Serve the site**:
    The project is a static site. You can serve it using Python's built-in server or any static file host.

    ```bash
    cd fitdrop_site
    python3 -m http.server 8000
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:8000`

## Project Structure

-   `fitdrop_site/`: The main web application.
    -   `app.js`: Core logic for physics, interactions, and UI.
    -   `data.js`: Auto-generated dataset of looks and wardrobe metadata.
    -   `images/`: Directory of generated fashion assets.
-   `generated_images/`: Raw output from the AI generation pipeline.
-   `setup_prompts.js` / `test_generation.js`: Scripts for generating the underlying content.

## License

MIT License. See [LICENSE](LICENSE) for details.
