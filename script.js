// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    // fetchSignInMethodsForEmail, // No longer needed
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    deleteDoc,
    Timestamp,
    getDoc, // <-- Import getDoc
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Import Firebase Configuration
import { firebaseConfig } from './firebase-config.js'; // Ensure this file exists and is correct

// --- Initialize Firebase ---
let app;
let auth;
let db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    const initialErrorDiv = document.getElementById('login-error') || document.createElement('div'); // Target login error div
    initialErrorDiv.textContent = "Error connecting to services. Please refresh.";
    initialErrorDiv.style.color = 'red';
    initialErrorDiv.style.textAlign = 'center';
    initialErrorDiv.style.padding = '1rem';
    if (!document.getElementById('login-error')) {
        const container = document.querySelector('.app-container'); // Use querySelector for class
        if (container) container.prepend(initialErrorDiv);
    }
    throw new Error("Firebase initialization failed");
}

// --- DOM Elements ---
// Screens
const loginScreen = document.getElementById('login-screen');
const charSelectScreen = document.getElementById('char-select-screen');
const charCreateScreen = document.getElementById('char-create-screen');
const townScreen = document.getElementById('town-screen');
const gameScreen = document.getElementById('game-screen'); // Game Screen

// Login Elements
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const loginFeedback = document.getElementById('login-feedback');
const loginError = document.getElementById('login-error');
const resetPasswordButton = document.getElementById('reset-password-button');
const googleSignInButton = document.getElementById('google-signin-button');

// Character Select Elements
const characterListDiv = document.getElementById('character-list');
const charSelectError = document.getElementById('char-select-error');
const launchCharButton = document.getElementById('launch-char-button');
const deleteCharButton = document.getElementById('delete-char-button');
const createNewCharButton = document.getElementById('create-new-char-button');
const logoutButton = document.getElementById('logout-button'); // Logout from Char Select
const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');

// Character Create Elements
const charNameInput = document.getElementById('char-name');
const classSelectionGrid = document.getElementById('class-selection'); // Use grid ID
const selectedClassInput = document.getElementById('selected-class');
const createButton = document.getElementById('create-button');
const backToSelectButton = document.getElementById('back-to-select-button');
const charCreateError = document.getElementById('char-create-error');

// Town Screen Elements
const townHeaderInfo = document.getElementById('town-header-info');
const townCharName = document.getElementById('town-char-name');
const townCharLevel = document.getElementById('town-char-level');
const townCharClass = document.getElementById('town-char-class');
const townCurrency = document.getElementById('town-currency');
const townNav = document.getElementById('town-nav');
const townLogoutButton = document.getElementById('town-logout-button'); // Logout from Town
const townSwitchCharButton = document.getElementById('town-switch-char-button'); // Switch Char from Town
const townMainContent = document.querySelector('.town-main-content'); // Use querySelector for class
const overviewPanel = document.getElementById('overview-panel'); // Overview panel ref
const overviewCharName = document.getElementById('overview-char-name'); // Element inside overview
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryGrid = document.getElementById('inventory-grid');
const mapPanel = document.getElementById('map-panel'); // <-- Map Panel Ref
const enterZoneButton = document.getElementById('enter-zone-button'); // <-- Enter Zone Button Ref
const skillsPanel = document.getElementById('skills-panel'); // <-- Add if not already present
const learnedSkillsList = document.getElementById('learned-skills-list'); // <-- NEW
const skillAssignmentBar = document.getElementById('skill-assignment-bar'); // <-- NEW
// ... (Game Screen Elements) ...
// Add refs for missions, station panels etc. as needed

// Game Screen Elements
const gameCanvas = document.getElementById('game-canvas');
const exitGameButton = document.getElementById('exit-game-button');
const itemTooltip = document.getElementById('item-tooltip');
const minimapContainer = document.getElementById('minimap-container'); // <-- NEW
const minimapViewport = document.getElementById('minimap-viewport');   // <-- NEW

// --- Add near the top ---
const ITEM_DEFINITIONS = {
    'starter_mace': {
        id: 'starter_mace',
        name: 'Scrap Metal Cudgel',
        type: 'OneHandMace', // Or OneHandAxe, etc.
        slot: ['weapon1', 'weapon2'], // Can be equipped in either hand
        baseStats: {
            'physicalDamageMin': 5,
            'physicalDamageMax': 8,
            'attackSpeed': 1.2, // Attacks per second
            'critChance': 5.0 // Percent
        },
        // Future properties: rarity: 'normal', affixes: [], levelReq: 1
    }
    // Add other items later
};

const ATTACK_DEFINITIONS = {
    'juggernaut_cleave': {
        id: 'juggernaut_cleave',
        displayName: 'Cleave',
        type: 'arc', // Type for logic branching
        damage: 10, // Example data
        radiusMultiplier: 2, // Multiplier of player height
        sweepAngle: Math.PI / 2, // 90 degrees
        duration: 100, // ms
        cooldown: 100, // ms
        animationName: 'attack', // Player animation state to trigger
        color: 'rgba(255, 255, 255, 0.3)' // Visual effect color
    },
    // Add other attacks here later:
    // 'rifle_shot': { type: 'projectile', ... },
    // 'psion_blast': { type: 'aoe', ... }
};

// --- State Variables ---
let selectedCharacterId = null;
let selectedCharacterName = null;
let selectedCharacterElement = null; // Keep track of the selected DOM element in char select
let currentCharacterData = null; // <-- Store loaded character data for town/game
let selectedZoneId = null; // <-- Store the ID of the selected map node
let selectedSkillForAssignment = null; // <-- NEW: ID of skill picked from list
let selectedSlotElementForAssignment = null;
const assets = {
    images: {}, // To store loaded Image objects { 'playerName': imgObject, ... }
    sounds: {}, // Placeholder for sounds later
    totalToLoad: 0,
    loadedCount: 0,
    allLoaded: false
};

// Game State Variables
let canvasCtx = null;
let player = {
    x: 50, y: 50, width: 20, height: 30,
    speed: 4,
    assetName: 'player_default',
    color: '#cccccc',
    frameWidth: 32, frameHeight: 48,
    animations: {
        'idle': { row: 0, frames: 2, speed: 300 },
        'walk': { row: 0, frames: 2, speed: 150 },
        'attack': { row: 0, frames: 2, speed: 100 } // <-- ADDED Attack state (uses frames 2 & 3)
    },
    currentState: 'idle',
    currentFrame: 0,
    frameTimer: 0,
    lastFrameTime: 0,
    facingRight: true
};
let keysPressed = {};
let environmentObjects = [];
let activeMobs = [];
let gameLoopId = null;
let camera = { x: 0, y: 0 }; // <-- NEW Camera position (top-left corner of viewport)
const world = { width: 3000, height: 2000 }; // <-- NEW World dimensions

// Skill Bar State <-- NEW
const skillBar = {
    slots: [
        { id: 'skill-1', key: '1', activeUntil: 0 },
        { id: 'skill-2', key: '2', activeUntil: 0 },
        { id: 'skill-3', key: '3', activeUntil: 0 },
        { id: 'skill-4', key: '4', activeUntil: 0 },
        { id: 'skill-LMB', key: 'LMB', activeUntil: 0 },
        { id: 'skill-RMB', key: 'RMB', activeUntil: 0 },
    ],
    slotSize: 60,
    gap: 10,
    padding: 8,
    highlightDuration: 150
};
let activeAttacks = []; // <-- NEW: Array for active attack instances
let mousePos = { x: 0, y: 0 };

// Minimap State <-- NEW
const minimap = { width: 150, height: 100 }; // Match CSS dimensions
let minimapScaleX = 1;
let minimapScaleY = 1;

// --- Helper Functions ---

// Clears messages on the main login screen
function clearLoginMessages() {
    if (loginFeedback) loginFeedback.textContent = '';
    if (loginError) loginError.textContent = '';
}

function updateMinimapScale() {
    minimapScaleX = minimap.width / world.width;
    minimapScaleY = minimap.height / world.height;
    console.log("Minimap scale updated:", minimapScaleX, minimapScaleY);
}

// Clears all error/feedback messages across screens
function clearErrors() {
    clearLoginMessages(); // Clear login screen messages
    if (charSelectError) charSelectError.textContent = '';
    if (charCreateError) charCreateError.textContent = '';
    // Add clearing for town/game screen errors if needed later
}

// Displays error/feedback messages
function displayError(element, message) {
    if (element) element.textContent = message;
    console.warn("Msg:", message); // Use warn for feedback/errors for visibility
}

// Shows the correct main screen (Login, Char Select, Char Create, Town, Game)
// --- Helper Functions ---

// Shows the correct main screen (Login, Char Select, Char Create, Town, Game)
// Shows the correct main screen (Login, Char Select, Char Create, Town, Game)
// Shows the correct main screen (Login, Char Select, Char Create, Town, Game)
// Replace the existing showScreen function
function showScreen(screenId) {
    // Hide all main screens first
    [loginScreen, charSelectScreen, charCreateScreen, townScreen, gameScreen].forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });

    // Add/Remove body class for overflow control
    if (screenId === 'game') {
        document.body.classList.add('game-active');
    } else {
        document.body.classList.remove('game-active');
    }

    // Show the requested screen
    let screenToShow = null;
    if (screenId === 'login') screenToShow = loginScreen;
    else if (screenId === 'char-select') screenToShow = charSelectScreen;
    else if (screenId === 'char-create') screenToShow = charCreateScreen;
    else if (screenId === 'town') screenToShow = townScreen;
    else if (screenId === 'game') screenToShow = gameScreen;

    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    } else { /* ... error handling ... */ }

    // Reset states if needed
    if (screenId !== 'char-select') { resetSelectionState(); }
    if (screenId !== 'town' && screenId !== 'game') { currentCharacterData = null; }

    // Stop game loop and remove ALL game listeners if navigating away from game
    if (screenId !== 'game' && gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('resize', resizeCanvas);
        if(gameCanvas) {
            gameCanvas.removeEventListener('click', handleMouseClick);
            gameCanvas.removeEventListener('contextmenu', handleMouseClick);
            gameCanvas.removeEventListener('mousemove', handleMouseMove); // <-- Remove mousemove listener
        }
        console.log("Game loop stopped and listeners removed.");
    }
}

// Updates the enabled/disabled state of character action buttons (on char select screen)
function updateActionButtonsState() {
    const isCharSelected = selectedCharacterId !== null;
    if (launchCharButton) launchCharButton.disabled = !isCharSelected;
    if (deleteCharButton) deleteCharButton.disabled = !isCharSelected;
}

// Resets character selection state and UI (on char select screen)
// Resets character selection state and UI (on char select screen)
function resetSelectionState() {
    selectedCharacterId = null;
    selectedCharacterName = null;
    if (selectedCharacterElement) {
        selectedCharacterElement.classList.remove('selected-char');
        selectedCharacterElement = null;
    }
    if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden');
    if (enterZoneButton) enterZoneButton.disabled = true; // Disable enter zone button
    selectedZoneId = null; // Reset selected zone ID here IS correct
    // Clear visual selection from map nodes if mapPanel exists
    mapPanel?.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected'));
    updateActionButtonsState(); // Disable character action buttons
}

// --- Authentication Logic ---

// Set persistence
if (auth) {
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log("Persistence set to local.");
            setupAuthStateListener();
        })
        .catch((error) => {
            console.error("Error setting persistence:", error);
            setupAuthStateListener(); // Attempt listener setup anyway
            displayError(loginError, "Could not enable auto-login.");
        });
} else {
    console.error("Firebase Auth not initialized. Cannot set persistence or listener.");
    displayError(loginError, "Initialization error.");
}

// Auth State Change Listener (Handles login/logout UI changes)
function setupAuthStateListener() {
    if (!auth) { console.error("Auth not initialized for listener."); return; }
    onAuthStateChanged(auth, (user) => {
        clearErrors();
        resetSelectionState(); // Reset character selection on auth change
        if (user) {
            // User is signed in -> Go to Character Selection
            console.log("User logged in:", user.uid);
            showScreen('char-select'); // <-- Go to char select first
            loadCharacters(user.uid);
        } else {
            // User is signed out -> Go to Login Screen
            console.log("User logged out.");
            showScreen('login');
            currentCharacterData = null; // Clear character data on logout
            if (loginPasswordInput) loginPasswordInput.value = ''; // Clear password field
        }
    });
}

// --- Add this new function ---

// Asset Loading Function (Placeholder for now)
function loadAssets(callback) {
    console.log("Initiating asset loading...");
    assets.allLoaded = false;
    assets.loadedCount = 0;
    assets.images = {}; // Clear previous images

    // Define assets to load (replace with actual paths later)
    const assetsToLoad = {
        // Example: 'player_juggernaut': 'path/to/juggernaut.png',
        // Example: 'player_sharpshooter': 'path/to/sharpshooter.png',
        // For now, we don't have actual images, so this list is empty
    };

    const assetKeys = Object.keys(assetsToLoad);
    assets.totalToLoad = assetKeys.length;

    if (assets.totalToLoad === 0) {
        console.log("No assets defined to load.");
        assets.allLoaded = true;
        if (callback) callback(); // Immediately call back if nothing to load
        return;
    }

    assetKeys.forEach(key => {
        const img = new Image();
        img.onload = () => {
            assets.loadedCount++;
            console.log(`Asset loaded: <span class="math-inline">\{key\} \(</span>{assets.loadedCount}/${assets.totalToLoad})`);
            assets.images[key] = img; // Store the loaded Image object
            if (assets.loadedCount === assets.totalToLoad) {
                console.log("All assets loaded successfully!");
                assets.allLoaded = true;
                if (callback) callback(); // Call the callback function when all assets are loaded
            }
        };
        img.onerror = () => {
            console.error(`Failed to load asset: ${key} at ${assetsToLoad[key]}`);
            assets.loadedCount++; // Count errors too to prevent getting stuck
             if (assets.loadedCount === assets.totalToLoad) {
                console.warn("Asset loading finished with errors.");
                assets.allLoaded = true; // Mark as loaded even with errors for now
                if (callback) callback();
            }
        };
        img.src = assetsToLoad[key];
    });
}

// --- Event Listeners (Login/Register/Google/Reset) ---

// Login Button
if (loginButton) {
    loginButton.addEventListener('click', () => {
        clearLoginMessages();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) { displayError(loginError, "Please enter email and password."); return; }
        loginButton.disabled = true; displayError(loginFeedback, "Logging in...");
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => { console.log("Login successful."); }) // onAuthStateChanged handles UI
            .catch((error) => { console.error("Login error:", error.code, error.message); let msg="Login failed."; if(error.code==='auth/user-not-found'||error.code==='auth/wrong-password'||error.code==='auth/invalid-credential'){msg="Invalid email or password.";}else if(error.code==='auth/invalid-email'){msg="Invalid email format.";} displayError(loginError, msg); })
            .finally(() => { if(loginButton) loginButton.disabled = false; displayError(loginFeedback, ""); });
    });
}

// Register Button
if (registerButton) {
    registerButton.addEventListener('click', () => {
        clearLoginMessages();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) { displayError(loginError, "Please enter email and password to register."); return; }
        if (password.length < 6) { displayError(loginError, "Password must be at least 6 characters."); return; }
        registerButton.disabled = true; displayError(loginFeedback, "Registering...");
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => { console.log("Registration successful."); }) // onAuthStateChanged handles UI
            .catch((error) => { console.error("Registration error:", error.code, error.message); let msg=`Registration failed.`; if(error.code==='auth/email-already-in-use'){msg="Email already registered.";}else if(error.code==='auth/invalid-email'){msg="Invalid email format.";}else if(error.code==='auth/weak-password'){msg="Password is too weak.";}else{msg=`Error: ${error.message}`;} displayError(loginError, msg); })
            .finally(() => { if(registerButton) registerButton.disabled = false; displayError(loginFeedback, ""); });
    });
}

// Reset Password Button
if (resetPasswordButton) {
    resetPasswordButton.addEventListener('click', () => {
        clearLoginMessages();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        if (!email) { displayError(loginError, "Please enter email address to reset password."); return; }
        resetPasswordButton.disabled = true; displayError(loginFeedback, "Sending reset email...");
        sendPasswordResetEmail(auth, email)
            .then(() => { displayError(loginFeedback, `Password reset email sent to ${email}.`); })
            .catch((error) => { let msg=`Failed: ${error.message}`; if(error.code==='auth/user-not-found'){msg="No account found.";} displayError(loginError, msg); displayError(loginFeedback, ""); })
            .finally(() => { if (resetPasswordButton) resetPasswordButton.disabled = false; });
    });
}

// Google Sign-In Button
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', () => {
        clearLoginMessages(); const provider = new GoogleAuthProvider();
        googleSignInButton.disabled = true; displayError(loginFeedback, "Opening Google Sign-In...");
        signInWithPopup(auth, provider)
            .then((result) => { console.log("Google Sign-In successful:", result.user.uid); displayError(loginFeedback, ""); }) // onAuthStateChanged handles UI
            .catch((error) => { console.error("Google Sign-In error:", error.code, error.message); let msg="Google Sign-In failed."; if(error.code==='auth/popup-closed-by-user'){msg="Sign-in cancelled.";}else if(error.code==='auth/popup-blocked'){msg="Popup blocked.";}else if(error.code==='auth/account-exists-with-different-credential'){msg="Account exists with different method.";} displayError(loginError, msg); displayError(loginFeedback, ""); })
            .finally(() => { if (googleSignInButton) googleSignInButton.disabled = false; });
    });
}

// Logout Button (Character Select Screen)
if (logoutButton) {
     logoutButton.addEventListener('click', () => {
        signOut(auth).catch((error) => {
            console.error("Logout error:", error);
            displayError(charSelectError, "Error logging out.");
        });
    });
}

// --- Character Selection Logic ---
if (characterListDiv) {
    characterListDiv.addEventListener('click', (event) => {
        const clickedItem = event.target.closest('.character-list-item');
        if (!clickedItem) return;
        const charId = clickedItem.dataset.charId;
        const charName = clickedItem.dataset.charName;
        if (selectedCharacterElement === clickedItem) return; // Already selected
        resetSelectionState(); // Clear previous selection
        selectedCharacterId = charId;
        selectedCharacterName = charName;
        selectedCharacterElement = clickedItem;
        selectedCharacterElement.classList.add('selected-char'); // Highlight
        console.log(`Selected Character: ID=${selectedCharacterId}, Name=${selectedCharacterName}`);
        updateActionButtonsState(); // Enable actions
    });
}

// Character Action Buttons (Launch / Delete)
if (launchCharButton) {
    launchCharButton.addEventListener('click', () => {
        if (selectedCharacterId) {
            launchGame(selectedCharacterId); // Call updated launch function
        }
    });
}
if (deleteCharButton) {
    deleteCharButton.addEventListener('click', () => {
        if (selectedCharacterId && selectedCharacterName) {
            if (deleteConfirmMessage) deleteConfirmMessage.textContent = `Permanently delete ${selectedCharacterName}?`;
            if (deleteConfirmDialog) deleteConfirmDialog.classList.remove('hidden'); // Show confirmation
        }
    });
}

// Inline Delete Confirmation Buttons
if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener('click', () => {
        if (selectedCharacterId) { deleteCharacter(selectedCharacterId); } // Execute delete
    });
}
if (cancelDeleteButton) {
    cancelDeleteButton.addEventListener('click', () => {
        if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden'); // Hide confirmation
    });
}

// --- Character Creation Logic ---
if (createNewCharButton) { // Navigate to create screen
    createNewCharButton.addEventListener('click', () => {
        clearErrors(); resetSelectionState(); showScreen('char-create');
        if (charNameInput) charNameInput.value = '';
        if (selectedClassInput) selectedClassInput.value = '';
        classSelectionGrid?.querySelectorAll('.class-card.selected').forEach(c => c.classList.remove('selected')); // Use correct selector
    });
}
if (backToSelectButton) { // Navigate back from create screen
    backToSelectButton.addEventListener('click', () => {
        clearErrors(); showScreen('char-select');
    });
}
// UPDATED Class Selection Logic
if (classSelectionGrid) { // Use the grid container ID
    classSelectionGrid.addEventListener('click', (event) => {
        // Check if a 'Select' button *within* a class card was clicked
        const selectButton = event.target.closest('.class-select-button');
        if (selectButton) {
            const clickedCard = selectButton.closest('.class-card');
            if (!clickedCard) return;
            const className = clickedCard.dataset.class;
            classSelectionGrid.querySelectorAll('.class-card.selected').forEach(card => card.classList.remove('selected'));
            clickedCard.classList.add('selected');
            if (selectedClassInput) { selectedClassInput.value = className; console.log("Selected class:", className); }
        }
    });
}

// Replace the existing createButton listener block
if (createButton) { // Handle actual character creation
    createButton.addEventListener('click', async () => {
        clearErrors();
        const charName = charNameInput ? charNameInput.value.trim() : '';
        const selectedClass = selectedClassInput ? selectedClassInput.value : ''; // Get from hidden input
        const user = auth.currentUser;
        if (!user) { displayError(charCreateError, "Error: Not logged in."); showScreen('login'); return; }
        if (!charName) { displayError(charCreateError, "Please enter a character name."); return; }
        if (charName.length > 20) { displayError(charCreateError, "Name too long (max 20)."); return; }
        if (!selectedClass) { displayError(charCreateError, "Please select a class."); return; } // Check hidden input

        createButton.disabled = true; displayError(charCreateError, "Creating character...");

        // --- Prepare initial character data ---
        const initialCharacterData = {
             userId: user.uid,
             name: charName,
             class: selectedClass,
             level: 1,
             experience: 0,
             currency: 0,
             location: "Starhaven",
             createdAt: Timestamp.fromDate(new Date()),
             inventory: [], // Start with empty inventory array
             equipped: {}   // Start with empty equipped object
             // Add base stats later based on class if needed
        };

        // --- Add starting weapon based on class ---
        if (selectedClass === 'Juggernaut') {
            // Assign the starter mace to the first weapon slot
            initialCharacterData.equipped['weapon1'] = { ...ITEM_DEFINITIONS['starter_mace'] }; // Add a copy of the item data
            console.log("Added Starter Cudgel to Juggernaut.");
        }
        // Add starting gear for other classes here later

        try {
            const charactersCol = collection(db, 'characters');
            // Save the complete initial data
            await addDoc(charactersCol, initialCharacterData);
            console.log("Character created with initial data:", initialCharacterData);
            showScreen('char-select'); // Go back to selection
            loadCharacters(user.uid); // Refresh list
        } catch (error) {
            console.error("Error creating character:", error); displayError(charCreateError, `Failed: ${error.message}`);
        } finally {
             if (createButton) createButton.disabled = false;
             if (charCreateError && charCreateError.textContent === "Creating character...") { clearErrors(); }
        }
    });
}

// --- Load Characters Function ---
async function loadCharacters(userId) {
    const listDiv = document.getElementById('character-list'); // Still need this ref for now
    if (!userId || !db || !listDiv) { // Check listDiv existence
        console.error("loadChars Preconditions failed.");
        if(listDiv) listDiv.innerHTML='<p class="no-characters-message" style="color: red;">Error loading.</p>';
        return;
    }
    console.log("loadChars Start:", userId);
    listDiv.innerHTML = '<p class="no-characters-message">Loading...</p>'; // Update list div as well
    resetSelectionState();
    try {
        const q = query(collection(db, 'characters'), where("userId", "==", userId));
        console.log("loadChars Querying..."); const querySnapshot = await getDocs(q); console.log("loadChars Query done:", querySnapshot.size);
        if (querySnapshot.empty) {
             console.log("loadChars None found.");
             listDiv.innerHTML = '<p class="no-characters-message">No characters found.</p>'; // Update list div
             return;
        }
        let html = ''; console.log("loadChars Processing...");
        querySnapshot.forEach((doc) => { const char = doc.data(); console.log(`loadChars Doc: ${doc.id}`, char); html += `<div class="character-list-item" data-char-id="${doc.id}" data-char-name="${char.name||'Unnamed'}"><span>${char.name||'Unnamed'} - Lvl ${char.level||1} ${char.class||'Unknown'}</span></div>`; });
        console.log("loadChars Setting HTML.");
        listDiv.innerHTML = html; // Update list div
    } catch (error) {
        console.error("loadChars Error:", error);
        displayError(charSelectError, "Load failed.");
        listDiv.innerHTML = '<p class="no-characters-message" style="color: red;">Error loading.</p>'; // Update list div
    } finally {
        console.log("loadChars Finished.");
    }
}

// --- Delete Character Function ---
async function deleteCharacter(characterId) {
    if (!characterId || !db) { return; }
    console.log("Deleting:", characterId);
    displayError(charSelectError, "Deleting character...");
    if(confirmDeleteButton) confirmDeleteButton.disabled = true;
    if(cancelDeleteButton) cancelDeleteButton.disabled = true;
    try {
        await deleteDoc(doc(db, "characters", characterId));
        console.log("Character deleted.");
        displayError(charSelectError, "Character deleted.");
        resetSelectionState(); // Clear selection, hide dialog
        const user = auth.currentUser;
        if (user) { loadCharacters(user.uid); } // Refresh list
        else { console.error("No user."); showScreen('login'); }
        setTimeout(clearErrors, 3000); // Clear message after delay
    } catch (error) {
        console.error("Delete Error:", error);
        displayError(charSelectError, `Delete failed: ${error.message}`);
        if(confirmDeleteButton) confirmDeleteButton.disabled = false; // Re-enable on error
        if(cancelDeleteButton) cancelDeleteButton.disabled = false;
    }
}

// --- Launch Game Function (Loads data and shows Game Screen) ---
// --- Launch Game Function (Loads data and shows Town with Overview active) ---
// Replace the existing launchGame function
async function launchGame(characterId) {
    console.log("Attempting to launch game with character ID:", characterId);
    displayError(charSelectError, "Loading character data...");

    try {
        const charDocRef = doc(db, "characters", characterId);
        const charDocSnap = await getDoc(charDocRef);

        if (charDocSnap.exists()) {
            currentCharacterData = { id: charDocSnap.id, ...charDocSnap.data() };
            console.log("Character data loaded:", currentCharacterData);

            // --- Load Skill Assignments ---
            if (currentCharacterData.skillAssignments) {
                console.log("Loading saved skill assignments:", currentCharacterData.skillAssignments);
                skillBar.slots.forEach((slot, index) => {
                    slot.skillId = currentCharacterData.skillAssignments[index] || null; // Load saved ID or null
                    slot.cooldownUntil = 0; // Reset cooldowns
                });
            } else {
                // If no assignments saved, set defaults based on class
                console.log("No saved assignments found, setting defaults.");
                setPlayerAppearance(); // This now also sets default skills
            }
            // --- End Load Skill Assignments ---


            // Populate Town Header
            if (townCharName) townCharName.textContent = currentCharacterData.name || 'N/A';
            if (townCharLevel) townCharLevel.textContent = currentCharacterData.level || '1';
            if (townCharClass) townCharClass.textContent = currentCharacterData.class || 'N/A';
            if (townCurrency) townCurrency.textContent = currentCharacterData.currency || '0';

            // Activate the DEFAULT panel (Overview) and populate it
            activateTownPanel('overview-panel');

            // Switch to the Town Screen
            showScreen('town');
            clearErrors();

        } else { /* ... error handling ... */ }
    } catch (error) { /* ... error handling ... */ }
}

// --- Town Screen Logic ---
function activateTownPanel(panelId) {
     // Deactivate current button and panel
     townNav.querySelector('.town-nav-button.active')?.classList.remove('active');
     if (townMainContent) {
         townMainContent.querySelector('.town-panel.active')?.classList.add('hidden');
         townMainContent.querySelector('.town-panel.active')?.classList.remove('active');
     } else { console.error("activateTownPanel: townMainContent not found!"); return; }

     // Activate new button and panel
     const newButton = townNav.querySelector(`.town-nav-button[data-panel="${panelId}"]`);
     const newPanel = document.getElementById(panelId);

     if (newButton) newButton.classList.add('active');
     if (newPanel) {
         newPanel.classList.remove('hidden');
         newPanel.classList.add('active');
         // Call display function for the specific panel
         switch (panelId) {
            case 'overview-panel': displayOverviewPanel(); break;
            case 'inventory-panel': displayInventoryPanel(); break;
            case 'missions-panel': displayMissionsPanel(); break;
            case 'station-panel': displayStationPanel(); break;
            case 'stats-panel': displayStatsPanel(); break;
            case 'skills-panel': displaySkillsPanel(); break;
            case 'map-panel': displayMapPanel(); break; // <-- Ensure this is called
            case 'vendor-panel': displayVendorPanel(); break;
            case 'crafting-panel': displayCraftingPanel(); break;
         }
     } else { console.error("Target panel not found:", panelId); }
}
function displayOverviewPanel() { console.log("Display Overview"); if (!currentCharacterData) return; if (overviewCharName) overviewCharName.textContent = currentCharacterData.name || 'Traveler'; /* TODO */ }
// Replace the existing displayInventoryPanel function
// Replace the existing displayInventoryPanel function
function displayInventoryPanel() {
    console.log("Displaying Inventory Panel for:", currentCharacterData?.name);
    if (!currentCharacterData) { console.error("Cannot display inventory: No data."); return; }

    // Populate Equipment Slots
    const equipmentSlots = document.querySelectorAll('.equipment-slots .equip-slot');
    equipmentSlots.forEach(slotElement => {
        const slotName = slotElement.dataset.slot; // e.g., "head", "weapon1"
        const equippedItem = currentCharacterData.equipped ? currentCharacterData.equipped[slotName] : null; // Get item from data

        // --- Clear previous listeners ---
        slotElement.removeEventListener('mouseover', handleSlotMouseOver);
        slotElement.removeEventListener('mouseout', handleSlotMouseOut);
        slotElement.removeEventListener('mousemove', handleSlotMouseMove);


        if (equippedItem && equippedItem.name) { // Check if item exists and has a name
            slotElement.textContent = equippedItem.name; // Display item name
            // TODO: Add item icon later
            slotElement.style.color = '#e5e7eb';
            slotElement.style.borderStyle = 'solid';
            slotElement.style.borderColor = '#6b7280';
            // Remove title attribute - we use custom tooltip now
            slotElement.removeAttribute('title');
            // Add event listeners for custom tooltip
            slotElement.addEventListener('mouseover', handleSlotMouseOver);
            slotElement.addEventListener('mouseout', handleSlotMouseOut);
            slotElement.addEventListener('mousemove', handleSlotMouseMove); // For positioning

        } else {
            // Show empty slot placeholder
            slotElement.textContent = slotName.charAt(0).toUpperCase() + slotName.slice(1);
            slotElement.style.color = '#6b7280';
            slotElement.style.borderStyle = 'dashed';
            slotElement.style.borderColor = '#4b5563';
            slotElement.removeAttribute('title');
            // No listeners needed for empty slots
        }
    });

    // Populate Inventory Grid (Placeholder remains)
    if (inventoryGrid) {
        inventoryGrid.innerHTML = ''; // Clear previous slots
        const inventorySize = currentCharacterData.inventorySize || 60;
        const inventoryItems = currentCharacterData.inventory || [];

        for (let i = 0; i < inventorySize; i++) {
            const itemInSlot = null; // Placeholder
            const slotEl = document.createElement('div');
            slotEl.classList.add('inv-slot');
            slotEl.dataset.slotIndex = i;
            if (itemInSlot) { /* Render item */ }
            inventoryGrid.appendChild(slotEl);
            // TODO: Add tooltip listeners to inventory slots too
        }
    }
}

// --- Add these new functions ---

// Replace the existing formatItemTooltip function
function formatItemTooltip(itemData) {
    if (!itemData) return '';

    // --- Helper for formatting stat names ---
    function formatStatName(statKey) {
        // Specific overrides for known stats
        const nameMap = {
            'physicalDamageMin': 'Min Physical Damage',
            'physicalDamageMax': 'Max Physical Damage',
            'attackSpeed': 'Attack Speed',
            'critChance': 'Critical Strike Chance'
            // Add more known stat keys here as needed
        };
        if (nameMap[statKey]) {
            return nameMap[statKey];
        }
        // Fallback for unknown stats: Split camelCase and capitalize
        return statKey
            .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
            .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    }
    // --- End helper ---

    let html = `<div class="item-name">${itemData.name || 'Unknown Item'}</div>`;
    if (itemData.type) {
        html += `<span class="item-type">${itemData.type}</span>`;
    }

    // Base Stats
    if (itemData.baseStats) {
        Object.entries(itemData.baseStats).forEach(([statKey, value]) => {
            const formattedName = formatStatName(statKey); // Use the helper function
            // Add '%' for crit chance
            const formattedValue = (statKey === 'critChance') ? `${value.toFixed(1)}%` : value;
            html += `<span class="item-stat">${formattedName}: <span class="value">${formattedValue}</span></span>`;
        });
    }

    // TODO: Add Affixes, Requirements etc. later

    return html;
}

function showTooltip(event, slotElement) {
    if (!itemTooltip || !currentCharacterData) return;

    const slotName = slotElement.dataset.slot;
    const itemData = currentCharacterData.equipped ? currentCharacterData.equipped[slotName] : null;

    if (itemData) {
        itemTooltip.innerHTML = formatItemTooltip(itemData);
        positionTooltip(event); // Position based on initial mouse event
        itemTooltip.classList.add('visible');
        itemTooltip.classList.remove('hidden');
    }
}

function hideTooltip() {
    if (!itemTooltip) return;
    itemTooltip.classList.remove('visible');
    itemTooltip.classList.add('hidden'); // Ensure it's hidden if transition fails
}

function positionTooltip(event) {
    if (!itemTooltip) return;

    const tooltipRect = itemTooltip.getBoundingClientRect();
    const offsetX = 15; // Offset from cursor
    const offsetY = 15;

    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;

    // Prevent tooltip going off-screen right
    if (left + tooltipRect.width > window.innerWidth) {
        left = event.clientX - tooltipRect.width - offsetX;
    }
    // Prevent tooltip going off-screen bottom
    if (top + tooltipRect.height > window.innerHeight) {
        top = event.clientY - tooltipRect.height - offsetY;
    }
    // Prevent tooltip going off-screen left/top (less common)
    if (left < 0) left = offsetX;
    if (top < 0) top = offsetY;


    itemTooltip.style.left = `${left}px`;
    itemTooltip.style.top = `${top}px`;
}

// Event Handlers to attach to slots
function handleSlotMouseOver(event) {
    showTooltip(event, this); // 'this' refers to the slotElement
}

function handleSlotMouseOut(event) {
    hideTooltip();
}

function handleSlotMouseMove(event) {
    // Reposition tooltip as mouse moves over the slot
    if (itemTooltip && itemTooltip.classList.contains('visible')) {
        positionTooltip(event);
    }
}

function displayMissionsPanel() { console.log("Display Missions"); /* TODO */ }
function displayStationPanel() { console.log("Display Station"); /* TODO */ }
function displayStatsPanel() { console.log("Display Stats"); /* TODO */ }
// Replace the existing displaySkillsPanel function
// Replace the existing displaySkillsPanel function
function displaySkillsPanel() {
    console.log("Displaying Skills Panel");
    // Ensure elements exist before proceeding
    const listContainer = document.getElementById('learned-skills-list');
    const assignmentBar = document.getElementById('skill-assignment-bar');
    if (!currentCharacterData || !listContainer || !assignmentBar) {
        console.error("displaySkillsPanel: Missing character data or required elements.");
        if (listContainer) listContainer.innerHTML = '<p class="no-characters-message" style="color: red;">Error loading skill data.</p>';
        return;
    }

    // --- Render Learned Skills ---
    listContainer.innerHTML = ''; // Clear previous content
    let skillsHTML = '';
    // For now, just manually add Cleave if Juggernaut
    // TODO: Replace this with iterating through currentCharacterData.learnedSkills
    const learnedSkillIds = [];
    if (currentCharacterData.class === 'Juggernaut') {
        learnedSkillIds.push('juggernaut_cleave'); // Add known skills
        // Add any other default or learned skills for Juggernaut here
    }
    // Add checks for other classes and their skills later

    if (learnedSkillIds.length === 0) {
        skillsHTML = '<p class="no-characters-message">No skills learned yet.</p>'; // Use consistent class
    } else {
        learnedSkillIds.forEach(skillId => {
            const skillData = ATTACK_DEFINITIONS[skillId];
            if (skillData) {
                // Add data-skill-id to the item
                skillsHTML += `
                    <div class="skill-item" data-skill-id="${skillId}">
                        <div class="skill-name">${skillData.displayName || skillId.replace(/_/g, ' ')}</div>
                        <div class="skill-desc">
                            Type: ${skillData.type} | Cooldown: ${skillData.cooldown}ms
                            </div>
                    </div>
                `;
            } else {
                    console.warn(`Skill data not found in ATTACK_DEFINITIONS for ID: ${skillId}`);
            }
        });
    }
    listContainer.innerHTML = skillsHTML;

    // --- Render Skill Assignment Bar ---
    const assignmentSlots = assignmentBar.querySelectorAll('.assign-skill-slot');
    assignmentSlots.forEach((slotDiv, index) => {
        if (index < skillBar.slots.length) { // Ensure index is valid
            const assignedSkillId = skillBar.slots[index]?.skillId; // Get skill from current state
            const skillData = assignedSkillId ? ATTACK_DEFINITIONS[assignedSkillId] : null;
            const keybindSpanHTML = slotDiv.querySelector('span')?.outerHTML || `<span>${skillBar.slots[index]?.key || '?'}</span>`; // Preserve or recreate keybind span

            // Add skill name/icon placeholder inside the slot div
            let contentHTML = '';
            if (skillData) {
                contentHTML = `<div class="assigned-skill-name">${skillData.displayName || assignedSkillId}</div>`;
                // TODO: Add skill icon here later: <img src="..." class="assigned-skill-icon">
            } else {
                    contentHTML = `<div class="assigned-skill-name empty">[Empty]</div>`;
            }
            // Reconstruct innerHTML ensuring keybind span is last
            slotDiv.innerHTML = contentHTML + keybindSpanHTML;
        } else {
            console.warn(`Mismatch between assignment slots in HTML (${assignmentSlots.length}) and skillBar state (${skillBar.slots.length})`);
        }
    });


    // --- Add Event Listeners ---
    addSkillPanelListeners(); // Attach listeners after rendering

    // --- Clear any lingering selection state from previous interactions ---
    selectedSkillForAssignment = null;
    selectedSlotElementForAssignment = null;
    listContainer.querySelectorAll('.skill-item.selected-for-assignment')
        .forEach(item => item.classList.remove('selected-for-assignment'));
    assignmentBar.querySelectorAll('.assign-skill-slot.selected-for-assignment')
        .forEach(slot => slot.classList.remove('selected-for-assignment'));


    // Placeholder for passive tree rendering
    // renderPassiveTree();
}
// Replace the existing displayMapPanel function
function displayMapPanel() {
    console.log("Displaying Map Panel");
    // Don't reset selectedZoneId here - allow selection to persist within the town screen

    // Clear visual selection from nodes if needed (optional, could leave it highlighted)
    // mapPanel?.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected'));

    // Disable/Enable Enter button based on whether a zone IS currently selected
    if (enterZoneButton) {
        enterZoneButton.disabled = !selectedZoneId; // Disable if null, enable if not null
    }
    // TODO: Add logic to display available zones, maybe based on character progress
    // TODO: If selectedZoneId is not null, re-apply the '.selected' class to the correct node visually
    if (selectedZoneId && mapPanel) {
         const selectedNode = mapPanel.querySelector(`.map-node[data-zone-id="${selectedZoneId}"]`);
         if (selectedNode) {
             selectedNode.classList.add('selected');
         }
    }
}
function displayVendorPanel() { console.log("Display Vendor"); /* TODO */ }
function displayCraftingPanel() { console.log("Display Crafting"); /* TODO */ }
if (townNav) { townNav.addEventListener('click', (event) => { if (event.target.classList.contains('town-nav-button') && !event.target.classList.contains('active')) { const targetPanelId = event.target.dataset.panel; if(targetPanelId) activateTownPanel(targetPanelId); } }); }
if (townLogoutButton) { townLogoutButton.addEventListener('click', () => { console.log("Logging out from town..."); currentCharacterData = null; signOut(auth).catch((e) => console.error("Logout error:", e)); }); }
if (townSwitchCharButton) { townSwitchCharButton.addEventListener('click', () => { console.log("Switching character..."); currentCharacterData = null; showScreen('char-select'); }); }

// --- Map Panel Logic ---
if (mapPanel) {
    mapPanel.addEventListener('click', (event) => {
        // Clear previous selection visuals (if any)
         mapPanel.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected'));

        if (event.target.classList.contains('map-node')) {
            const zoneId = event.target.dataset.zoneId;
            console.log("Selected Zone Node:", zoneId);
            selectedZoneId = zoneId; // Store the selected zone
            event.target.classList.add('selected'); // Add visual selection state (needs CSS)
            if (enterZoneButton) enterZoneButton.disabled = false; // Enable Enter button
        } else {
            // If clicked elsewhere in the map area, deselect
            selectedZoneId = null;
            if (enterZoneButton) enterZoneButton.disabled = true;
        }
    });
}
if (enterZoneButton) {
    enterZoneButton.addEventListener('click', () => {
        if (selectedZoneId && currentCharacterData) {
            console.log(`Entering zone: ${selectedZoneId} with character: ${currentCharacterData.name}`);
            // Launch the actual game environment
            initializeGame();
            showScreen('game');
            startGameLoop();
        } else {
            console.error("Cannot enter zone: No zone selected or character data missing.");
        }
    });
}

// --- Game Screen Logic ---

// Replace the existing initializeGame function
// Replace the existing initializeGame function
function initializeGame() {
    if (!gameCanvas) { console.error("Game Canvas element not found!"); return; }
    canvasCtx = gameCanvas.getContext('2d');

    // Load assets (placeholder for now)
    loadAssets(() => {
        console.log("Assets loaded, proceeding with game init...");

        resizeCanvas(); // Set initial size (also calls updateMinimapScale)
        window.addEventListener('resize', resizeCanvas);

        setPlayerAppearance(); // Set player visuals based on class

        // Reset player position
        player.x = world.width / 2 - player.width / 2;
        player.y = world.height / 2 - player.height / 2;

        // Set initial camera position
        camera.x = player.x - gameCanvas.width / 2 + player.width / 2;
        camera.y = player.y - gameCanvas.height / 2 + player.height / 2;
        clampCameraToWorld();

        keysPressed = {};
        generateEnvironment(); // Generate obstacles
        spawnInitialMobs(15); // <-- NEW: Spawn initial mobs

        // Add listeners
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        gameCanvas.removeEventListener('click', handleMouseClick);
        gameCanvas.removeEventListener('contextmenu', handleMouseClick);
        gameCanvas.removeEventListener('mousemove', handleMouseMove);

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        gameCanvas.addEventListener('click', handleMouseClick);
        gameCanvas.addEventListener('contextmenu', handleMouseClick);
        gameCanvas.addEventListener('mousemove', handleMouseMove);

        console.log("Game initialized. Player class:", currentCharacterData?.class);

        // Start the game loop ONLY after assets are loaded and setup is done
        // startGameLoop(); // Start loop is handled by the 'Enter Zone' button now
    });
}

// --- Add this new function ---

// --- Player Appearance ---
// --- Player Appearance ---
function setPlayerAppearance() {
    // ... (check currentCharacterData) ...
    const charClass = currentCharacterData.class;
    console.log("Setting appearance and default skills for class:", charClass);

    // --- Set Visual Appearance ---
    // ... (set assetName, frame sizes, colors based on class) ...
    switch (charClass) {
        case 'Juggernaut':
            player.animations['idle'].row = 0; player.animations['walk'].row = 0; player.animations['attack'].row = 0;
            player.color = '#dc2626'; break;
        case 'Sharpshooter': /*...*/ break;
        case 'Psion': /*...*/ break;
        case 'Blade Dancer': /*...*/ break;
        case 'Warden': /*...*/ break;
        case 'Infiltrator': /*...*/ break;
        default: /*...*/ break;
    }


    // --- Assign Default Skills to Skill Bar ---
    skillBar.slots.forEach(slot => { slot.skillId = null; slot.cooldownUntil = 0; }); // Clear first

    switch (charClass) {
        case 'Juggernaut':
            skillBar.slots[4].skillId = 'juggernaut_cleave'; // <-- CONFIRM: LMB (index 4) gets cleave
            break;
        // Add cases for other classes later
        default: break;
    }
    console.log("Skill bar assignments:", skillBar.slots.map(s => s.skillId));

    // --- Reset Animation State ---
    player.currentState = 'idle'; /* ... */
}

function resizeCanvas() {
    if (!gameCanvas) return;
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
    updateMinimapScale(); // <-- Update scale on resize
    console.log(`Canvas resized to <span class="math-inline">\{gameCanvas\.width\}x</span>{gameCanvas.height}`);
}

function drawMinimap() {
    if (!minimapContainer || !minimapViewport || !gameCanvas || !canvasCtx) return;

    // --- 1. Update Viewport Indicator ---
    const viewWidth = gameCanvas.width * minimapScaleX;
    const viewHeight = gameCanvas.height * minimapScaleY;
    const viewX = camera.x * minimapScaleX;
    const viewY = camera.y * minimapScaleY;

    minimapViewport.style.width = `${viewWidth}px`;
    minimapViewport.style.height = `${viewHeight}px`;
    minimapViewport.style.left = `${viewX}px`;
    minimapViewport.style.top = `${viewY}px`;

    // --- 2. Draw elements onto the minimap background ---
    // Remove previous drawings first
    const existingDots = minimapContainer.querySelectorAll('.minimap-dot, .minimap-obj, .minimap-mob'); // Include mobs
    existingDots.forEach(dot => dot.remove());

    // Draw Environment Objects on Minimap (Optional - can be performance heavy)
    /* // Uncomment if needed, might cause lag with many objects
    environmentObjects.forEach(obj => {
        const objX = obj.x * minimapScaleX; const objY = obj.y * minimapScaleY;
        const objW = Math.max(1, obj.width * minimapScaleX); const objH = Math.max(1, obj.height * minimapScaleY);
        const objDot = document.createElement('div'); objDot.className = 'minimap-obj';
        objDot.style.cssText = `position:absolute; left:<span class="math-inline">\{objX\}px; top\:</span>{objY}px; width:<span class="math-inline">\{objW\}px; height\:</span>{objH}px; background-color:${obj.color}; opacity:0.6; border-radius: 1px;`;
        minimapContainer.appendChild(objDot);
    });
    */

    // --- Draw Mobs on Minimap ---
    const mobSize = 3; // Size of mob triangle on minimap
    activeMobs.forEach(mob => {
        const mobX = (mob.x + mob.width / 2) * minimapScaleX - (mobSize / 2); // Center dot
        const mobY = (mob.y + mob.height / 2) * minimapScaleY - (mobSize / 2);
        const mobDot = document.createElement('div');
        mobDot.className = 'minimap-mob'; // Use CSS for styling
        mobDot.style.cssText = `
            position:absolute;
            left:<span class="math-inline">\{mobX\}px;

top:{mobY}px;
width: 0; height: 0;
border-left: ${mobSize/2}px solid transparent;
border-right: ${mobSize/2}px solid transparent;
border-bottom: ${mobSize}px solid ${mob.color}; /* Pointing up triangle */
z-index: 1;
`;
minimapContainer.appendChild(mobDot);
});
// --- End Mob Drawing ---

// Draw Player on Minimap
const playerSize = 4; // Size of player dot on minimap
const playerX = (player.x + player.width / 2) * minimapScaleX - (playerSize / 2);
const playerY = (player.y + player.height / 2) * minimapScaleY - (playerSize / 2);
const playerDot = document.createElement('div');
playerDot.className = 'minimap-dot';
playerDot.style.cssText = `
    position:absolute; left:<span class="math-inline">\{playerX\}px; top\:</span>{playerY}px;
    width:<span class="math-inline">\{playerSize\}px; height\:</span>{playerSize}px;
    background-color:${player.color}; border-radius:50%;
    z-index: 2; /* Player above mobs */
`;
minimapContainer.appendChild(playerDot);
}

// Function to handle mouse clicks for skills
// Replace the existing handleMouseClick function
function handleMouseClick(event) {
    const now = Date.now();
    let slotIndex = -1;

    // Determine which slot corresponds to the click
    if (event.type === 'contextmenu') {
        event.preventDefault(); // Prevent browser menu
        slotIndex = 5; // RMB slot index
    } else if (event.type === 'click') {
        slotIndex = 4; // LMB slot index
    }

    if (slotIndex !== -1) {
        const skillSlot = skillBar.slots[slotIndex];
        const attackId = skillSlot.skillId; // Get the ID of the skill/attack in the slot

        // Check if a skill is assigned and if it's off cooldown
        if (attackId && ATTACK_DEFINITIONS[attackId] && skillSlot.cooldownUntil <= now) {
            const attackData = ATTACK_DEFINITIONS[attackId];
            console.log(`Triggering attack: ${attackId}`);

            // Activate visual feedback for the slot
            skillSlot.activeUntil = now + skillBar.highlightDuration;

            // Create an instance of this attack
            createActiveAttackInstance(attackData);

            // Set cooldown
            skillSlot.cooldownUntil = now + attackData.cooldown;

            // Set player animation state (if defined)
            if (attackData.animationName && player.animations[attackData.animationName]) {
                 if (player.currentState !== attackData.animationName) { // Prevent resetting if already attacking
                    player.currentState = attackData.animationName;
                    player.currentFrame = 0;
                    player.frameTimer = 0;
                 }
            }

        } else if (attackId && skillSlot.cooldownUntil > now) {
            console.log(`Attack ${attackId} on cooldown.`);
            // Optional: Add visual feedback for cooldown (e.g., flash red)
        } else {
            console.log(`No valid attack assigned to slot ${skillSlot.key}`);
        }
    }
}

// --- Add this new function ---
function handleMouseMove(event) {
    if (!gameCanvas) return;
    const rect = gameCanvas.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
    // console.log(`Mouse Pos (Canvas): x=<span class="math-inline">\{mousePos\.x\}, y\=</span>{mousePos.y}`); // Debugging
}

// --- Add this new function ---
// Replace the existing createActiveAttackInstance function
function createActiveAttackInstance(attackData) {
    const now = Date.now();

    // Calculate world coordinates of mouse click relative to player center
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    // Convert canvas mouse coords to world coords by adding camera offset
    const mouseWorldX = mousePos.x + camera.x;
    const mouseWorldY = mousePos.y + camera.y;

    // Calculate angle from player center to mouse world position
    const targetAngle = Math.atan2(mouseWorldY - playerCenterY, mouseWorldX - playerCenterX);

    // Update player facing direction based on attack angle
    // Angle ranges from -PI to PI. Right is roughly -PI/2 to PI/2.
    player.facingRight = Math.abs(targetAngle) <= Math.PI / 2;
    console.log(`Attack Angle: ${targetAngle.toFixed(2)} rad, Facing Right: ${player.facingRight}`);


    const attackInstance = {
        id: attackData.id,
        type: attackData.type,
        owner: player,
        startTime: now,
        duration: attackData.duration,
        color: attackData.color,
        // Type-specific properties
        ...(attackData.type === 'arc' && {
            radius: player.height * attackData.radiusMultiplier,
            startAngle: targetAngle - attackData.sweepAngle / 2, // Center arc on target angle
            endAngle: targetAngle + attackData.sweepAngle / 2,
            currentAngle: targetAngle - attackData.sweepAngle / 2, // Start at the beginning
            sweepAngle: attackData.sweepAngle,
            targetAngle: targetAngle // Store the center angle
        }),
    };

    // Adjust angles for arc drawing (no change needed here now)
    // if (attackInstance.type === 'arc') { ... } // Calculation done above

    activeAttacks.push(attackInstance);
    console.log("Created active attack instance towards mouse:", attackInstance);
}

// --- Add this new function ---
function addSkillPanelListeners() {
    if (!learnedSkillsList || !skillAssignmentBar) return;

    // Remove previous listeners to prevent duplicates if panel re-renders
    learnedSkillsList.removeEventListener('click', handleLearnedSkillClick);
    skillAssignmentBar.removeEventListener('click', handleAssignSlotClick);

    // Listener for Learned Skills List
    learnedSkillsList.addEventListener('click', handleLearnedSkillClick);

    // Listener for Assignment Slots Bar
    skillAssignmentBar.addEventListener('click', handleAssignSlotClick);
}

// --- Add these new functions ---

function handleLearnedSkillClick(event) {
    const clickedItem = event.target.closest('.skill-item');
    if (!clickedItem) return;

    const skillId = clickedItem.dataset.skillId;

    // Clear previous selections
    learnedSkillsList.querySelectorAll('.skill-item.selected-for-assignment')
        .forEach(item => item.classList.remove('selected-for-assignment'));
    if (selectedSlotElementForAssignment) {
        selectedSlotElementForAssignment.classList.remove('selected-for-assignment');
        selectedSlotElementForAssignment = null;
    }

    // Select the new skill
    if (skillId) {
        clickedItem.classList.add('selected-for-assignment');
        selectedSkillForAssignment = skillId;
        console.log("Selected skill for assignment:", selectedSkillForAssignment);
    } else {
        selectedSkillForAssignment = null; // Clicked on empty space or invalid item
    }
}

function handleAssignSlotClick(event) {
    const clickedSlot = event.target.closest('.assign-skill-slot');
    if (!clickedSlot) return;

    const slotIndex = parseInt(clickedSlot.dataset.slotIndex, 10);

    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= skillBar.slots.length) {
        console.error("Invalid slot index:", clickedSlot.dataset.slotIndex);
        return;
    }

    // If a skill is currently selected from the list...
    if (selectedSkillForAssignment) {
        console.log(`Assigning skill '${selectedSkillForAssignment}' to slot index ${slotIndex}`);

        // --- Update the Skill Bar State ---
        skillBar.slots[slotIndex].skillId = selectedSkillForAssignment;
        skillBar.slots[slotIndex].cooldownUntil = 0; // Reset cooldown on assignment

        // --- Update UI ---
        // Rerender the assignment bar to show the change
        displaySkillsPanel(); // This re-renders learned list and assignment bar

        // --- Clear Selection State ---
        selectedSkillForAssignment = null;
        // Visual deselection happens in displaySkillsPanel re-render

        // --- TODO: Save to Firestore ---
        saveSkillAssignments(); // Call function to save changes

    } else {
        // If no skill is selected, maybe highlight the slot? (Optional)
        console.log("Clicked empty slot, no skill selected to assign.");
        // Clear previous slot selection
        skillAssignmentBar.querySelectorAll('.assign-skill-slot.selected-for-assignment')
            .forEach(slot => slot.classList.remove('selected-for-assignment'));
        // Select the clicked slot
        clickedSlot.classList.add('selected-for-assignment');
        selectedSlotElementForAssignment = clickedSlot;
    }
}

// --- Add Placeholder Save Function ---
async function saveSkillAssignments() {
    if (!currentCharacterData || !auth.currentUser) {
        console.error("Cannot save skills: No character or user loaded.");
        return;
    }
    console.log("Attempting to save skill assignments...");
    // Create a simplified representation for saving (e.g., {0: 'skill_id', 4: 'other_id', ...})
    const assignmentsToSave = {};
    skillBar.slots.forEach((slot, index) => {
        if (slot.skillId) {
            assignmentsToSave[index] = slot.skillId;
        }
    });

    try {
        const charDocRef = doc(db, "characters", currentCharacterData.id);
        // Use updateDoc to only change the skillAssignments field
        await updateDoc(charDocRef, {
            skillAssignments: assignmentsToSave
        });
        console.log("Skill assignments saved successfully to Firestore.");
        // Update local data as well
        currentCharacterData.skillAssignments = assignmentsToSave;
    } catch (error) {
        console.error("Error saving skill assignments:", error);
        // TODO: Display error to user
    }
}

// --- Add this new function ---
function updateAttack(deltaTime) {
    if (!attackState.active) return;

    attackState.timer += deltaTime;

    // Calculate sweep progress (0 to 1)
    const progress = Math.min(1, attackState.timer / attackState.duration);

    // Interpolate current angle based on direction
    // Need to handle angle wrapping carefully if sweep crosses 0/2PI boundary,
    // but for this 90-degree forward sweep, simple interpolation works.
    if (player.facingRight) {
         attackState.currentAngle = attackState.startAngle + (attackState.endAngle - attackState.startAngle) * progress;
    } else {
         // For left-facing sweep (e.g., 5PI/4 to 3PI/4), interpolate backward
         attackState.currentAngle = attackState.startAngle + (attackState.endAngle - attackState.startAngle) * progress;
    }


    if (attackState.timer >= attackState.duration) {
        attackState.active = false;
        console.log("Attack finished");
        // Player state will revert to idle in updatePlayerAnimation
    }
}

// --- Add this new function ---
// Replace the existing updateActiveAttacks function
function updateActiveAttacks(deltaTime) {
    const now = Date.now();
    for (let i = activeAttacks.length - 1; i >= 0; i--) {
        const attack = activeAttacks[i];
        const elapsedTime = now - attack.startTime;
        const progress = Math.min(1, elapsedTime / attack.duration);

        if (attack.type === 'arc') {
            // Interpolate from startAngle towards endAngle
            attack.currentAngle = attack.startAngle + (attack.endAngle - attack.startAngle) * progress;

            // TODO: Add collision detection logic for the arc here later
        }
        // Add updates for other types here

        if (elapsedTime >= attack.duration) {
            activeAttacks.splice(i, 1);
            console.log(`Attack instance ${attack.id} finished.`);
        }
    }
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    keysPressed[key] = true;

    // Skill bar activation state update
    const now = Date.now();
    switch (key) {
        case '1':
            skillBar.slots[0].activeUntil = now + skillBar.highlightDuration;
            // TODO: Trigger actual skill 1 logic later
            break;
        case '2':
            skillBar.slots[1].activeUntil = now + skillBar.highlightDuration;
            // TODO: Trigger actual skill 2 logic later
            break;
        case '3':
            skillBar.slots[2].activeUntil = now + skillBar.highlightDuration;
            // TODO: Trigger actual skill 3 logic later
            break;
        case '4':
            skillBar.slots[3].activeUntil = now + skillBar.highlightDuration;
            // TODO: Trigger actual skill 4 logic later
            break;
    }
}

function handleKeyUp(event) { keysPressed[event.key.toLowerCase()] = false; }

// Replace the existing updatePlayerAnimation function
function updatePlayerAnimation(deltaTime) {
    // Check if player should revert to idle (only if NOT currently in an attack animation)
    let shouldBeIdle = true;
    if (keysPressed['arrowleft'] || keysPressed['a'] ||
        keysPressed['arrowright'] || keysPressed['d'] ||
        keysPressed['arrowup'] || keysPressed['w'] ||
        keysPressed['arrowdown'] || keysPressed['s']) {
        shouldBeIdle = false; // Moving
    }
    // Check if any active attack requires an attack animation
    if (activeAttacks.some(atk => atk.owner === player && ATTACK_DEFINITIONS[atk.id]?.animationName)) {
         shouldBeIdle = false; // Still performing an attack animation
    }

    // If not moving and not attacking, try to switch to idle
    if (shouldBeIdle && player.currentState !== 'idle') {
        player.currentState = 'idle';
        player.currentFrame = 0;
        player.frameTimer = 0;
        console.log("Reverted to idle state.");
    }

    // Process frame timing for the CURRENT state
    const currentAnim = player.animations[player.currentState];
    if (!currentAnim) return; // No animation defined

    player.frameTimer += deltaTime;

    if (player.frameTimer >= currentAnim.speed) {
        player.frameTimer = 0; // Reset timer
        // Determine frame offset based on state (only needed if multiple anims share a row)
        let frameOffset = 0;
        if (player.currentState === 'walk' || player.currentState === 'attack') {
             frameOffset = 2; // Walk/Attack uses frames 2, 3
        }
        player.currentFrame = (player.currentFrame + 1) % currentAnim.frames;
    }
}

function updatePlayerPosition() {
    // Basic movement based on pressed keys
    if (keysPressed['arrowleft'] || keysPressed['a']) { player.x -= player.speed; }
    if (keysPressed['arrowright'] || keysPressed['d']) { player.x += player.speed; }
    if (keysPressed['arrowup'] || keysPressed['w']) { player.y -= player.speed; }
    if (keysPressed['arrowdown'] || keysPressed['s']) { player.y += player.speed; }

    // World Boundary detection
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > world.width) player.x = world.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > world.height) player.y = world.height - player.height;
}
function generateEnvironment() {
    if (!gameCanvas || world.width === 0) return; // Use world width
    environmentObjects = []; const numObjects = 50; // More objects for a larger world
    for (let i = 0; i < numObjects; i++) {
        environmentObjects.push({
            // Generate within world bounds, avoiding edges slightly
            x: Math.random() * (world.width - 100) + 50,
            y: Math.random() * (world.height - 100) + 50,
            width: Math.random() * 80 + 20,
            height: Math.random() * 80 + 20,
            color: '#6b7280'
        });
    }
    console.log("Generated environment objects:", environmentObjects.length);
}

// --- Add these new functions ---

function spawnMob() {
    // Define basic mob properties
    const mobSize = 15; // Size of the mob triangle base/height
    const mobColor = '#f87171'; // Red color for mobs

    // Calculate spawn position: Randomly in the world, but try to avoid player's start area
    let spawnX, spawnY;
    const playerBuffer = 300; // Don't spawn too close to world center initially
    const worldCenterX = world.width / 2;
    const worldCenterY = world.height / 2;

    do {
        spawnX = Math.random() * (world.width - mobSize);
        spawnY = Math.random() * (world.height - mobSize);
    } while (
        // Ensure not too close to the center where player might start
        Math.abs(spawnX - worldCenterX) < playerBuffer &&
        Math.abs(spawnY - worldCenterY) < playerBuffer
    );


    const newMob = {
        x: spawnX,
        y: spawnY,
        width: mobSize, // Use width/height for drawing bounds
        height: mobSize,
        color: mobColor,
        // Add health, speed, AI state later
        // health: 10,
        // speed: 1,
        // state: 'idle'
    };
    activeMobs.push(newMob);
    console.log("Spawned mob at:", Math.round(newMob.x), Math.round(newMob.y));
}

function spawnInitialMobs(count = 5) {
    console.log(`Spawning ${count} initial mobs...`);
    activeMobs = []; // Clear any existing mobs
    for (let i = 0; i < count; i++) {
        spawnMob();
    }
}
function clampCameraToWorld() {
    // Prevent camera from showing areas outside the world boundaries
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x + gameCanvas.width > world.width) camera.x = world.width - gameCanvas.width;
    if (camera.y + gameCanvas.height > world.height) camera.y = world.height - gameCanvas.height;

    // Handle cases where canvas is bigger than world (unlikely here, but good practice)
    if (gameCanvas.width > world.width) camera.x = (world.width - gameCanvas.width) / 2;
    if (gameCanvas.height > world.height) camera.y = (world.height - gameCanvas.height) / 2;
}

function updateCameraPosition() {
    if (!gameCanvas) return;

    // Define the "dead zone" or boundary box within the screen
    const deadZoneX = gameCanvas.width / 4; // Camera moves when player is in outer 1/4
    const deadZoneY = gameCanvas.height / 4;

    // Calculate player position relative to the camera's view
    const playerViewX = player.x - camera.x;
    const playerViewY = player.y - camera.y;

    // Move camera horizontally
    if (playerViewX < deadZoneX) {
        camera.x = player.x - deadZoneX; // Move camera left
    } else if (playerViewX + player.width > gameCanvas.width - deadZoneX) {
        camera.x = player.x + player.width - (gameCanvas.width - deadZoneX); // Move camera right
    }

    // Move camera vertically
    if (playerViewY < deadZoneY) {
        camera.y = player.y - deadZoneY; // Move camera up
    } else if (playerViewY + player.height > gameCanvas.height - deadZoneY) {
        camera.y = player.y + player.height - (gameCanvas.height - deadZoneY); // Move camera down
    }

    // Ensure camera doesn't go past world boundaries
    clampCameraToWorld();
}

// Replace the existing drawGame function
// Replace the existing drawGame function
// --- Drawing Function ---
function drawGame() {
    if (!canvasCtx || !gameCanvas) return;

    // 1. Clear & Background
    canvasCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    canvasCtx.fillStyle = '#222';
    canvasCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    // --- Apply Camera Translation ---
    canvasCtx.save();
    canvasCtx.translate(-camera.x, -camera.y);

    // 2. Draw environment
    canvasCtx.fillStyle = '#4b5563';
    environmentObjects.forEach(obj => { canvasCtx.fillRect(obj.x, obj.y, obj.width, obj.height); });

    // 3. Draw Player
    const playerImage = assets.images[player.assetName];
    const currentAnim = player.animations[player.currentState];
    if (playerImage && currentAnim && assets.allLoaded) {
        let frameOffset = 0;
        if (player.currentState === 'walk' || player.currentState === 'attack') { frameOffset = 2; }
        const sx = (player.currentFrame + frameOffset) * player.frameWidth;
        const sy = currentAnim.row * player.frameHeight;
        canvasCtx.save();
        canvasCtx.translate(player.x + player.width / 2, player.y + player.height / 2);
        if (!player.facingRight) { canvasCtx.scale(-1, 1); }
        canvasCtx.drawImage( playerImage, sx, sy, player.frameWidth, player.frameHeight, -player.width / 2, -player.height / 2, player.width, player.height );
        canvasCtx.restore();
    } else { canvasCtx.fillStyle = player.color; canvasCtx.fillRect(player.x, player.y, player.width, player.height); /* Fallback */ }

    // --- 4. Draw Mobs ---
    activeMobs.forEach(mob => {
        canvasCtx.fillStyle = mob.color;
        canvasCtx.beginPath();
        // Simple upright triangle
        canvasCtx.moveTo(mob.x + mob.width / 2, mob.y); // Top point
        canvasCtx.lineTo(mob.x + mob.width, mob.y + mob.height); // Bottom right
        canvasCtx.lineTo(mob.x, mob.y + mob.height); // Bottom left
        canvasCtx.closePath();
        canvasCtx.fill();
    });
    // --- End Mob Drawing ---

    // --- 5. Draw Active Attacks ---
    activeAttacks.forEach(attack => {
        if (attack.type === 'arc') {
            drawArcAttack(attack); // Call specific drawing function
        }
        // Add else if for other attack types (projectiles, etc.)
    });
    // --- End Active Attack Drawing ---

    // --- Restore Camera Translation ---
    canvasCtx.restore(); // IMPORTANT: Restore before drawing UI overlays

    // 6. Draw Minimap
    drawMinimap();

    // 7. Draw Skill Bar
    drawSkillBar();

    // 8. Draw other HUD elements if needed
    // ...
}

// --- Add this new function ---
// Replace the existing drawArcAttack function
function drawArcAttack(attackInstance) {
    if (!canvasCtx) return;

    const playerCenterX = attackInstance.owner.x + attackInstance.owner.width / 2;
    const playerCenterY = attackInstance.owner.y + attackInstance.owner.height / 2;

    canvasCtx.beginPath();
    canvasCtx.moveTo(playerCenterX, playerCenterY);
    // Draw the arc segment from startAngle up to currentAngle
    canvasCtx.arc(
        playerCenterX, playerCenterY,
        attackInstance.radius,
        attackInstance.startAngle,
        attackInstance.currentAngle, // End at the interpolated angle
        false // Always draw clockwise for this interpolation method
    );
    canvasCtx.lineTo(playerCenterX, playerCenterY);
    canvasCtx.closePath();

    canvasCtx.fillStyle = attackInstance.color || 'rgba(255, 255, 255, 0.3)';
    canvasCtx.fill();
}

// --- Add this new function ---
function drawSkillBar() {
    if (!canvasCtx || !gameCanvas) return;

    const numSlots = skillBar.slots.length;
    const barWidth = (numSlots * skillBar.slotSize) + ((numSlots - 1) * skillBar.gap) + (skillBar.padding * 2);
    const barHeight = skillBar.slotSize + (skillBar.padding * 2);
    const barX = (gameCanvas.width - barWidth) / 2; // Center horizontally
    const barY = gameCanvas.height - barHeight - 15; // Position near bottom

    // Draw bar background
    canvasCtx.fillStyle = 'rgba(31, 41, 55, 0.8)'; // Semi-transparent dark background
    canvasCtx.strokeStyle = '#4b5563'; // Border color
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.roundRect(barX, barY, barWidth, barHeight, 5); // Use roundRect if available, else fillRect/strokeRect
    canvasCtx.fill();
    canvasCtx.stroke();

    // Draw slots
    const now = Date.now();
    skillBar.slots.forEach((slot, index) => {
        const slotX = barX + skillBar.padding + index * (skillBar.slotSize + skillBar.gap);
        const slotY = barY + skillBar.padding;

        // Check if active
        const isActive = slot.activeUntil > now;

        // Draw slot background and border
        canvasCtx.fillStyle = isActive ? 'rgba(55, 65, 81, 0.8)' : 'rgba(17, 24, 39, 0.7)';
        canvasCtx.strokeStyle = isActive ? '#facc15' : '#6b7280'; // Yellow border if active
        canvasCtx.lineWidth = isActive ? 2 : 1;
        canvasCtx.beginPath();
        canvasCtx.roundRect(slotX, slotY, skillBar.slotSize, skillBar.slotSize, 3);
        canvasCtx.fill();
        canvasCtx.stroke();

        // Draw keybind text
        canvasCtx.fillStyle = 'rgba(209, 213, 219, 0.7)';
        canvasCtx.font = 'bold 10px Roboto'; // Smaller font
        canvasCtx.textAlign = 'right';
        canvasCtx.textBaseline = 'bottom';
        canvasCtx.fillText(slot.key, slotX + skillBar.slotSize - 5, slotY + skillBar.slotSize - 3);

        // TODO: Draw skill icon inside the slot later
        // canvasCtx.drawImage(skillIcon, slotX + padding, slotY + padding, iconSize, iconSize);
    });
}

// Replace the existing gameLoop function
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - (player.lastFrameTime || now);
    player.lastFrameTime = now;

    // --- Update Game Logic ---
    updatePlayerPosition();
    updatePlayerAnimation(deltaTime); // Update animation frame
    updateActiveAttacks(deltaTime);   // <-- Update ongoing attacks
    updateCameraPosition();
    // --- End Update ---

    // --- Draw Everything ---
    drawGame();

    // --- Request Next Frame ---
    gameLoopId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    if (gameLoopId) { cancelAnimationFrame(gameLoopId); } // Stop previous if any
    console.log("Starting game loop...");
    gameLoop();
}

// Event listener for the exit game button
if (exitGameButton) {
    exitGameButton.addEventListener('click', () => {
        console.log("Exiting game...");
        // Stop game loop and remove listeners handled by showScreen call
        if (currentCharacterData) { showScreen('town'); }
        else { showScreen('char-select'); } // Fallback if somehow no char data
    });
}

// --- Initial Script Load ---
console.log("Script loaded. Waiting for Firebase auth state...");
// Initial UI state handled by onAuthStateChanged

