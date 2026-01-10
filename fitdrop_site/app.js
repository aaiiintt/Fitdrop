// FitDrop Application Logic
//
// Core logic for the physics-based fashion timeline.
// Handles Matter.js simulation, user interactions, and UI updates.

/**
 * Configuration settings for the physics simulation and UI.
 * @constant {Object}
 */
// Mobile detection
const isMobile = window.innerWidth <= 600;

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

// OPTIMIZATION ROLLED BACK: Sleeping broke mobile interaction (bodies became static/grey).
// Restoring continuous simulation and default iterations for robustness.
const engine = Engine.create({
    enableSleeping: false, // Critical fix: prevent bodies from sleeping
    // positionIterations: 6, // Default (restored)
    // velocityIterations: 4  // Default (restored)
});
const world = engine.world;

/**
 * Static Config with Locked-in Values
 */
const CONFIG = {
    // Physics Constants
    dropInterval: 1400,
    physicsScale: isMobile ? 0.2 : 0.4, // User locked-in values
    visualScale: isMobile ? 0.2 : 0.4,  // User locked-in values
    restitution: 0.2, // Bounciness
    friction: 0.5,
    gravityY: 1.0,
    timeScale: 1.0,

    // Environment
    scrollPadding: 200,
    groundHeight: 100,
    wallThickness: 200,
    soundCooldown: isMobile ? 200 : 100,
    soundThreshold: isMobile ? 4.0 : 2.5
};

// Apply Environment Settings
engine.gravity.y = CONFIG.gravityY;
engine.timing.timeScale = CONFIG.timeScale;

// --- State Management ---
const state = {
    currentIndex: 0,
    isDropping: true,
    highestPoint: 0,
    offsetY: 0,     // Camera vertical offset
    loadedTextures: {},
    audio: null,
    audioUnlocked: false,
    lastSoundTime: 0 // For throttling
};


// Initialize Renderer
// OPTIMIZATION: Cap pixel ratio on mobile to prevent huge canvases
// Revert optimization: Pixel ratio cap caused hit-test mismatches on high-DPI
const pixelRatio = window.devicePixelRatio;

const render = Render.create({
    element: document.getElementById('world'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#f4f4f4',
        pixelRatio: pixelRatio, // Explicitly set optimized pixel ratio
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

// Unlock audio on first user interaction
const unlockAudio = () => {
    if (state.audioUnlocked || !state.audio) return;

    // Play silent sound to unlock AudioContext
    state.audio.play().then(() => {
        state.audio.pause();
        state.audio.currentTime = 0;
        state.audioUnlocked = true;
        // Remove listeners once unlocked
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    }).catch(e => console.log("Unlock failed", e));
};

document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

/**
 * Plays the collision sound effect with slight variation.
 */
const playSound = () => {
    const now = Date.now();
    if (state.audio && state.audioUnlocked) {
        // Throttling check
        if (now - state.lastSoundTime < CONFIG.soundCooldown) return;

        const sound = state.audio.cloneNode();
        sound.volume = 0.3 + Math.random() * 0.2;
        sound.play().catch(() => { });

        state.lastSoundTime = now;
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

    // Dimensions
    // Base width reference is 200px.
    const baseWidth = 200;
    const width = baseWidth * CONFIG.physicsScale;
    const height = width * 2.5; // Roughly human proportion

    const body = Bodies.rectangle(x, y, width, height, {
        restitution: CONFIG.restitution,
        friction: CONFIG.friction,
        angle: (Math.random() - 0.5) * 0.5, // Slight random rotation
        render: {
            sprite: {
                texture: data.image,
                // We calculate scale below
            }
        },
        plugin: {
            fitData: data, // Store metadata in the body
            isFalling: true // Tag as falling initially
        }
    });

    // Force body to never sleep
    body.sleepThreshold = Infinity;

    // Scale Logic:
    const rawImageWidth = 800; // Approx raw asset size
    const targetVisualWidth = 500 * CONFIG.visualScale; // Tuned multiplier
    const spriteScale = targetVisualWidth / rawImageWidth;

    // Apply sprite scale
    body.render.sprite.xScale = spriteScale;
    body.render.sprite.yScale = spriteScale;

    Composite.add(world, body);

    // Update UI Year counter
    const counter = document.getElementById('year-counter');
    if (counter) counter.innerText = data.year;
}

/**
 * Main loop to drop items at intervals.
 */
let dropTimeout;
function startDrops() {
    clearTimeout(dropTimeout);

    if (state.currentIndex >= FIT_DATA.length) {
        // End of sequence
        state.isDropping = false;

        // Update UI for end state
        const yearCounter = document.getElementById('year-counter');
        if (yearCounter) yearCounter.innerText = "1980–2025";
        return;
    }

    const data = FIT_DATA[state.currentIndex];
    spawnFit(data);

    state.currentIndex++;

    // Loop using the configured interval
    setTimeout(startDrops, CONFIG.dropInterval);
}

function resetWorld() {
    // Legacy function support if needed, or simply reload page
    window.location.reload();
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
    document.getElementById('panel-year').textContent = data.year;
    document.getElementById('panel-image').src = data.image; // Set image source
    document.getElementById('panel-label').textContent = data.label.replace(/-/g, ' '); // Clean label

    const wardrobeList = document.getElementById('panel-wardrobe');
    wardrobeList.innerHTML = '';

    if (Array.isArray(data.wardrobe)) {
        data.wardrobe.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            wardrobeList.appendChild(li);
        });
    } else {
        wardrobeList.innerHTML = '<li>Data unavailable</li>';
    }

    infoPanel.classList.add('visible');
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.classList.add('panel-open');
}

document.getElementById('close-panel').addEventListener('click', () => {
    infoPanel.classList.remove('visible');
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.classList.remove('panel-open');
});

// Replay Button Logic
const replayBtn = document.getElementById('replay-btn');
if (replayBtn) {
    replayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.reload();
    });
}

// Info Popover Logic
// --- Tabbed Popover Logic ---
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Deactivate all
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Activate clicked
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(`tab-${targetId}`).classList.add('active');
    });
});

// --- Auto-Open Logic on First Visit ---
const infoPopover = document.getElementById('info-popover');
const infoBtn = document.getElementById('info-btn');

// Ensure elements exist before adding listeners
if (infoPopover && infoBtn) {
    function togglePopover() {
        infoPopover.classList.toggle('visible');
    }

    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover();
    });

    // Close when clicking outside
    const closePopover = (e) => {
        if (!infoPopover.contains(e.target) && e.target !== infoBtn) {
            infoPopover.classList.remove('visible');
        }
    };

    document.addEventListener('click', closePopover);
    document.addEventListener('touchstart', closePopover);

    // Auto-open check
    window.addEventListener('load', () => {
        const hasVisited = localStorage.getItem('fitdrop_visited');
        if (!hasVisited) {
            // First visit: Open popover
            setTimeout(() => {
                infoPopover.classList.add('visible');
            }, 1000); // Slight delay for effect
            localStorage.setItem('fitdrop_visited', 'true');
        }
    });
} else {
    console.error("Info button or popover elements missing!");
}

// --- Initialization ---
Render.run(render);
Runner.run(runner, engine);

// Handle Resize
// Smart Resize: Only reload if width changes (orientation change), ignoring mobile URL bar scroll
let lastWidth = window.innerWidth;
let resizeTimeout;

window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            window.location.reload();
        }, 500);
    }
});

// Start the drop sequence
setTimeout(startDrops, 1000);
