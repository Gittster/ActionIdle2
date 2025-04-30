// Import functions from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail, // For password reset
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
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Import Firebase Configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
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
    const loginErrorDiv = document.getElementById('login-error');
    if (loginErrorDiv) loginErrorDiv.textContent = "Error connecting to services.";
    throw new Error("Firebase initialization failed");
}

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const charSelectScreen = document.getElementById('char-select-screen');
const charCreateScreen = document.getElementById('char-create-screen');

// Login Screen Elements
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const loginError = document.getElementById('login-error');
const loginFeedback = document.getElementById('login-feedback'); // For success messages
const resetPasswordButton = document.getElementById('reset-password-button');

// Character Select Screen Elements
const characterListDiv = document.getElementById('character-list');
const charSelectError = document.getElementById('char-select-error');
const launchCharButton = document.getElementById('launch-char-button');
const deleteCharButton = document.getElementById('delete-char-button');
const createNewCharButton = document.getElementById('create-new-char-button');
const logoutButton = document.getElementById('logout-button');
const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');

// Character Create Screen Elements
const charNameInput = document.getElementById('char-name');
const classSelectionDiv = document.getElementById('class-selection');
const selectedClassInput = document.getElementById('selected-class');
const createButton = document.getElementById('create-button');
const backToSelectButton = document.getElementById('back-to-select-button');
const charCreateError = document.getElementById('char-create-error');

// --- State Variables ---
let selectedCharacterId = null;
let selectedCharacterName = null;
let selectedCharacterElement = null;

// --- Helper Functions ---
function showScreen(screenToShow) {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (charSelectScreen) charSelectScreen.classList.add('hidden');
    if (charCreateScreen) charCreateScreen.classList.add('hidden');
    if (screenToShow) screenToShow.classList.remove('hidden');
    if (screenToShow !== charSelectScreen) {
        resetSelectionState();
    }
}

function displayError(element, message) {
    if (element) element.textContent = message;
    console.warn("Displayed error/feedback:", message);
}

// *** Corrected clearErrors function (only one definition now) ***
function clearErrors() {
    if (loginError) loginError.textContent = '';
    if (loginFeedback) loginFeedback.textContent = ''; // Clear feedback message
    if (charSelectError) charSelectError.textContent = '';
    if (charCreateError) charCreateError.textContent = '';
}

function updateActionButtonsState() {
    const isCharSelected = selectedCharacterId !== null;
    if (launchCharButton) launchCharButton.disabled = !isCharSelected;
    if (deleteCharButton) deleteCharButton.disabled = !isCharSelected;
}

function resetSelectionState() {
    selectedCharacterId = null;
    selectedCharacterName = null;
    if (selectedCharacterElement) {
        selectedCharacterElement.classList.remove('selected-char');
        selectedCharacterElement = null;
    }
    if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden');
    updateActionButtonsState();
}

// --- Authentication Logic ---
if (auth) {
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log("Persistence set to local.");
            setupAuthStateListener();
        })
        .catch((error) => {
            console.error("Error setting persistence:", error);
            setupAuthStateListener();
            displayError(loginError, "Could not enable auto-login.");
        });
} else {
    console.error("Firebase Auth not initialized.");
    displayError(loginError, "Initialization error.");
}

function setupAuthStateListener() {
    if (!auth) return;
    onAuthStateChanged(auth, (user) => {
        clearErrors();
        resetSelectionState();
        if (user) {
            console.log("User logged in:", user.uid);
            showScreen(charSelectScreen);
            loadCharacters(user.uid);
        } else {
            console.log("User logged out.");
            showScreen(loginScreen);
            if (loginPasswordInput) loginPasswordInput.value = '';
            if (characterListDiv) characterListDiv.innerHTML = '<p class="text-center text-gray-400">Login to see characters.</p>';
        }
    });
}

// --- Event Listeners ---

// Login Event
if (loginButton) {
    loginButton.addEventListener('click', () => {
        clearErrors();
        const email = loginEmailInput ? loginEmailInput.value : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) {
            displayError(loginError, "Please enter email and password.");
            return;
        }
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => { console.log("Login successful:", userCredential.user.uid); })
            .catch((error) => {
                console.error("Login error:", error.code, error.message);
                let message = "Login failed. Please check your credentials.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    message = "Invalid email or password.";
                } else if (error.code === 'auth/invalid-email') { message = "Invalid email format."; }
                displayError(loginError, message);
            });
    });
}
// Register Event
if (registerButton) {
    registerButton.addEventListener('click', () => {
        clearErrors();
        const email = loginEmailInput ? loginEmailInput.value : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) { displayError(loginError, "Please enter email and password to register."); return; }
        if (password.length < 6) { displayError(loginError, "Password should be at least 6 characters."); return; }
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Registration successful:", userCredential.user.uid);
                if (loginEmailInput) loginEmailInput.value = '';
                if (loginPasswordInput) loginPasswordInput.value = '';
            })
            .catch((error) => {
                console.error("Registration error:", error.code, error.message);
                 let message = `Registration failed: ${error.message}`;
                 if (error.code === 'auth/email-already-in-use') { message = "This email address is already registered."; }
                 else if (error.code === 'auth/invalid-email') { message = "Invalid email format."; }
                 else if (error.code === 'auth/weak-password') { message = "Password is too weak (must be at least 6 characters)."; }
                displayError(loginError, message);
            });
    });
}
// Logout Event
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).catch((error) => {
            console.error("Logout error:", error);
            displayError(charSelectError, "Error logging out.");
        });
    });
}

// Reset Password Event
if (resetPasswordButton) {
    resetPasswordButton.addEventListener('click', () => {
        clearErrors();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        if (!email) {
            displayError(loginError, "Please enter your email address above to reset password.");
            if (loginEmailInput) loginEmailInput.focus();
            return;
        }
        console.log("Attempting password reset for:", email);
        resetPasswordButton.disabled = true;
        displayError(loginFeedback, "Sending reset email..."); // Use feedback div

        sendPasswordResetEmail(auth, email)
            .then(() => {
                console.log("Password reset email sent successfully.");
                displayError(loginFeedback, `Password reset email sent to ${email}. Check your inbox (and spam folder).`);
            })
            .catch((error) => {
                console.error("Password reset error:", error.code, error.message);
                let message = `Failed to send reset email: ${error.message}`;
                if (error.code === 'auth/user-not-found') {
                    message = "No account found with that email address.";
                } else if (error.code === 'auth/invalid-email') {
                    message = "Invalid email format.";
                }
                displayError(loginError, message); // Show error in the error div
                displayError(loginFeedback, ""); // Clear the feedback message
            })
            .finally(() => {
                if (resetPasswordButton) resetPasswordButton.disabled = false;
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
        if (selectedCharacterElement === clickedItem) return; // Or resetSelectionState();
        resetSelectionState();
        selectedCharacterId = charId;
        selectedCharacterName = charName;
        selectedCharacterElement = clickedItem;
        selectedCharacterElement.classList.add('selected-char');
        console.log(`Selected Character: ID=${selectedCharacterId}, Name=${selectedCharacterName}`);
        updateActionButtonsState();
    });
}

// --- Main Action Button Listeners ---
if (launchCharButton) {
    launchCharButton.addEventListener('click', () => {
        if (selectedCharacterId) {
            launchGame(selectedCharacterId);
        } else {
            console.warn("Launch clicked but no character selected.");
        }
    });
}
if (deleteCharButton) {
    deleteCharButton.addEventListener('click', () => {
        if (selectedCharacterId && selectedCharacterName) {
            if (deleteConfirmMessage) deleteConfirmMessage.textContent = `Permanently delete ${selectedCharacterName}?`;
            if (deleteConfirmDialog) deleteConfirmDialog.classList.remove('hidden');
            console.log("Delete initiated for:", selectedCharacterName);
        } else {
            console.warn("Delete clicked but no character selected.");
        }
    });
}

// --- Inline Delete Confirmation Button Listeners ---
if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener('click', () => {
        if (selectedCharacterId) {
            console.log("Confirming deletion for:", selectedCharacterId);
            deleteCharacter(selectedCharacterId);
        } else {
            console.error("Confirm delete clicked but selection ID was lost.");
            resetSelectionState();
        }
    });
}
if (cancelDeleteButton) {
    cancelDeleteButton.addEventListener('click', () => {
        if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden');
        console.log("Deletion cancelled.");
    });
}

// --- Character Creation Navigation/Logic ---
if (createNewCharButton) {
    createNewCharButton.addEventListener('click', () => {
        clearErrors();
        resetSelectionState();
        showScreen(charCreateScreen);
        if (charNameInput) charNameInput.value = '';
        if (selectedClassInput) selectedClassInput.value = '';
        document.querySelectorAll('.class-button.selected').forEach(btn => btn.classList.remove('selected'));
    });
}
if (backToSelectButton) {
    backToSelectButton.addEventListener('click', () => {
        clearErrors();
        showScreen(charSelectScreen);
    });
}
if (classSelectionDiv) {
    classSelectionDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('class-button')) {
            classSelectionDiv.querySelectorAll('.class-button.selected').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            if (selectedClassInput) { selectedClassInput.value = event.target.dataset.class; console.log("Selected class:", selectedClassInput.value); }
        }
    });
}
if (createButton) {
    createButton.addEventListener('click', async () => {
        clearErrors();
        const charName = charNameInput ? charNameInput.value.trim() : '';
        const selectedClass = selectedClassInput ? selectedClassInput.value : '';
        const user = auth.currentUser;
        if (!user) { displayError(charCreateError, "Error: Not logged in."); showScreen(loginScreen); return; }
        if (!charName) { displayError(charCreateError, "Please enter a character name."); return; }
        if (charName.length > 20) { displayError(charCreateError, "Character name too long (max 20 chars)."); return; }
        if (!selectedClass) { displayError(charCreateError, "Please select a class."); return; }
        console.log(`Creating character: User ID: ${user.uid}, Name: ${charName}, Class: ${selectedClass}`);
        createButton.disabled = true; displayError(charCreateError, "Creating character...");
        try {
            const charactersCol = collection(db, 'characters');
            const docRef = await addDoc(charactersCol, { userId: user.uid, name: charName, class: selectedClass, level: 1, experience: 0, location: "Starhaven", createdAt: Timestamp.fromDate(new Date()) });
            console.log("Character saved with ID: ", docRef.id);
            showScreen(charSelectScreen);
            loadCharacters(user.uid);
        } catch (error) {
            console.error("Error adding character: ", error); displayError(charCreateError, `Failed to create character: ${error.message}`);
        } finally {
             if (createButton) createButton.disabled = false;
             if (charCreateError && charCreateError.textContent === "Creating character...") { clearErrors(); }
        }
    });
}

// --- Load Characters Function ---
async function loadCharacters(userId) {
    if (!userId || !db || !characterListDiv) {
        console.error("Cannot load characters: Missing userId, db, or list element.");
        if (characterListDiv) characterListDiv.innerHTML = '<p class="text-center text-red-400">Error loading data.</p>';
        return;
    }
    console.log("Loading characters for user:", userId);
    characterListDiv.innerHTML = '<p class="text-center text-gray-400">Loading characters...</p>';
    resetSelectionState();
    try {
        const charactersCol = collection(db, 'characters');
        const q = query(charactersCol, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
             characterListDiv.innerHTML = '<p class="text-center text-gray-400">No characters found. Create one!</p>';
             return;
        }
        let charactersHTML = '';
        querySnapshot.forEach((doc) => {
            const char = doc.data();
            charactersHTML += `
                <div class="character-list-item" data-char-id="${doc.id}" data-char-name="${char.name}">
                    <span>${char.name} - Lvl ${char.level || 1} ${char.class}</span>
                </div>
            `;
        });
        characterListDiv.innerHTML = charactersHTML;
    } catch (error) {
        console.error("Error getting characters: ", error);
        displayError(charSelectError, "Failed to load characters.");
        characterListDiv.innerHTML = '<p class="text-center text-red-400">Error loading characters.</p>';
    }
}

// --- Delete Character Function ---
async function deleteCharacter(characterId) {
    if (!characterId || !db) {
        console.error("Cannot delete: Missing ID or DB.");
        displayError(charSelectError, "Error preparing deletion.");
        return;
    }
    console.log("Deleting character ID:", characterId);
    displayError(charSelectError, "Deleting character...");
    if(confirmDeleteButton) confirmDeleteButton.disabled = true;
    if(cancelDeleteButton) cancelDeleteButton.disabled = true;
    try {
        const characterDocRef = doc(db, "characters", characterId);
        await deleteDoc(characterDocRef);
        console.log("Character deleted successfully:", characterId);
        displayError(charSelectError, "Character deleted.");
        resetSelectionState();
        const user = auth.currentUser;
        if (user) {
            loadCharacters(user.uid);
        } else {
            console.error("Cannot refresh list: User not logged in.");
            showScreen(loginScreen);
        }
        setTimeout(clearErrors, 3000);
    } catch (error) {
        console.error("Error deleting character: ", error);
        displayError(charSelectError, `Failed to delete character: ${error.message}`);
        if(confirmDeleteButton) confirmDeleteButton.disabled = false;
        if(cancelDeleteButton) cancelDeleteButton.disabled = false;
    }
}

// --- Launch Game Function (Placeholder) ---
function launchGame(characterId) {
    console.log("Launching game with character ID:", characterId);
    alert(`Placeholder: Launching game with character ${characterId}. Implement game screen next!`);
    // TODO: Implement actual game launch
}

// --- Initial Check ---
console.log("Script loaded. Waiting for Firebase auth state...");
updateActionButtonsState(); // Ensure buttons start disabled