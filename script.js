// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    // fetchSignInMethodsForEmail, // No longer needed for this flow
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
    getDoc // <-- Import getDoc
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
        const container = document.querySelector('.app-container');
        if (container) container.prepend(initialErrorDiv);
    }
    throw new Error("Firebase initialization failed");
}

// --- DOM Elements ---
// Screens
const loginScreen = document.getElementById('login-screen');
const charSelectScreen = document.getElementById('char-select-screen');
const charCreateScreen = document.getElementById('char-create-screen');
const townScreen = document.getElementById('town-screen'); // <-- Town Screen

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
const classSelectionDiv = document.getElementById('class-selection');
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
const townMainContent = document.querySelector('.town-main-content');const inventoryPanel = document.getElementById('inventory-panel');
const inventoryGrid = document.getElementById('inventory-grid');
// Add refs for other panels (stats, skills, etc.) as needed

// --- State Variables ---
let selectedCharacterId = null;
let selectedCharacterName = null;
let selectedCharacterElement = null;
let currentCharacterData = null; // <-- Store loaded character data

// --- Helper Functions ---

// Clears messages on the main login screen
function clearLoginMessages() {
    if (loginFeedback) loginFeedback.textContent = '';
    if (loginError) loginError.textContent = '';
}

// Clears all error/feedback messages across screens
function clearErrors() {
    clearLoginMessages(); // Clear login screen messages
    if (charSelectError) charSelectError.textContent = '';
    if (charCreateError) charCreateError.textContent = '';
    // Add clearing for town screen errors if needed later
}

// Displays error/feedback messages
function displayError(element, message) {
    if (element) element.textContent = message;
    console.warn("Displayed error/feedback:", message);
}

// Shows the correct main screen (Login, Char Select, Char Create, Town)
function showScreen(screenId) {
    // Hide all main screens first
    [loginScreen, charSelectScreen, charCreateScreen, townScreen].forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });

    // Show the requested screen
    let screenToShow = null;
    if (screenId === 'login') screenToShow = loginScreen;
    else if (screenId === 'char-select') screenToShow = charSelectScreen;
    else if (screenId === 'char-create') screenToShow = charCreateScreen;
    else if (screenId === 'town') screenToShow = townScreen;

    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    } else {
        console.error("Invalid screen ID provided to showScreen:", screenId);
        // Default to login screen on error or invalid ID
        if(loginScreen) loginScreen.classList.remove('hidden');
    }

    // Reset character selection if navigating away from char select
    if (screenId !== 'char-select') {
        resetSelectionState();
    }
    // Clear character data if navigating away from town
    if (screenId !== 'town') {
        currentCharacterData = null;
    }
}

// Updates the enabled/disabled state of character action buttons
function updateActionButtonsState() {
    const isCharSelected = selectedCharacterId !== null;
    if (launchCharButton) launchCharButton.disabled = !isCharSelected;
    if (deleteCharButton) deleteCharButton.disabled = !isCharSelected;
}

// Resets character selection state and UI
function resetSelectionState() {
    selectedCharacterId = null;
    selectedCharacterName = null;
    if (selectedCharacterElement) {
        selectedCharacterElement.classList.remove('selected-char');
        selectedCharacterElement = null;
    }
    if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden');
    updateActionButtonsState(); // Disable buttons
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

// Auth State Change Listener
function setupAuthStateListener() {
    if (!auth) { console.error("Auth not initialized for listener."); return; }
    onAuthStateChanged(auth, (user) => {
        clearErrors();
        resetSelectionState(); // Reset character selection on auth change
        if (user) {
            // User is signed in -> Go to Character Selection
            console.log("User logged in:", user.uid);
            showScreen('char-select');
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

// --- Event Listeners (Login/Register/Google/Reset) ---

// Login Button
if (loginButton) {
    loginButton.addEventListener('click', () => {
        clearLoginMessages();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) {
            displayError(loginError, "Please enter email and password.");
            return;
        }
        loginButton.disabled = true; displayError(loginFeedback, "Logging in...");

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Login successful."); // onAuthStateChanged handles UI
            })
            .catch((error) => {
                console.error("Login error:", error.code, error.message);
                let message = "Login failed.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    message = "Invalid email or password.";
                } else if (error.code === 'auth/invalid-email') { message = "Invalid email format."; }
                displayError(loginError, message);
            })
            .finally(() => {
                if(loginButton) loginButton.disabled = false;
                displayError(loginFeedback, "");
            });
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
            .then((userCredential) => {
                console.log("Registration successful."); // onAuthStateChanged handles UI
            })
            .catch((error) => {
                console.error("Registration error:", error.code, error.message);
                 let message = `Registration failed.`;
                 if (error.code === 'auth/email-already-in-use') { message = "This email address is already registered."; }
                 else if (error.code === 'auth/invalid-email') { message = "Invalid email format."; }
                 else if (error.code === 'auth/weak-password') { message = "Password is too weak."; }
                 else { message = `Error: ${error.message}`; }
                displayError(loginError, message);
            })
            .finally(() => {
                 if(registerButton) registerButton.disabled = false;
                 displayError(loginFeedback, "");
            });
    });
}

// Reset Password Button
if (resetPasswordButton) {
    resetPasswordButton.addEventListener('click', () => {
        clearLoginMessages();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        if (!email) { displayError(loginError, "Please enter your email address above to reset password."); return; }
        resetPasswordButton.disabled = true; displayError(loginFeedback, "Sending reset email...");
        sendPasswordResetEmail(auth, email)
            .then(() => { displayError(loginFeedback, `Password reset email sent to ${email}.`); })
            .catch((error) => {
                let message = `Failed to send reset email: ${error.message}`;
                if (error.code === 'auth/user-not-found'){ message = "No account found with that email."; }
                displayError(loginError, message); displayError(loginFeedback, "");
            })
            .finally(() => { if (resetPasswordButton) resetPasswordButton.disabled = false; });
    });
}

// Google Sign-In Button
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', () => {
        clearLoginMessages();
        const provider = new GoogleAuthProvider();
        googleSignInButton.disabled = true; displayError(loginFeedback, "Opening Google Sign-In...");
        signInWithPopup(auth, provider)
            .then((result) => { console.log("Google Sign-In successful:", result.user.uid); displayError(loginFeedback, ""); }) // onAuthStateChanged handles UI
            .catch((error) => {
                console.error("Google Sign-In error:", error.code, error.message);
                let friendlyMessage = "Google Sign-In failed.";
                if (error.code === 'auth/popup-closed-by-user') { friendlyMessage = "Sign-in cancelled."; }
                else if (error.code === 'auth/popup-blocked') { friendlyMessage = "Popup blocked by browser."; }
                else if (error.code === 'auth/account-exists-with-different-credential') { friendlyMessage = "Account exists with different sign-in method."; }
                displayError(loginError, friendlyMessage); displayError(loginFeedback, "");
            })
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
        document.querySelectorAll('.class-button.selected').forEach(btn => btn.classList.remove('selected'));
    });
}
if (backToSelectButton) { // Navigate back from create screen
    backToSelectButton.addEventListener('click', () => {
        clearErrors(); showScreen('char-select');
    });
}
if (classSelectionDiv) { // Handle visual class selection
    classSelectionDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('class-button')) {
            classSelectionDiv.querySelectorAll('.class-button.selected').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            if (selectedClassInput) { selectedClassInput.value = event.target.dataset.class; }
        }
    });
}
if (createButton) { // Handle actual character creation
    createButton.addEventListener('click', async () => {
        clearErrors();
        const charName = charNameInput ? charNameInput.value.trim() : '';
        const selectedClass = selectedClassInput ? selectedClassInput.value : '';
        const user = auth.currentUser;
        if (!user) { displayError(charCreateError, "Error: Not logged in."); showScreen('login'); return; }
        if (!charName) { displayError(charCreateError, "Please enter a character name."); return; }
        if (charName.length > 20) { displayError(charCreateError, "Name too long (max 20)."); return; }
        if (!selectedClass) { displayError(charCreateError, "Please select a class."); return; }

        createButton.disabled = true; displayError(charCreateError, "Creating character...");
        try {
            const charactersCol = collection(db, 'characters');
            // Add initial data - ensure fields match what launchGame expects (e.g., level, currency)
            await addDoc(charactersCol, {
                 userId: user.uid,
                 name: charName,
                 class: selectedClass,
                 level: 1,
                 experience: 0,
                 currency: 0, // Add initial currency
                 location: "Starhaven", // Default location
                 createdAt: Timestamp.fromDate(new Date())
                 // Add empty inventory/equipment objects if needed
                 // inventory: [],
                 // equipped: {}
            });
            console.log("Character created.");
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
    const listDiv = document.getElementById('character-list');
    if (!userId || !db || !listDiv) {
        console.error("loadCharacters: Pre-conditions failed.");
        if(listDiv) listDiv.innerHTML = '<p class="no-characters-message" style="color: red;">Error: Cannot load character data.</p>';
        return;
    }
    console.log("loadCharacters: Starting for user:", userId);
    listDiv.innerHTML = '<p class="no-characters-message">Loading characters...</p>';
    resetSelectionState();
    try {
        const charactersCol = collection(db, 'characters');
        const q = query(charactersCol, where("userId", "==", userId));
        console.log("loadCharacters: Executing Firestore query...");
        const querySnapshot = await getDocs(q);
        console.log("loadCharacters: Firestore query completed. Found documents:", querySnapshot.size);

        if (querySnapshot.empty) {
             console.log("loadCharacters: No characters found.");
             listDiv.innerHTML = '<p class="no-characters-message">No characters found. Create one!</p>';
             return;
        }
        let charactersHTML = '';
        console.log("loadCharacters: Processing documents...");
        querySnapshot.forEach((doc) => {
            const char = doc.data();
            console.log(`loadCharacters: Processing doc ID: ${doc.id}`, char);
            charactersHTML += `
                <div class="character-list-item" data-char-id="${doc.id}" data-char-name="${char.name || 'Unnamed'}">
                    <span>${char.name || 'Unnamed'} - Lvl ${char.level || 1} ${char.class || 'Unknown'}</span>
                </div>`;
        });
        console.log("loadCharacters: Setting HTML.");
        listDiv.innerHTML = charactersHTML;
    } catch (error) {
        console.error("loadCharacters: Error during query/processing:", error);
        displayError(charSelectError, "Failed to load characters.");
        listDiv.innerHTML = '<p class="no-characters-message" style="color: red;">Error loading characters.</p>';
    } finally {
        console.log("loadCharacters: Finished.");
    }
}

// --- Delete Character Function ---
async function deleteCharacter(characterId) {
    if (!characterId || !db) { /* Error handling */ return; }
    console.log("Deleting character ID:", characterId);
    displayError(charSelectError, "Deleting character...");
    if(confirmDeleteButton) confirmDeleteButton.disabled = true;
    if(cancelDeleteButton) cancelDeleteButton.disabled = true;
    try {
        const characterDocRef = doc(db, "characters", characterId);
        await deleteDoc(characterDocRef);
        console.log("Character deleted.");
        displayError(charSelectError, "Character deleted.");
        resetSelectionState(); // Clear selection, hide dialog
        const user = auth.currentUser;
        if (user) { loadCharacters(user.uid); } // Refresh list
        else { console.error("Cannot refresh list: User logged out."); showScreen('login'); }
        setTimeout(clearErrors, 3000); // Clear message after delay
    } catch (error) {
        console.error("Error deleting character:", error);
        displayError(charSelectError, `Failed to delete: ${error.message}`);
        if(confirmDeleteButton) confirmDeleteButton.disabled = false; // Re-enable on error
        if(cancelDeleteButton) cancelDeleteButton.disabled = false;
    }
}

// --- Launch Game Function (Loads data and shows Town) ---
async function launchGame(characterId) {
    console.log("Attempting to launch game with character ID:", characterId);
    displayError(charSelectError, "Loading character data..."); // Use char select error display

    try {
        const charDocRef = doc(db, "characters", characterId);
        const charDocSnap = await getDoc(charDocRef);

        if (charDocSnap.exists()) {
            currentCharacterData = { id: charDocSnap.id, ...charDocSnap.data() };
            console.log("Character data loaded:", currentCharacterData);

            // Populate Town Header
            if (townCharName) townCharName.textContent = currentCharacterData.name || 'N/A';
            if (townCharLevel) townCharLevel.textContent = currentCharacterData.level || '1';
            if (townCharClass) townCharClass.textContent = currentCharacterData.class || 'N/A';
            if (townCurrency) townCurrency.textContent = currentCharacterData.currency || '0';

            // Activate the default panel (Inventory) and populate it
            activateTownPanel('inventory-panel'); // Call helper to activate
            displayInventoryPanel();

            // Switch to the Town Screen
            showScreen('town');
            clearErrors(); // Clear loading message

        } else {
            console.error("Error launching game: Character document not found!");
            displayError(charSelectError, "Error: Could not load character data.");
        }
    } catch (error) {
        console.error("Error fetching character data:", error);
        displayError(charSelectError, `Error loading character: ${error.message}`);
    }
}

// --- Town Screen Logic ---

// Helper to activate a specific town panel
function activateTownPanel(panelId) {
     // Deactivate current button and panel
     townNav.querySelector('.town-nav-button.active')?.classList.remove('active');
     townMainContent.querySelector('.town-panel.active')?.classList.add('hidden');
     townMainContent.querySelector('.town-panel.active')?.classList.remove('active');

     // Activate new button and panel
     const newButton = townNav.querySelector(`.town-nav-button[data-panel="${panelId}"]`);
     const newPanel = document.getElementById(panelId);

     if (newButton) newButton.classList.add('active');
     if (newPanel) {
         newPanel.classList.remove('hidden');
         newPanel.classList.add('active');
         // Call display function for the specific panel
         switch (panelId) {
            case 'inventory-panel': displayInventoryPanel(); break;
            case 'stats-panel': displayStatsPanel(); break;
            case 'skills-panel': displaySkillsPanel(); break;
            case 'map-panel': displayMapPanel(); break;
            case 'vendor-panel': displayVendorPanel(); break;
            case 'crafting-panel': displayCraftingPanel(); break;
         }
     } else {
         console.error("Target panel not found:", panelId);
     }
}


// Function to display the inventory panel content
function displayInventoryPanel() {
    console.log("Displaying Inventory Panel for:", currentCharacterData?.name);
    if (!currentCharacterData) { console.error("Cannot display inventory: No data."); return; }

    // Populate Equipment Slots
    const equipmentSlots = document.querySelectorAll('.equipment-slots .equip-slot');
    equipmentSlots.forEach(slot => {
        const slotName = slot.dataset.slot;
        // TODO: Get actual item from currentCharacterData.equipped[slotName]
        const equippedItem = null; // Placeholder
        if (equippedItem) {
            slot.textContent = ''; // Clear placeholder text
            // Render item icon/details here
            // Example: slot.innerHTML = `<img src="${equippedItem.icon}" alt="${equippedItem.name}">`;
        } else {
            slot.textContent = slotName.charAt(0).toUpperCase() + slotName.slice(1); // Show slot name
            // Clear any previous item rendering
        }
    });

    // Populate Inventory Grid
    if (inventoryGrid) {
        inventoryGrid.innerHTML = ''; // Clear previous slots
        const inventorySize = currentCharacterData.inventorySize || 60; // Get size from data or default
        const inventoryItems = currentCharacterData.inventory || []; // Get inventory array

        for (let i = 0; i < inventorySize; i++) {
            // TODO: Find item corresponding to this slot index 'i' from inventoryItems
            const itemInSlot = null; // Placeholder
            const slotEl = document.createElement('div');
            slotEl.classList.add('inv-slot');
            slotEl.dataset.slotIndex = i; // Store index for interaction
            if (itemInSlot) {
                // Render item icon/details here
                 // Example: slotEl.innerHTML = `<img src="${itemInSlot.icon}" alt="${itemInSlot.name}">`;
            }
            inventoryGrid.appendChild(slotEl);
        }
    }
}

// Placeholder display functions for other panels
function displayStatsPanel() { console.log("Displaying Stats Panel"); /* TODO: Populate stats */ }
function displaySkillsPanel() { console.log("Displaying Skills Panel"); /* TODO: Render skill tree */ }
function displayMapPanel() { console.log("Displaying Map Panel"); /* TODO: Show map/zones */ }
function displayVendorPanel() { console.log("Displaying Vendor Panel"); /* TODO: Show vendor UI */ }
function displayCraftingPanel() { console.log("Displaying Crafting Panel"); /* TODO: Show crafting UI */ }


// Event Listener for Town Navigation
if (townNav) {
    townNav.addEventListener('click', (event) => {
        // Check if a nav button was clicked and it's not already active
        if (event.target.classList.contains('town-nav-button') && !event.target.classList.contains('active')) {
            const targetPanelId = event.target.dataset.panel;
            if(targetPanelId) {
                activateTownPanel(targetPanelId); // Use helper to switch panel
            }
        }
    });
}

// Logout Button (Town Screen)
if (townLogoutButton) {
    townLogoutButton.addEventListener('click', () => {
        console.log("Logging out from town screen...");
        currentCharacterData = null; // Clear loaded character data
        signOut(auth).catch((error) => {
            console.error("Logout error:", error);
        });
        // onAuthStateChanged handles switching back to login screen
    });
}

// --- Initial Script Load ---
console.log("Script loaded. Waiting for Firebase auth state...");
// Initial UI state is handled by onAuthStateChanged

