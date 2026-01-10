// FitDrop Application Logic
//
// Core logic for the physics-based fashion timeline.
// Handles Matter.js simulation, user interactions, and UI updates.

/**
 * Configuration settings for the physics simulation and UI.
 * @constant {Object}
 */
const CONFIG = {
    dropInterval: 1400, // ms between drops
    scale: 0.35,        // Scale of images relative to original size (tweak as needed)
    soundThreshold: 2.5, // Velocity threshold for sound playback
    scrollPadding: 200, // Pixel buffer above highest item for camera scrolling
    groundHeight: 100,  // Thickness of the invisible ground
    wallThickness: 200  // Thickness of the invisible walls
};

// --- State Management ---
const state = {
    currentIndex: 0,
    isDropping: true,
    highestPoint: 0,
    offsetY: 0,     // Camera vertical offset
    loadedTextures: {},
    audio: null
};

// --- Physics Engine Setup ---
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Body = Matter.Body;

const engine = Engine.create();
const world = engine.world;

// Initialize Renderer
const render = Render.create({
    element: document.getElementById('world'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#f4f4f4',
        wireframes: false,
        showAngleIndicator: false
    }
});

const runner = Runner.create();

// --- Audio Setup ---
try {
    state.audio = new Audio('pop.mp3');
    state.audio.volume = 0.4;
} catch (e) {
    console.log("Audio file not found or blocked");
}

/**
 * Plays the collision sound effect with slight variation.
 */
const playSound = () => {
    if (state.audio) {
        const sound = state.audio.cloneNode();
        sound.volume = 0.3 + Math.random() * 0.2;
        sound.play().catch(() => { });
    }
};

// --- Boundary Management ---
let ground, leftWall, rightWall;

/**
 * Creates or updates the static boundaries (ground and walls) based on window size.
 */
function createBoundaries() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Remove existing if any
    if (ground) Composite.remove(world, [ground, leftWall, rightWall]);

    ground = Bodies.rectangle(width / 2, height + CONFIG.groundHeight / 2, width * 10, CONFIG.groundHeight, {
        isStatic: true,
        render: { visible: false }
    });

    leftWall = Bodies.rectangle(0 - CONFIG.wallThickness / 2, height * 10, CONFIG.wallThickness, height * 50, {
        isStatic: true,
        render: { visible: false }
    });

    rightWall = Bodies.rectangle(width + CONFIG.wallThickness / 2, height * 10, CONFIG.wallThickness, height * 50, {
        isStatic: true,
        render: { visible: false }
    });

    Composite.add(world, [ground, leftWall, rightWall]);
}

createBoundaries();

// --- Interaction Setup (Mouse/Touch) ---
const dropZone = document.getElementById('drop-zone');
const infoPanel = document.getElementById('info-panel');
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});

Composite.add(world, mouseConstraint);
render.mouse = mouse;

// --- Dropping Logic ---

/**
 * Spawns a new fashion item body into the world.
 * @param {Object} data - The metadata for the item (year, label, image source).
 */
function spawnFit(data) {
    const margin = 100;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = -300 - state.offsetY; // Spawn above current view

    // Calculate dimensions
    const width = 200 * CONFIG.scale * (window.innerWidth < 600 ? 0.8 : 1.2);
    const height = width * 2.5; // Roughly human proportion

    const body = Bodies.rectangle(x, y, width, height, {
        restitution: 0.2, // Bouncy
        friction: 0.5,
        angle: (Math.random() - 0.5) * 0.5, // Slight random rotation
        render: {
            sprite: {
                texture: data.image,
                xScale: (width / 768) * CONFIG.scale * 3, // Approx scaling based on raw asset size
                yScale: (width / 768) * CONFIG.scale * 3
            }
        },
        plugin: {
            fitData: data, // Store metadata in the body
            isFalling: true // Tag as falling initially
        }
    });

    // Refine body bounds for better collision boxes
    const baseImageWidth = 800;
    const targetWidth = 180;
    const scaleFactor = targetWidth / baseImageWidth;
    const aspect = 1376 / 768; // Based on known image dims
    const actualHeight = targetWidth * aspect;

    Body.set(body, {
        bounds: {
            min: { x: x - targetWidth / 2, y: y - actualHeight / 2 },
            max: { x: x + targetWidth / 2, y: y + actualHeight / 2 }
        }
    });

    body.render.sprite.xScale = scaleFactor;
    body.render.sprite.yScale = scaleFactor;

    Composite.add(world, body);

    // Update UI Year counter
    document.getElementById('year-counter').innerText = data.year;
}

/**
 * Main loop to drop items at intervals.
 */
function startDrops() {
    if (state.currentIndex >= FIT_DATA.length) return;

    const data = FIT_DATA[state.currentIndex];
    spawnFit(data);
    state.currentIndex++;

    setTimeout(startDrops, CONFIG.dropInterval);
}

// --- Render Loop & Camera Logic ---

function updateEffects() {
    // 1. Camera Scroll Logic
    const allBodies = Composite.allBodies(world);
    let minY = window.innerHeight; // Default to ground level

    allBodies.forEach(b => {
        // Ignore static bodies (walls/ground) AND currently falling bodies
        if (!b.isStatic && !b.plugin.isFalling && b.position.y < minY) {
            minY = b.position.y;
        }
    });

    const targetOffset = Math.max(0, 100 - minY); // Keep 100px padding

    // Smooth Lerp for camera movement
    state.offsetY += (targetOffset - state.offsetY) * 0.05;

    // Apply translation to Render bounds
    Render.lookAt(render, {
        min: { x: 0, y: -state.offsetY },
        max: { x: window.innerWidth, y: window.innerHeight - state.offsetY }
    });

    // 2. Drop Zone Visual Feedback
    if (mouseConstraint.body) {
        const zoneRect = dropZone.getBoundingClientRect();
        const mx = mouse.absolute.x;
        const my = mouse.absolute.y;

        if (mx >= zoneRect.left && mx <= zoneRect.right &&
            my >= zoneRect.top && my <= zoneRect.bottom) {
            dropZone.classList.add('active');
        } else {
            dropZone.classList.remove('active');
        }
    } else {
        dropZone.classList.remove('active');
    }
}

Events.on(engine, 'afterUpdate', updateEffects);

// --- Interactions (Drag & Drop) ---

let draggedBody = null;

Events.on(mouseConstraint, 'startdrag', (e) => {
    draggedBody = e.body;
});

Events.on(mouseConstraint, 'enddrag', (e) => {
    // Check if dropped in zone
    const mousePos = e.mouse.absolute;
    const zoneRect = dropZone.getBoundingClientRect();

    if (mousePos.x >= zoneRect.left && mousePos.x <= zoneRect.right &&
        mousePos.y >= zoneRect.top && mousePos.y <= zoneRect.bottom) {

        if (draggedBody && draggedBody.plugin.fitData) {
            showPanel(draggedBody.plugin.fitData);
        }
    }
    draggedBody = null;
});

// --- Collision Sound Logic ---

Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    let play = false;

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];

        // Mark bodies as no longer falling on first collision
        if (pair.bodyA.plugin.isFalling) pair.bodyA.plugin.isFalling = false;
        if (pair.bodyB.plugin.isFalling) pair.bodyB.plugin.isFalling = false;

        // Check relative impact speed for sound
        const speedA = pair.bodyA.speed;
        const speedB = pair.bodyB.speed;

        if (speedA > CONFIG.soundThreshold || speedB > CONFIG.soundThreshold) {
            play = true;
            break;
        }
    }

    if (play) playSound();
});


// --- UI Logic ---

/**
 * Displays the info panel with details for a specific item.
 * @param {Object} data - The item data to display.
 */
function showPanel(data) {
    document.getElementById('panel-year').innerText = data.year;
    document.getElementById('panel-image').src = data.image; // Set image source
    document.getElementById('panel-label').innerText = data.label.replace(/-/g, ' '); // Clean label

    const wardrobeList = document.getElementById('panel-wardrobe');
    wardrobeList.innerHTML = '';

    if (Array.isArray(data.wardrobe)) {
        data.wardrobe.forEach(item => {
            const li = document.createElement('li');
            li.innerText = item;
            wardrobeList.appendChild(li);
        });
    } else {
        wardrobeList.innerHTML = '<li>Data unavailable</li>';
    }

    infoPanel.classList.add('visible');
}

document.getElementById('close-panel').addEventListener('click', () => {
    infoPanel.classList.remove('visible');
});

// Info Popover Logic
const infoBtn = document.getElementById('info-btn');
const infoPopover = document.getElementById('info-popover');

if (infoBtn && infoPopover) {

    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        infoPopover.classList.toggle('visible');
    });

    // Close popover when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!infoPopover.contains(e.target) && e.target !== infoBtn) {
            if (infoPopover.classList.contains('visible')) {
                infoPopover.classList.remove('visible');
            }
        }
    });
} else {
    console.error("Info button or popover elements missing!");
}

// --- Initialization ---
Render.run(render);
Runner.run(runner, engine);

// Handle Resize
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    createBoundaries();
});

// Start the drop sequence
setTimeout(startDrops, 1000);
