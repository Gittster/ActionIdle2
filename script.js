// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
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
    getDoc,
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
    const initialErrorDiv = document.getElementById('login-error') || document.createElement('div');
    initialErrorDiv.textContent = "Error connecting to services. Please refresh.";
    initialErrorDiv.style.color = 'red'; initialErrorDiv.style.textAlign = 'center'; initialErrorDiv.style.padding = '1rem';
    if (!document.getElementById('login-error')) {
        const container = document.querySelector('.app-container');
        if (container) container.prepend(initialErrorDiv);
    }
    throw new Error("Firebase initialization failed");
}

// --- DOM Elements ---
// Screens
let loginScreen, charSelectScreen, charCreateScreen, townScreen, combatScreen;
// Login Elements
let loginEmailInput, loginPasswordInput, loginButton, registerButton, loginFeedback, loginError, resetPasswordButton, googleSignInButton;
// Character Select Elements
let characterListDiv, charSelectError, launchCharButton, deleteCharButton, createNewCharButton, logoutButton, deleteConfirmDialog, deleteConfirmMessage, confirmDeleteButton, cancelDeleteButton;
// Character Create Elements
let charNameInput, classSelectionGrid, selectedClassInput, createButton, backToSelectButton, charCreateError;
// Town Screen Elements
let townHeaderInfo, townCharName, townCharLevel, townCharClass, townCurrency, townNav, townLogoutButton, townSwitchCharButton, townMainContent, overviewPanel, overviewCharName, inventoryPanel, inventoryGrid, mapPanel, skillsPanel, learnedSkillsList, skillAssignmentBar;
let mapNodeList, enterZoneButton;
// Combat Screen Elements
let combatZoneName, exitCombatButton, enemyGrid, playerSkillBarCombat, combatLog;
// Combat Resource Bar Elements
let playerHealthBar, playerHealthFill, playerHealthText;
let playerManaBar, playerManaFill, playerManaText;
// Tooltip Element
let itemTooltip;
// (Near other state variables)
let currentZoneLoot = []; // Array to hold loot drops { type: 'credits'/'item', amount: #, itemData: {...} }

// --- Item/Attack/Enemy/Zone Definitions ---
const ITEM_DEFINITIONS = {
    // Existing items with sellValue added
    'starter_mace': { id: 'starter_mace', name: 'Scrap Metal Cudgel', type: 'OneHandMace', slot: ['weapon1', 'weapon2'], rarity: 'common', baseStats: { 'physicalDamageMin': 5, 'physicalDamageMax': 8, 'attackSpeed': 1.2, 'critChance': 5.0, 'addedPhysicalDamage': 2 }, sellValue: 10 },
    'worn_leather_cap': { id: 'worn_leather_cap', name: 'Worn Leather Cap', type: 'Helmet', slot: ['head'], rarity: 'uncommon', baseStats: { 'defense': 5, 'percentIncreasedPhysicalDamage': 0.05 }, sellValue: 15 },
    'reinforced_chestplate': { id: 'reinforced_chestplate', name: 'Reinforced Chestplate', type: 'ChestArmor', slot: ['chest'], rarity: 'uncommon', baseStats: { 'defense': 15, 'addedPhysicalDamage': 3 }, sellValue: 25 },
    'basic_gloves': { id: 'basic_gloves', name: 'Basic Gloves', type: 'Gloves', slot: ['hands'], rarity: 'common', baseStats: { 'defense': 2, 'percentIncreasedAttackSpeed': 0.08 }, sellValue: 5 }, // Assuming 'hands' slot
    'iron_ring': { id: 'iron_ring', name: 'Iron Ring', type: 'Ring', slot: ['accessory1', 'accessory2'], rarity: 'uncommon', baseStats: { 'addedPhysicalDamage': 1 }, sellValue: 12 },

    // New Items with sellValue added
    'scrap_metal': { id: 'scrap_metal', name: 'Scrap Metal', type: 'Component', rarity: 'common', stackable: true, maxStack: 50, sellValue: 1 }, // Components have value
    'basic_wiring': { id: 'basic_wiring', name: 'Basic Wiring', type: 'Component', rarity: 'common', stackable: true, maxStack: 50, sellValue: 2 },
    'ammo_clip_standard': { id: 'ammo_clip_standard', name: 'Std. Ammo Clip', type: 'Consumable', rarity: 'common', stackable: true, maxStack: 20, sellValue: 3 },
    'commander_targeting_module': { id: 'commander_targeting_module', name: 'Commander Targeting Module', type: 'Accessory', slot: ['accessory1', 'accessory2'], rarity: 'rare', baseStats: { 'critChance': 3.0, 'percentIncreasedPhysicalDamage': 0.08 }, sellValue: 75 }, // Rare drop
    'advanced_power_core': { id: 'advanced_power_core', name: 'Advanced Power Core', type: 'Component', rarity: 'epic', stackable: false, sellValue: 150 } // Epic drop
    // Add more items with sellValue...
};
const VENDOR_DATA = {
    'starhaven_kiosk': { // An ID for this specific vendor kiosk
        name: "Starhaven Trade Kiosk",
        // inventory: [ 'item_id_1', 'item_id_2' ] // We'll add items they SELL later
    }
    // Add more vendors here if needed
};
let currentVendorId = null;
const LOOT_TABLES = {
    'drone_basic': {
        creditsChance: 0.75, creditsMin: 5, creditsMax: 20,
        itemDropChance: 0.40, maxItemDrops: 1,
        rarityChances: { common: 0.80, uncommon: 0.20, rare: 0.00, epic: 0.00, legendary: 0.00 }, // Adjusted chances
        itemPools: {
            common: ['scrap_metal', 'basic_wiring', 'ammo_clip_standard'],
            uncommon: ['iron_ring', 'basic_gloves'] // Added gloves here
        }
    },
    'mutant_scav': { // Example for another enemy
        creditsChance: 0.60, creditsMin: 10, creditsMax: 35,
        itemDropChance: 0.55, maxItemDrops: 2, // Can drop up to 2 items
        rarityChances: { common: 0.70, uncommon: 0.28, rare: 0.02, epic: 0.00, legendary: 0.00 },
        itemPools: {
            common: ['scrap_metal', 'basic_wiring'],
            uncommon: ['worn_leather_cap', 'iron_ring'],
            rare: ['starter_mace'] // Can rarely drop mace
        }
    },
    'alpha_drone_commander': { // Boss table
         creditsChance: 1.0, creditsMin: 100, creditsMax: 250,
         itemDropChance: 1.0, maxItemDrops: 3,
         rarityChances: { common: 0.10, uncommon: 0.60, rare: 0.28, epic: 0.02, legendary: 0.00 }, // Better chance for rare/epic
         itemPools: {
             common: ['scrap_metal', 'basic_wiring'],
             uncommon: ['worn_leather_cap', 'reinforced_chestplate', 'iron_ring'],
             rare: ['commander_targeting_module', 'starter_mace'], // Specific boss drop + weapon
             epic: ['advanced_power_core']
         }
    },
    'mutant_overseer': { /* Define loot */},
    'mutant_brute': { /* Define loot */},
    'mech_sentry': { /* Define loot */}
    // Add tables for other enemies...
};

const ATTACK_DEFINITIONS = {
    'basic_strike': {
        id: 'basic_strike', name: 'Basic Strike', tags: ['ATTACK', 'SINGLE_TARGET', 'MELEE'], level: 1, maxLevel: 1,
        description: "A quick, direct melee strike against a single target.", cost: 0, costType: 'MANA',
        attackSpeedMultiplier: 1.0, weaponDamageMultiplier: 0.85, effectiveness: 1.0, aoe: null, scaling: null,
        duration: 150, cooldown: 0, animationName: 'attack', color: 'rgba(200, 200, 200, 0.5)'
    },
    'juggernaut_cleave': {
        id: 'juggernaut_cleave', name: 'Cleave', tags: ['ATTACK', 'AOE', 'MELEE'], level: 1, maxLevel: 20,
        description: "A sweeping melee attack hitting multiple foes in a shape centered on the target.", cost: 7, costType: 'MANA',
        attackSpeedMultiplier: 0.80, weaponDamageMultiplier: 1.0, effectiveness: 1.79, // Scales to 5.11 at L20
        aoe: { type: 'grid_shape', shape: 'rectangle', width: 2, height: 3, targeting: 'centered_on_target', maxTargets: 6 },
        scaling: { costPerLevel: (13 - 7) / 19, effectivenessPerLevel: (5.11 - 1.79) / 19 },
        duration: 300, cooldown: 200, animationName: 'attack', color: 'rgba(255, 255, 255, 0.3)', unlockLevel: 5 // Example only
    },
    'sharpshooter_piercing_shot': {
        id: 'sharpshooter_piercing_shot', name: 'Piercing Shot', tags: ['ATTACK', 'SINGLE_TARGET', 'RANGED'], level: 1, maxLevel: 20,
        description: "A precise shot that deals high damage to a single target.", cost: 10, costType: 'ENERGY',
        attackSpeedMultiplier: 1.0, weaponDamageMultiplier: 1.0, effectiveness: 2.50, aoe: null, scaling: { /* Define scaling */ },
        duration: 100, cooldown: 500, animationName: 'shoot', color: 'rgba(100, 200, 255, 0.8)'
    }
};

const ENEMY_DEFINITIONS = {
    'alpha_drone_commander': { id: 'alpha_drone_commander', name: 'Drone Commander', hp: 250, attack: 15, defense: 10, image: null, xpValue: 120 }, // Boss
    'mutant_overseer': { id: 'mutant_overseer', name: 'Mutant Overseer', hp: 600, attack: 25, defense: 15, image: null, xpValue: 250 }, // Higher level boss
    'mutant_brute': { id: 'mutant_brute', name: 'Mutant Brute', hp: 400, attack: 20, defense: 8, image: null, xpValue: 80 },
    'drone_basic': { id: 'drone_basic', name: 'Scout Drone', hp: 50, attack: 5, defense: 2, image: null, xpValue: 10 },
    'mutant_scav': { id: 'mutant_scav', name: 'Mutant Scavenger', hp: 80, attack: 8, defense: 5, image: null, xpValue: 15 },
    'mech_sentry': { id: 'mech_sentry', name: 'Sentry Bot', hp: 120, attack: 12, defense: 10, image: null, xpValue: 25 }
};

// --- Zone Configurations ---
const ZONE_CONFIG = {
    'landing_zone_alpha': {
        name: 'Landing Zone Alpha',
        gridCols: 1,                      // CHANGED: Only one column
        gridRows: 1,                      // CHANGED: Only one row
        packs: 5,                         // CHANGED: 5 packs of enemies
        bossId: 'alpha_drone_commander',
        unlocksZoneId: 'derelict_station',
        possibleEnemies: ['drone_basic'], // Only Scout Drones in regular packs
        enemyCountMinPerPack: 1,          // Each pack will have exactly one enemy
        enemyCountMaxPerPack: 1           // CHANGED: Max 1 enemy
    },
    'derelict_station': { // This zone will serve as a step up in difficulty
        name: 'Derelict Station',
        gridCols: 4, // Larger grid
        gridRows: 3,
        packs: 3,    // Fewer packs, but more enemies per pack
        bossId: 'mutant_overseer',
        unlocksZoneId: 'asteroid_mine', // Example for future progression
        possibleEnemies: ['mech_sentry', 'mutant_scav', 'drone_basic'], // Mixed enemies
        enemyCountMinPerPack: 2, // CHANGED: At least 2 enemies
        enemyCountMaxPerPack: 4  // CHANGED: Up to 4 enemies
    },
    'asteroid_mine': { // Placeholder for future, if unlocked by derelict_station
        name: 'Asteroid Mine Zeta',
        gridCols: 5,
        gridRows: 4,
        packs: 4,
        bossId: 'mutant_brute', // Example boss
        unlocksZoneId: null, // End of current content example
        possibleEnemies: ['mech_sentry', 'mutant_brute', 'mutant_scav'],
        enemyCountMinPerPack: 3,
        enemyCountMaxPerPack: 5
    },
    'default': { // Fallback zone definition
        name: 'Unknown Zone',
        gridCols: 3,
        gridRows: 3,
        packs: 2,
        bossId: 'mutant_brute', // Default boss if none specified
        unlocksZoneId: null,
        possibleEnemies: Object.keys(ENEMY_DEFINITIONS), // All enemies possible
        enemyCountMinPerPack: 2,
        enemyCountMaxPerPack: 4
    }
};

// --- Ship Upgrade Definitions ---
const SHIP_UPGRADE_DEFINITIONS = {
    'auto_loot_credits_1': {
        id: 'auto_loot_credits_1',
        name: "Credit Auto-Collector Mk1",
        description: "Automatically collects credits dropped by defeated enemies.",
        type: 'automation',
        costCredits: 500,
        costItems: [], // No item cost for this one
        prerequisites: [], // No prerequisites for this first one
        unlocksFeature: 'autoLootCredits',
        icon: null // Placeholder for a future icon path
    },
    'hyperdrive_stabilizer_alpha': { // The "Act 1" progression item
        id: 'hyperdrive_stabilizer_alpha',
        name: "Alpha-Band Hyperdrive Stabilizer",
        description: "Stabilizes hyperdrive fields for travel to more distant sectors. Required to leave the current star cluster.",
        type: 'progression',
        costCredits: 2500,
        costItems: [
            { itemId: 'advanced_power_core', quantity: 1 },
            { itemId: 'commander_targeting_module', quantity: 2 },
            { itemId: 'scrap_metal', quantity: 100 },
            { itemId: 'basic_wiring', quantity: 50 }
        ],
        prerequisites: ['auto_loot_credits_1'], // Example: requires auto-loot first
        unlocksFeature: 'canTravelToNextSector',
        isProgressionItem: true,
        icon: null
    }
    // Add more upgrades later:
    // 'combat_ai_core_1': { name: "Basic Targeting Assist", ... costItems: [{ itemId: 'scrap_metal', quantity: 20}], ... }
};

// --- Default Ship Name ---
const DEFAULT_SHIP_NAME = "The Vagrant"; // Player can name it later maybe

// --- Experience and Leveling ---
// XP needed to go from current level to the NEXT level.
// Index is the current level (e.g., XP_FOR_LEVEL[1] is XP needed to advance from level 1 to level 2)
const XP_FOR_LEVEL = [
    0,  // Placeholder for level 0, effectively unreachable. Level 1 is start.
  100,  // Lvl 1 -> 2
  150,  // Lvl 2 -> 3
  220,  // Lvl 3 -> 4
  330,  // Lvl 4 -> 5
  500,  // Lvl 5 -> 6
  750,  // Lvl 6 -> 7
  1100, // Lvl 7 -> 8
  1600, // Lvl 8 -> 9
  2300, // Lvl 9 -> 10 (Total for 1-10: 7050)
  3200, // Lvl 10 -> 11
  4500, // Lvl 11 -> 12
  6000, // Lvl 12 -> 13
  8000, // Lvl 13 -> 14
  10000,// Lvl 14 -> 15 (Total for 1-15: 38750)
  15000,// Lvl 15 -> 16 (Steeper jump - "Act 1 soft cap" starts here)
  22000,// Lvl 16 -> 17
  30000,// Lvl 17 -> 18
  40000,// Lvl 18 -> 19
  50000,// Lvl 19 -> 20
  // Add more levels as needed, e.g., up to 50 or 100
  // For Act 2, enemies would start giving significantly more XP.
];
const MAX_LEVEL = XP_FOR_LEVEL.length - 1; // Or a defined constant if XP_FOR_LEVEL array is shorter

// --- Mission Definitions ---
const MISSION_DEFINITIONS = {
    // --- MAIN MISSIONS (Act 1 Example) ---
    'main_act1_01_clear_landing_zone': {
        id: 'main_act1_01_clear_landing_zone',
        title: "Secure Landing Zone Alpha",
        type: 'MAIN',
        act: 1,
        description: "Hostile drone activity has been detected in Landing Zone Alpha. Clear out the scout drones and eliminate their commander to secure the area for operations.",
        objectives: [
            { id: 'obj1', text: "Eliminate Scout Drones in Landing Zone Alpha", type: 'KILL_ENEMY', targetId: 'drone_basic', requiredCount: 5 },
            { id: 'obj2', text: "Defeat the Drone Commander", type: 'KILL_ENEMY', targetId: 'alpha_drone_commander', requiredCount: 1 }
        ],
        prerequisites: [], // No prereqs for the first main mission
        rewards: {
            xp: 250,
            credits: 300,
            items: [{ itemId: 'reinforced_chestplate', quantity: 1 }], // Example item reward
            unlocksMission: 'main_act1_02_investigate_derelict' // Unlocks the next main mission
        },
        // giverNPC: 'npc_commander_eva', // Future: NPC who gives the mission
        // turnInNPC: 'npc_commander_eva' // Future: NPC to turn in to
    },
    'main_act1_02_investigate_derelict': {
        id: 'main_act1_02_investigate_derelict',
        title: "The Derelict Signal",
        type: 'MAIN',
        act: 1,
        description: "A faint distress signal has been traced to a derelict station in a nearby asteroid field. Investigate the source. You'll need to clear the 'Derelict Station' zone.",
        objectives: [
            { id: 'obj1', text: "Complete the 'Derelict Station' zone", type: 'COMPLETE_ZONE', targetId: 'derelict_station', requiredCount: 1 }
        ],
        prerequisites: ['main_act1_01_clear_landing_zone'],
        rewards: {
            xp: 500,
            credits: 750,
            unlocksMission: 'main_act1_03_build_hyperdrive_stabilizer' // Leads to ship upgrade mission
        }
    },
    'main_act1_03_build_hyperdrive_stabilizer': { // Final Act 1 Main Mission
        id: 'main_act1_03_build_hyperdrive_stabilizer',
        title: "Path to the Stars",
        type: 'MAIN',
        act: 1,
        description: "To venture beyond this cluster, your ship's hyperdrive needs a critical stabilizer. Gather the necessary components and craft it at your ship's fabricator.",
        objectives: [
            { id: 'obj1', text: "Craft the Alpha-Band Hyperdrive Stabilizer", type: 'CRAFT_SHIP_UPGRADE', targetId: 'hyperdrive_stabilizer_alpha', requiredCount: 1 }
        ],
        prerequisites: ['main_act1_02_investigate_derelict'],
        rewards: {
            xp: 1000,
            credits: 1500,
            // The "reward" is also enabling travel to Act 2, handled by the upgrade's 'unlocksFeature'
            // No items here, the crafted item is the goal
        }
    },

    // --- SIDE MISSIONS (Act 1 Example) ---
    'side_act1_drone_cull_1': {
        id: 'side_act1_drone_cull_1',
        title: "Drone Cull: Landing Zone",
        type: 'SIDE',
        act: 1,
        description: "The initial drone presence in Landing Zone Alpha was higher than anticipated. Thin out their numbers further.",
        objectives: [
            { id: 'obj1', text: "Eliminate Scout Drones in Landing Zone Alpha", type: 'KILL_ENEMY', targetId: 'drone_basic', requiredCount: 15 }
        ],
        prerequisites: ['main_act1_01_clear_landing_zone'], // Becomes available after first main mission
        rewards: {
            xp: 100,
            credits: 150,
            items: [{ itemId: 'scrap_metal', quantity: 20 }]
        },
        isRepeatable: false // Or true, with cooldown logic later
    },
    'side_act1_scavenger_hunt': {
        id: 'side_act1_scavenger_hunt',
        title: "Scavenger's Bounty",
        type: 'SIDE',
        act: 1,
        description: "Mutant Scavengers in the Derelict Station are hoarding valuable components. Retrieve some for analysis.",
        objectives: [
            { id: 'obj1', text: "Defeat Mutant Scavengers", type: 'KILL_ENEMY', targetId: 'mutant_scav', requiredCount: 8 }
            // Could add a 'COLLECT_ITEM' objective here too, e.g., an item they drop
        ],
        prerequisites: ['main_act1_02_investigate_derelict'],
        rewards: {
            xp: 180,
            credits: 250,
            items: [{ itemId: 'basic_wiring', quantity: 15}]
        }
    }
};

// --- State Variables ---
let selectedCharacterId = null;
let selectedCharacterName = null;
let selectedCharacterElement = null;
let currentCharacterData = null;
let selectedSkillForAssignment = null;
let selectedSlotElementForAssignment = null;
let selectedZoneId = null;
let currentEnemies = [];
let gridState = [];
let isSellModeActive = false;
let itemsToSellIndices = []; // Stores ORIGINAL indices of items selected for sale from currentCharacterData.inventory


// --- Combat State Variables ---
let isCombatActive = false;
let combatLoopRequestId = null;
let gameTime = 0;
let lastAttackedTargetId = null;
let activeZoneId = null;
let currentPackIndex = 0;
let totalPacksInZone = 0;
let isBossEncounter = false;
let activeRepeatSkillId = null;
let activeRepeatTargetId = null;
let keysDown = {};
const PLAYER_STATS_PLACEHOLDER = {
    maxHp: 150, currentHp: 150, maxMana: 100, currentMana: 100, manaRegen: 1,
    weaponDamageMin: 10, weaponDamageMax: 15
};

// Skill Bar State
const skillBar = { slots: [ { id: 'skill-1', key: '1', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, { id: 'skill-2', key: '2', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, { id: 'skill-3', key: '3', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, { id: 'skill-4', key: '4', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, { id: 'skill-LMB', key: 'LMB', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, { id: 'skill-RMB', key: 'RMB', skillId: null, cooldownUntil: 0, cooldownStart: 0 }, ]};
const contextMenu = document.getElementById('item-context-menu');

// --- Helper Functions ---
function clearLoginMessages() { if (loginFeedback) loginFeedback.textContent = ''; if (loginError) loginError.textContent = ''; }
function clearErrors() { clearLoginMessages(); if (charSelectError) charSelectError.textContent = ''; if (charCreateError) charCreateError.textContent = ''; }
function displayError(element, message) { if (element) element.textContent = message; console.warn("Msg:", message); }
/**
 * Populates and positions the custom context menu based on the clicked item.
 * @param {object} itemInstance The item data instance.
 * @param {'inventory' | 'equipment'} sourceType
 * @param {number | string} sourceId Inventory index or equipment slot name.
 * @param {number} clickX Click X coordinate.
 * @param {number} clickY Click Y coordinate.
 */
function populateContextMenu(itemInstance, sourceType, sourceId, clickX, clickY) {
    if (!contextMenu) return;
    const ul = contextMenu.querySelector('ul') || contextMenu.appendChild(document.createElement('ul')); // Ensure ul exists
    ul.innerHTML = ''; // Clear previous items

    const options = []; // Array to hold { text: '...', action: () => {...} }

    // --- Generate Options Based on Source ---
    if (sourceType === 'equipment') {
        // Option: Unequip
        options.push({
            text: "Unequip",
            action: () => {
                performUnequip(itemInstance, String(sourceId)); // sourceId is slotName
            }
        });
    }
    else if (sourceType === 'inventory') {
        const itemDefinition = ITEM_DEFINITIONS[itemInstance.id];
        if (itemDefinition?.slot) { // Check if item is equippable
            itemDefinition.slot.forEach(compatibleSlotName => {
                const currentlyEquippedItem = currentCharacterData.equipped[compatibleSlotName];

                if (currentlyEquippedItem) {
                    // Option: Swap with equipped item
                    options.push({
                        text: `Swap with ${currentlyEquippedItem.name} (${compatibleSlotName})`,
                        action: () => {
                            // performEquip handles the swap logic when target slot is occupied
                            performEquip(itemInstance, Number(sourceId), compatibleSlotName); // sourceId is index
                        }
                    });
                } else {
                    // Option: Equip to empty slot
                    options.push({
                        text: `Equip to ${compatibleSlotName}`,
                        action: () => {
                            performEquip(itemInstance, Number(sourceId), compatibleSlotName); // sourceId is index
                        }
                    });
                }
            });
        }
         // TODO: Add other inventory actions later (Drop, Use, etc.)
    }

    // --- Build and Show Menu ---
    if (options.length === 0) {
        console.log("No valid context menu actions for this item.");
        return; // Don't show empty menu
    }

    options.forEach(option => {
        const li = document.createElement('li');
        li.textContent = option.text;
        li.addEventListener('click', () => {
            option.action(); // Execute the action
            hideContextMenu(); // Hide menu after action
        });
        ul.appendChild(li);
    });

    // Position Menu (adjust so it stays within viewport)
    contextMenu.style.left = `${clickX}px`;
    contextMenu.style.top = `${clickY}px`;
    contextMenu.classList.remove('hidden');

    // Check if menu goes off-screen and adjust
    const menuRect = contextMenu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - menuRect.width - 5}px`; // Move left
    }
    if (menuRect.bottom > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - menuRect.height - 5}px`; // Move up
    }
     if (menuRect.left < 0) contextMenu.style.left = '5px';
     if (menuRect.top < 0) contextMenu.style.top = '5px';
}

// Add global listeners to hide the menu
document.addEventListener('click', handleGlobalClickForMenu);
document.addEventListener('keydown', handleEscapeKeyForMenu);

/**
 * Handles the right-click event on inventory or equipment slots.
 * @param {MouseEvent} event The contextmenu event.
 * @param {'inventory' | 'equipment'} sourceType Where the click originated.
 * @param {number | string} sourceId The inventory index or equipment slot name.
 */
function handleContextMenu(event, sourceType, sourceId) {
    event.preventDefault(); // Prevent default browser right-click menu
    hideContextMenu(); // Hide any previous menu

    if (!currentCharacterData) return;

    console.log(`Context menu requested: Type=${sourceType}, ID=${sourceId}`);

    let itemInstance = null;

    // Retrieve the item instance based on source
    try {
        if (sourceType === 'inventory') {
            const numericSourceId = Number(sourceId);
            if (!isNaN(numericSourceId) && numericSourceId >= 0 && numericSourceId < currentCharacterData.inventory.length) {
                itemInstance = currentCharacterData.inventory[numericSourceId];
            }
        } else if (sourceType === 'equipment') {
            const stringSourceId = String(sourceId);
            if (currentCharacterData.equipped[stringSourceId]) {
                itemInstance = currentCharacterData.equipped[stringSourceId];
            }
        }
    } catch (e) {
         console.error("Error getting item for context menu:", e);
    }


    if (!itemInstance) {
        console.log("No item found at source for context menu.");
        return; // Don't show menu for empty slots
    }

    // Populate and show the menu
    populateContextMenu(itemInstance, sourceType, sourceId, event.clientX, event.clientY);
}
/**
 * Helper function to update the 'Sell Selected' button text (showing only credits)
 * and its enabled/disabled state based on selected items and sell mode.
 */
/**
 * Global click listener to hide context menu when clicking outside.
 * @param {MouseEvent} event
 */
function handleGlobalClickForMenu(event) {
    if (contextMenu && !contextMenu.classList.contains('hidden')) {
        // Check if the click was outside the menu
        if (!contextMenu.contains(event.target)) {
            hideContextMenu();
        }
    }
}
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.classList.add('hidden');
        const ul = contextMenu.querySelector('ul');
        if (ul) ul.innerHTML = ''; // Clear previous options
    }
}
/**
 * Global keydown listener to hide context menu on Escape key.
 * @param {KeyboardEvent} event
 */
function handleEscapeKeyForMenu(event) {
    if (event.key === 'Escape' && contextMenu && !contextMenu.classList.contains('hidden')) {
        hideContextMenu();
    }
}
function updateSellButtonState() {
    const sellButton = document.getElementById('sell-selected-button');
    if (!sellButton || !currentCharacterData) return; // Exit if button or data is missing

    let totalValue = 0;
    const itemCount = itemsToSellIndices.length; // Still need the count to determine if button should be enabled

    // Calculate total sell value of selected items
    itemsToSellIndices.forEach(index => {
        // Make sure the index is valid before accessing the inventory item
        if (index >= 0 && index < currentCharacterData.inventory.length) {
            const item = currentCharacterData.inventory[index];
            if (item && item.sellValue) {
                totalValue += item.sellValue;
            }
        } else {
            console.warn(`Invalid index (${index}) found in itemsToSellIndices during sell button update.`);
        }
    });

    // --- Update Button Text ---
    // Only show the total credit value
    sellButton.textContent = `Sell Selected (${totalValue} Cr)`;
    // --------------------------

    // Disable button if no items are selected OR if sell mode is not active
    sellButton.disabled = itemCount === 0 || !isSellModeActive;

    // Add/remove visual cue class based on selection and mode
    if (itemCount > 0 && isSellModeActive) {
         sellButton.classList.add('has-items-selected');
    } else {
         sellButton.classList.remove('has-items-selected');
    }
}

function showScreen(screenId) {
    [loginScreen, charSelectScreen, charCreateScreen, townScreen, combatScreen].forEach(s => s?.classList.add('hidden'));
    document.body.classList.remove('game-active');

    let screenToShow = null;
    if (screenId === 'login') screenToShow = loginScreen;
    else if (screenId === 'char-select') screenToShow = charSelectScreen;
    else if (screenId === 'char-create') screenToShow = charCreateScreen;
    else if (screenId === 'town') screenToShow = townScreen;
    else if (screenId === 'combat') screenToShow = combatScreen;

    if (screenToShow) { screenToShow.classList.remove('hidden'); }
    else { console.error("Invalid screen ID:", screenId); loginScreen?.classList.remove('hidden'); }

    if (screenId !== 'char-select') { resetSelectionState(); }
    if (screenId !== 'town' && screenId !== 'combat') { currentCharacterData = null; }
    if (screenId !== 'combat') {
        currentEnemies = []; gridState = []; isCombatActive = false; lastAttackedTargetId = null;
        activeRepeatSkillId = null; activeRepeatTargetId = null; keysDown = {};
    }
    if (screenId !== 'town' || (townNav?.querySelector('.town-nav-button.active')?.dataset.panel !== 'map-panel')) {
         if(screenId !== 'combat') {
            selectedZoneId = null;
            enterZoneButton?.setAttribute('disabled', 'true');
            mapNodeList?.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected'));
         }
    }
}

// (Add with other helper functions)

/**
 * Selects a key from an object based on weighted probabilities.
 * @param {object} chances - An object where keys are outcomes and values are relative weights (probabilities). e.g., { common: 0.7, uncommon: 0.3 }
 * @returns {string|null} The chosen key (outcome) or null if probabilities are invalid or empty.
 */
function chooseWeightedRandom(chances) {
    if (!chances || typeof chances !== 'object') return null;
    let sum = 0;
    const cumulative = [];
    // Calculate cumulative probabilities
    for (const key in chances) {
        if (chances.hasOwnProperty(key) && chances[key] > 0) {
            sum += chances[key];
            cumulative.push({ key: key, max: sum });
        }
    }
    // If total probability is 0 or chances object is empty, return null
    if (sum <= 0) return null;

    // Get random number based on total probability sum
    const rand = Math.random() * sum;

    // Find the corresponding outcome
    for (const item of cumulative) {
        if (rand <= item.max) {
            return item.key;
        }
    }
    return null; // Should not happen if sum > 0, but acts as fallback
}

// NEW FUNCTION BLOCK

/**
 * Calculates loot drops and XP for a defeated enemy.
 * Tracks KILL_ENEMY mission objectives.
 * @param {object} enemyData - The data object of the defeated enemy (should include typeId, xpValue).
 */
async function handleEnemyDeath(enemyData) {
    console.log(`--- handleEnemyDeath START for ${enemyData.name} (Type: ${enemyData.typeId}) ---`);
    const enemyDefinition = ENEMY_DEFINITIONS[enemyData.typeId]; // Get the full definition for XP and ID checks

    if (!enemyDefinition) {
        console.warn(`No enemy definition found for typeId: ${enemyData.typeId}. Cannot process death fully.`);
        return;
    }

    let progressChangedForSave = false; // Flag to determine if Firestore save is needed

    // --- Grant XP ---
    if (enemyDefinition.xpValue > 0 && currentCharacterData.level < MAX_LEVEL) {
        currentCharacterData.experience += enemyDefinition.xpValue;
        addCombatLogMessage(`Gained ${enemyDefinition.xpValue} XP.`);
        console.log(`Gained ${enemyDefinition.xpValue} XP. Current XP: ${currentCharacterData.experience}/${currentCharacterData.xpToNextLevel}`);
        if (checkForLevelUp()) { // checkForLevelUp returns true if level up occurred
            // Level up messages and main UI updates (level, XP bar) are handled inside checkForLevelUp
        }
        updateXpBarDisplay(); // Ensure XP bar is always updated after XP gain
        progressChangedForSave = true;
    }
    // ----------------

    // --- Track Mission Objectives: KILL_ENEMY ---
    if (currentCharacterData && currentCharacterData.activeMissions) {
        for (const missionId in currentCharacterData.activeMissions) {
            const activeMission = currentCharacterData.activeMissions[missionId];
            if (activeMission.status !== 'ACTIVE') continue;

            const missionDef = MISSION_DEFINITIONS[missionId];
            if (!missionDef) continue;

            let missionProgressMade = false;
            for (const objDef of missionDef.objectives) {
                if (objDef.type === 'KILL_ENEMY' && objDef.targetId === enemyData.typeId) {
                    const objectiveProgress = activeMission.objectivesProgress[objDef.id];
                    if (objectiveProgress && !objectiveProgress.isComplete) {
                        objectiveProgress.currentCount = (objectiveProgress.currentCount || 0) + 1;
                        console.log(`Mission '${missionDef.title}' progress: ${objDef.text} (${objectiveProgress.currentCount}/${objDef.requiredCount})`);
                        addCombatLogMessage(`Progress: ${missionDef.title} - ${objDef.text.substring(0,20)}...`);


                        if (objectiveProgress.currentCount >= objDef.requiredCount) {
                            objectiveProgress.isComplete = true;
                            console.log(`Objective '${objDef.text}' for mission '${missionDef.title}' COMPLETED.`);
                        }
                        missionProgressMade = true;
                    }
                }
            }
            if (missionProgressMade) {
                // Check if the entire mission is now complete
                await checkMissionCompletion(missionId); // Make this async if completeMission is async
                progressChangedForSave = true; // Mark that mission data might have changed
            }
        }
    }
    // -----------------------------------------

    // --- Loot Processing ---
    const lootTable = LOOT_TABLES[enemyData.typeId];
    const droppedLootForZoneDisplay = [];
    let autoCollectedCreditsAmount = 0;
    const hasAutoLootCredits = currentCharacterData?.unlockedUpgrades?.includes('auto_loot_credits_1');

    if (lootTable) {
        // Credits
        if (Math.random() < (lootTable.creditsChance ?? 0)) {
            const amount = Math.floor(Math.random() * ((lootTable.creditsMax || 0) - (lootTable.creditsMin || 0) + 1)) + (lootTable.creditsMin || 0);
            if (amount > 0) {
                if (hasAutoLootCredits) {
                    currentCharacterData.currency = (currentCharacterData.currency || 0) + amount;
                    autoCollectedCreditsAmount += amount;
                    addCombatLogMessage(`Auto-collected ${amount} Credits.`);
                    progressChangedForSave = true;
                } else {
                    droppedLootForZoneDisplay.push({ type: 'credits', amount: amount });
                }
            }
        }
        // Items
        if (Math.random() < (lootTable.itemDropChance ?? 0)) {
            const numberOfItems = Math.floor(Math.random() * (lootTable.maxItemDrops || 1)) + 1;
            for (let i = 0; i < numberOfItems; i++) {
                const rarity = chooseWeightedRandom(lootTable.rarityChances);
                if (!rarity) continue;
                const pool = lootTable.itemPools?.[rarity];
                if (!pool || pool.length === 0) continue;
                const itemId = pool[Math.floor(Math.random() * pool.length)];
                const itemBaseData = ITEM_DEFINITIONS[itemId];
                if (!itemBaseData) continue;
                droppedLootForZoneDisplay.push({ type: 'item', itemData: { ...itemBaseData, rarity: itemBaseData.rarity || rarity } });
            }
        }
    } else {
        console.warn(`No loot table found for enemy type: ${enemyData.typeId}`);
    }

    if (droppedLootForZoneDisplay.length > 0) {
        currentZoneLoot.push(...droppedLootForZoneDisplay);
    }
    displayLoot(); // Update loot UI regardless of whether new loot was added (to clear old if empty)

    // --- Save Character Progress (XP, Level, Currency, Missions) ---
    if (progressChangedForSave) {
        try {
            const charRef = doc(db, "characters", currentCharacterData.id);
            await updateDoc(charRef, {
                level: currentCharacterData.level,
                experience: currentCharacterData.experience,
                xpToNextLevel: currentCharacterData.xpToNextLevel,
                currency: currentCharacterData.currency,
                activeMissions: currentCharacterData.activeMissions, // Save mission progress
                completedMissions: currentCharacterData.completedMissions
            });
            console.log("Character progress (XP, Level, Currency, Missions) saved to Firestore.");
        } catch (error) {
            console.error("Failed to save character progress after enemy death:", error);
        }
    }
    console.log(`--- handleEnemyDeath END for ${enemyData.name} ---`);
}

/**
 * Checks if all objectives for a given mission are complete.
 * If so, updates the mission status to 'OBJECTIVES_MET' and triggers a UI refresh.
 * @param {string} missionId The ID of the mission to check.
 */
async function checkMissionCompletion(missionId) {
    if (!currentCharacterData || !currentCharacterData.activeMissions || !currentCharacterData.activeMissions[missionId]) {
        console.warn(`checkMissionCompletion: Mission ${missionId} not active or character data missing.`);
        return false; // Return a boolean indicating if status changed
    }

    const activeMission = currentCharacterData.activeMissions[missionId];
    // Only proceed if the mission is currently 'ACTIVE' and not already 'OBJECTIVES_MET'
    if (activeMission.status !== 'ACTIVE') {
        // console.log(`checkMissionCompletion: Mission ${missionId} is not in 'ACTIVE' state (current: ${activeMission.status}). No check needed.`);
        return false;
    }

    const missionDef = MISSION_DEFINITIONS[missionId];
    if (!missionDef) {
        console.error(`checkMissionCompletion: Definition not found for mission ${missionId}.`);
        return false;
    }

    let allObjectivesComplete = true;
    for (const objDef of missionDef.objectives) {
        const progress = activeMission.objectivesProgress[objDef.id];
        if (!progress || !progress.isComplete) {
            allObjectivesComplete = false;
            break;
        }
    }

    if (allObjectivesComplete) {
        console.log(`All objectives for mission '${missionDef.title}' are now complete! Setting status to OBJECTIVES_MET.`);
        activeMission.status = 'OBJECTIVES_MET'; // Update status
        addCombatLogMessage(`Objectives complete: ${missionDef.title}. Ready to claim rewards.`, 'quest');

        // Save this status change immediately so it persists if player leaves
        try {
            const charRef = doc(db, "characters", currentCharacterData.id);
            await updateDoc(charRef, {
                [`activeMissions.${missionId}.status`]: 'OBJECTIVES_MET' // Update specific mission status
            });
            console.log(`Mission status for '${missionId}' updated to OBJECTIVES_MET in Firestore.`);
        } catch (error) {
            console.error(`Failed to update mission ${missionId} status to OBJECTIVES_MET in Firestore:`, error);
            // Potentially revert local status change if save fails, or handle on next load
            activeMission.status = 'ACTIVE'; // Revert if critical
            return false;
        }

        // If the missions panel is currently active, refresh it to show the "Claim Rewards" button
        if (document.getElementById('missions-panel')?.classList.contains('active')) {
            displayMissionsPanel();
        }
        return true; // Indicated mission status changed
    }
    return false; // No change in overall mission completion status
}

/**
 * Processes a completed mission: grants rewards, updates status, and saves.
 * @param {string} missionId The ID of the completed mission.
 */
async function completeMission(missionId) {
    if (!currentCharacterData || !currentCharacterData.activeMissions || !currentCharacterData.activeMissions[missionId]) {
        console.warn(`completeMission: Mission ${missionId} not active for completion.`);
        return;
    }

    const missionDef = MISSION_DEFINITIONS[missionId];
    if (!missionDef) {
        console.error(`completeMission: Definition not found for mission ${missionId}.`);
        return;
    }

    console.log(`--- Completing Mission: ${missionDef.title} ---`);
    addCombatLogMessage(`Mission Complete: ${missionDef.title}!`, 'success'); // Add 'success' type for styling later

    // --- Grant Rewards ---
    let rewardsGivenMessage = ["Rewards:"];
    let progressChangedForSave = false;

    // XP
    if (missionDef.rewards.xp > 0) {
        currentCharacterData.experience = (currentCharacterData.experience || 0) + missionDef.rewards.xp;
        rewardsGivenMessage.push(`${missionDef.rewards.xp} XP`);
        progressChangedForSave = true;
        console.log(`Granted ${missionDef.rewards.xp} XP.`);
    }
    // Credits
    if (missionDef.rewards.credits > 0) {
        currentCharacterData.currency = (currentCharacterData.currency || 0) + missionDef.rewards.credits;
        rewardsGivenMessage.push(`${missionDef.rewards.credits} Credits`);
        progressChangedForSave = true;
        console.log(`Granted ${missionDef.rewards.credits} Credits.`);
    }
    // Items
    if (missionDef.rewards.items && missionDef.rewards.items.length > 0) {
        let itemsAddedSuccessfully = true;
        missionDef.rewards.items.forEach(itemReward => {
            const itemBase = ITEM_DEFINITIONS[itemReward.itemId];
            if (!itemBase) {
                console.warn(`Reward item definition not found: ${itemReward.itemId}`);
                return; // Skip this reward item
            }
            // Simplified item adding - assumes non-stackable reward items or new stacks
            // TODO: Enhance with proper stacking logic from pickupLootItem if rewards can be large stacks
            if (currentCharacterData.inventory.length < (currentCharacterData.inventorySize || 60)) {
                let quantityToAdd = itemReward.quantity || 1;
                // For now, add as separate entries or find first stack (basic)
                let existingStack = null;
                if(itemBase.stackable) {
                    existingStack = currentCharacterData.inventory.find(invItem => invItem.id === itemBase.id && (invItem.quantity < (itemBase.maxStack || 50)));
                }

                if (existingStack) {
                    const canAdd = (itemBase.maxStack || 50) - existingStack.quantity;
                    const actualAdd = Math.min(quantityToAdd, canAdd);
                    existingStack.quantity += actualAdd;
                    quantityToAdd -= actualAdd;
                }
                if (quantityToAdd > 0) { // If still items to add (or wasn't stackable/no existing stack)
                     for(let i = 0; i < quantityToAdd; i++){ // Add remaining as new stacks (or individual non-stackables)
                         if(currentCharacterData.inventory.length < (currentCharacterData.inventorySize || 60)){
                            currentCharacterData.inventory.push({ ...itemBase, quantity: 1 }); // Add as single item/stack start
                         } else {
                             itemsAddedSuccessfully = false;
                             rewardsGivenMessage.push(`(Inventory Full for some ${itemBase.name})`);
                             console.warn(`Inventory full, could not add all ${itemBase.name}`);
                             break;
                         }
                     }
                }
                if(itemsAddedSuccessfully) rewardsGivenMessage.push(`${itemReward.quantity}x ${itemBase.name}`);
                progressChangedForSave = true;
            } else {
                itemsAddedSuccessfully = false;
                rewardsGivenMessage.push(`(Inventory Full for ${itemBase.name})`);
                console.warn(`Inventory full, could not add reward: ${itemBase.name}`);
            }
        });
         console.log("Granted items (check inventory).");
    }

    if (rewardsGivenMessage.length > 1) {
        addCombatLogMessage(rewardsGivenMessage.join(' '), 'reward');
    }

    // Check for level up after XP reward
    if (missionDef.rewards.xp > 0) {
        if(checkForLevelUp()) progressChangedForSave = true;
        updateXpBarDisplay();
    }
    // Update town currency if it changed and town is visible
    if (missionDef.rewards.credits > 0 && townCurrency && townScreen && !townScreen.classList.contains('hidden')) {
        townCurrency.textContent = currentCharacterData.currency;
    }

    // --- Update Mission Status ---
    delete currentCharacterData.activeMissions[missionId]; // Remove from active
    if (!currentCharacterData.completedMissions.includes(missionId)) {
        currentCharacterData.completedMissions.push(missionId);
    }
    console.log(`Mission '${missionDef.title}' moved to completed.`);
    progressChangedForSave = true;

    // --- Unlock Next Mission (if any) ---
    if (missionDef.rewards.unlocksMission) {
        const nextMissionId = missionDef.rewards.unlocksMission;
        const nextMissionDef = MISSION_DEFINITIONS[nextMissionId];
        if (nextMissionDef && !currentCharacterData.activeMissions[nextMissionId] && !currentCharacterData.completedMissions.includes(nextMissionId)) {
            currentCharacterData.activeMissions[nextMissionId] = {
                missionId: nextMissionId,
                status: 'ACTIVE',
                objectivesProgress: {}
            };
            nextMissionDef.objectives.forEach(objDef => {
                currentCharacterData.activeMissions[nextMissionId].objectivesProgress[objDef.id] = {
                    currentCount: 0,
                    isComplete: false
                };
            });
            console.log(`Unlocked new mission: ${nextMissionDef.title}`);
            addCombatLogMessage(`New Mission Available: ${nextMissionDef.title}`, 'quest');
            progressChangedForSave = true;
        }
    }
    // TODO: Handle other unlock types (unlocksZone, unlocksUpgrade)

    // --- Save All Changes ---
    if (progressChangedForSave) {
        try {
            const charRef = doc(db, "characters", currentCharacterData.id);
            await updateDoc(charRef, {
                level: currentCharacterData.level,
                experience: currentCharacterData.experience,
                xpToNextLevel: currentCharacterData.xpToNextLevel,
                currency: currentCharacterData.currency,
                inventory: currentCharacterData.inventory,
                activeMissions: currentCharacterData.activeMissions,
                completedMissions: currentCharacterData.completedMissions,
                unlockedZones: currentCharacterData.unlockedZones, // If zones were unlocked
                unlockedUpgrades: currentCharacterData.unlockedUpgrades // If upgrades were unlocked
            });
            console.log("Character data saved after mission completion.");
        } catch (error) {
            console.error("Failed to save character data after mission completion:", error);
        }
    }

    // --- Refresh UI if specific panels are active ---
    if (document.getElementById('missions-panel')?.classList.contains('active')) {
        displayMissionsPanel();
    }
    if (document.getElementById('station-panel')?.classList.contains('active')) { // If ship upgrades panel was affected
        displayShipPanel();
    }
    // Town header level/currency/xp already updated by checkForLevelUp or directly
    console.log(`--- Mission ${missionDef.title} Completion Processed ---`);
}

// Add near other UI helper functions
const zoneCompletionOverlay = document.getElementById('zone-completion-overlay');

function showZoneCompletionOptions(show = true) {
    if (zoneCompletionOverlay) {
        zoneCompletionOverlay.classList.toggle('hidden', !show);
    }
}
/**
 * Updates the XP bar display (both town and combat if they exist)
 * based on currentCharacterData.
 */
/**
 * Updates the XP bar display (both town and combat if they exist)
 * including the "Lvl X" prefix, based on currentCharacterData.
 */
function updateXpBarDisplay() {
    // Town XP Bar Elements
    const townXpBarFill = document.getElementById('xp-bar-fill');
    const townXpBarText = document.getElementById('xp-bar-text');
    const townXpLevelPrefix = document.getElementById('town-xp-bar-level'); // New span for Lvl in town

    // Combat XP Bar Elements
    const combatXpBarFill = document.getElementById('combat-xp-bar-fill');
    const combatXpBarText = document.getElementById('combat-xp-bar-text');
    const combatXpLevelPrefix = document.getElementById('combat-xp-bar-level'); // New span for Lvl in combat

    // Default values if character data isn't loaded
    let fillPercent = 0;
    let xpTextContent = "XP: --/--";
    let levelTextContent = "--";

    if (currentCharacterData) { // Ensure character data is loaded
        levelTextContent = currentCharacterData.level || "1"; // Get current level

        if (currentCharacterData.level >= MAX_LEVEL) {
            fillPercent = 100;
            xpTextContent = "MAX LEVEL";
        } else {
            const xpForNext = (currentCharacterData.xpToNextLevel > 0) ? currentCharacterData.xpToNextLevel : 1;
            const currentXP = currentCharacterData.experience || 0;
            fillPercent = (currentXP / xpForNext) * 100;
            xpTextContent = `XP: ${currentXP} / ${currentCharacterData.xpToNextLevel}`;
        }
    }

    const clampedFillWidth = `${Math.max(0, Math.min(100, fillPercent))}%`;

    // Update Town XP Bar
    if (townXpLevelPrefix) {
        townXpLevelPrefix.textContent = levelTextContent;
    }
    if (townXpBarFill) {
        townXpBarFill.style.width = clampedFillWidth;
    }
    if (townXpBarText) {
        townXpBarText.textContent = xpTextContent;
    }

    // Update Combat XP Bar
    if (combatXpLevelPrefix) {
        combatXpLevelPrefix.textContent = levelTextContent;
    }
    if (combatXpBarFill) {
        combatXpBarFill.style.width = clampedFillWidth;
    }
    if (combatXpBarText) {
        combatXpBarText.textContent = xpTextContent;
    }
}
/**
 * Renders the currentZoneLoot into the right placeholder card UI.
 */
// Modify displayLoot
function performEquip(itemToEquipInstance, sourceInventoryIndex, targetSlotName) {
    // Ensure we use a deep copy to avoid modification issues if it came from equip slot later
    const itemToEquip = JSON.parse(JSON.stringify(itemToEquipInstance));

    console.log(`ACTION: Equip ${itemToEquip.name} from Inv[${sourceInventoryIndex}] to Equip[${targetSlotName}]`);

    // --- Validation ---
    const itemDefinition = ITEM_DEFINITIONS[itemToEquip.id];
    if (!itemDefinition?.slot?.includes(targetSlotName)) {
        console.warn(`Equip failed: Compatibility check. ${itemToEquip.name} -> ${targetSlotName}`);
        displayPanelError('inventory-panel', "Cannot equip this item in that slot."); // Show UI error
        return;
    }
    // TODO: Other checks (level, stats)

    // --- Logic ---
    const itemCurrentlyEquipped = currentCharacterData.equipped[targetSlotName] || null;
    let canProceed = true;
    let itemRemovedFromInventory = null;

    // 1. Handle removing item from inventory source slot
    const sourceInvItem = currentCharacterData.inventory[sourceInventoryIndex];
     if(!sourceInvItem || sourceInvItem.id !== itemToEquip.id){
        console.error("Equip Error: Source inventory item mismatch!");
        displayPanelError('inventory-panel', "Error processing equip source.");
        return;
     }
     if(sourceInvItem.quantity > 1) {
        sourceInvItem.quantity--;
        itemRemovedFromInventory = {...itemToEquip, quantity: 1}; // Equip one
        console.log(` -> Decremented stack for ${itemToEquip.name} in inventory.`);
     } else {
         itemRemovedFromInventory = currentCharacterData.inventory.splice(sourceInventoryIndex, 1)[0];
         console.log(` -> Removed ${itemToEquip.name} from inventory index ${sourceInventoryIndex}.`);
     }
     if (!itemRemovedFromInventory) {
        console.error("Equip Error: Failed to correctly remove item from inventory logic.");
        // Attempt to restore quantity if reduced incorrectly
         if(sourceInvItem && itemToEquip.quantity > 0) sourceInvItem.quantity++;
         displayPanelError('inventory-panel', "Internal error during equip.");
        return;
     }


    // 2. Handle item currently in target slot (move to inventory)
    if (itemCurrentlyEquipped) {
        console.log(` -> Slot occupied by ${itemCurrentlyEquipped.name}. Moving to inventory.`);
        const inventorySize = currentCharacterData.inventorySize || 60;
        let successfullyMovedToInv = false;

        // Check space first (inventory has one less item now)
        if (currentCharacterData.inventory.length < inventorySize) {
            // Try to stack it first
            if (itemCurrentlyEquipped.stackable) {
                const maxStack = ITEM_DEFINITIONS[itemCurrentlyEquipped.id]?.maxStack || 50;
                for(let i=0; i < currentCharacterData.inventory.length; i++){
                     const invItem = currentCharacterData.inventory[i];
                     if(invItem && invItem.id === itemCurrentlyEquipped.id && (invItem.quantity || 0) < maxStack){
                         invItem.quantity = (invItem.quantity || 0) + 1;
                         successfullyMovedToInv = true;
                         console.log(` -> Stacked ${itemCurrentlyEquipped.name} back into inventory.`);
                         break;
                     }
                }
            }
            // If not stacked, add as new item
            if(!successfullyMovedToInv) {
                 // Ensure quantity is 1 when coming from equip slot
                 itemCurrentlyEquipped.quantity = 1;
                 currentCharacterData.inventory.push(itemCurrentlyEquipped);
                 successfullyMovedToInv = true;
                 console.log(` -> Added ${itemCurrentlyEquipped.name} as new item to inventory.`);
            }
            if (!successfullyMovedToInv) { // Should be unreachable if length check is correct
                 console.error("Equip Error: Failed to move equipped item to inventory even with space.");
                 canProceed = false;
                 // Rollback: Put itemRemovedFromInventory back to original slot/stack
                 if (itemRemovedFromInventory.quantity === 1 && itemToEquip.quantity > 0) {
                     sourceInvItem.quantity++; // Increment stack back
                 } else {
                     currentCharacterData.inventory.splice(sourceInventoryIndex, 0, itemRemovedFromInventory); // Insert back
                 }
            }
        } else { // Inventory full
            console.warn(`Equip failed: Inventory full. Cannot unequip ${itemCurrentlyEquipped.name}.`);
            canProceed = false;
             // Rollback: Put itemRemovedFromInventory back
             if (itemRemovedFromInventory.quantity === 1 && itemToEquip.quantity > 0) {
                 sourceInvItem.quantity++;
             } else {
                 currentCharacterData.inventory.splice(sourceInventoryIndex, 0, itemRemovedFromInventory);
             }
             displayPanelError('inventory-panel', `Inventory full! Cannot unequip ${itemCurrentlyEquipped.name}.`);
        }
    }

    // 3. Place new item in target slot if possible
    if (canProceed) {
        currentCharacterData.equipped[targetSlotName] = itemRemovedFromInventory;
        console.log(` -> Successfully equipped ${itemToEquip.name} to ${targetSlotName}.`);
        saveEquipmentAndInventory(); // Save changes
    } else {
         console.log("Equip operation could not proceed or was rolled back.");
    }

    // --- Refresh UI ---
    // REMOVED setTimeout wrapper
    console.log(`Calling displayInventoryPanel directly inside performEquip`);
    displayInventoryPanel();
    // ------------------
}
function performUnequip(itemToUnequipInstance, sourceSlotName) {
    // Use a deep copy
    const itemToUnequip = JSON.parse(JSON.stringify(itemToUnequipInstance));

   console.log(`ACTION: Unequip ${itemToUnequip.name} from Equip[${sourceSlotName}] to Inventory`);

   // --- Validation & Logic ---
   const inventorySize = currentCharacterData.inventorySize || 60;
   let canProceed = false;
   let targetInventoryIndex = -1; // Track if stacking

    // Check for stack
    if (itemToUnequip.stackable) {
        const maxStack = ITEM_DEFINITIONS[itemToUnequip.id]?.maxStack || 50;
        for(let i = 0; i < currentCharacterData.inventory.length; i++){
           const invItem = currentCharacterData.inventory[i];
           if(invItem && invItem.id === itemToUnequip.id && (invItem.quantity || 0) < maxStack) {
               canProceed = true;
               targetInventoryIndex = i;
               break;
           }
        }
    }
    // Check for empty slot if not stacking
    if (!canProceed && currentCharacterData.inventory.length < inventorySize) {
        canProceed = true;
    }

   // --- Perform Action ---
   if (canProceed) {
       // Remove from equipped
       delete currentCharacterData.equipped[sourceSlotName];
       console.log(` -> Removed ${itemToUnequip.name} from ${sourceSlotName}.`);

       // Add to inventory (stack or new)
       if (targetInventoryIndex !== -1) {
           currentCharacterData.inventory[targetInventoryIndex].quantity = (currentCharacterData.inventory[targetInventoryIndex].quantity || 0) + 1;
           console.log(` -> Stacked ${itemToUnequip.name}. New quantity: ${currentCharacterData.inventory[targetInventoryIndex].quantity}`);
       } else {
           itemToUnequip.quantity = 1; // Ensure quantity 1
           currentCharacterData.inventory.push(itemToUnequip);
           console.log(` -> Added ${itemToUnequip.name} to inventory.`);
       }
       saveEquipmentAndInventory(); // Save changes
   } else {
        console.warn(`Unequip failed: Inventory full.`);
        displayPanelError('inventory-panel', "Inventory full! Cannot unequip item.");
   }

    // --- Refresh UI ---
    // REMOVED setTimeout wrapper
    console.log(`Calling displayInventoryPanel directly inside performUnequip`);
    displayInventoryPanel();
    // ------------------
}
function performSwap(itemBeingDraggedInstance, sourceSlotName, targetSlotName) {
    // Use deep copies
    const draggedItemData = JSON.parse(JSON.stringify(itemBeingDraggedInstance));

     console.log(`ACTION: Swap ${draggedItemData.name} from Equip[${sourceSlotName}] with item in Equip[${targetSlotName}]`);

    const itemInTargetSlot = currentCharacterData.equipped[targetSlotName] ? JSON.parse(JSON.stringify(currentCharacterData.equipped[targetSlotName])) : null;

    // --- Validation ---
     const draggedItemDef = ITEM_DEFINITIONS[draggedItemData.id];
     if (!draggedItemDef?.slot?.includes(targetSlotName)) {
         console.warn(`Swap Failed: ${draggedItemData.name} cannot go into ${targetSlotName}.`);
          displayPanelError('inventory-panel', `${draggedItemData.name} cannot go into ${targetSlotName}.`);
         return;
     }
     if (itemInTargetSlot) {
        const targetItemDef = ITEM_DEFINITIONS[itemInTargetSlot.id];
        if (!targetItemDef?.slot?.includes(sourceSlotName)) {
             console.warn(`Swap Failed: ${itemInTargetSlot.name} cannot go into ${sourceSlotName}.`);
             displayPanelError('inventory-panel', `${itemInTargetSlot.name} cannot go into ${sourceSlotName}.`);
             return;
        }
     }
     // TODO: Other checks (2H weapon conflicts?)

     // --- Perform Swap ---
     console.log(` -> Swapping ${draggedItemData.name} with ${itemInTargetSlot ? itemInTargetSlot.name : 'Empty Slot'}.`);
     currentCharacterData.equipped[targetSlotName] = draggedItemData; // Item from source goes to target
     if(itemInTargetSlot) {
        currentCharacterData.equipped[sourceSlotName] = itemInTargetSlot; // Item from target goes to source
     } else {
         delete currentCharacterData.equipped[sourceSlotName]; // Source slot becomes empty
     }

      saveEquipmentAndInventory(); // Save changes

      // --- Refresh UI ---
      // REMOVED setTimeout wrapper
      console.log(`Calling displayInventoryPanel directly inside performSwap`);
      displayInventoryPanel();
      // ------------------
}
function displayPanelError(panelId, message) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    // Use a consistent class for panel-specific errors
    let errorDiv = panel.querySelector('.panel-error-display');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        // Use base error message styles + a specific class for targeting
        errorDiv.className = 'error-message panel-error-display';
        errorDiv.style.marginBottom = '1rem'; // Add some space below
        // Insert after the panel title if possible
        const title = panel.querySelector('.panel-title');
        if (title) {
            title.parentNode.insertBefore(errorDiv, title.nextSibling);
        } else {
            panel.prepend(errorDiv); // Otherwise prepend to panel
        }
    }
    errorDiv.textContent = message;
    console.warn(`Panel Error (${panelId}): ${message}`); // Also log it

    // Optional: Auto-clear the message after a while
    // setTimeout(() => { if(errorDiv) errorDiv.textContent = ''; }, 7000);
}
function displayLoot() {
    console.log(`--- displayLoot CALLED. Items/Credits: ${currentZoneLoot.filter(Boolean).length} ---`);
    const lootContainer = document.getElementById('right-placeholder-card');
    if (!lootContainer) return;

    lootContainer.innerHTML = ''; // Clear previous
    lootContainer.style.alignItems = 'flex-start';
    lootContainer.style.justifyContent = 'flex-start';
    lootContainer.style.padding = '0.5rem';

    const actualLootEntries = currentZoneLoot.filter(Boolean);

    if (actualLootEntries.length === 0) {
        lootContainer.innerHTML = '<p>Loot / Map Area</p>'; // Restore placeholder
        lootContainer.style.alignItems = 'center';
        lootContainer.style.justifyContent = 'center';
        return;
    }

    const lootList = document.createElement('ul');
    lootList.id = 'loot-list';
    lootList.style.cssText = 'list-style:none; padding:0; margin:0; width:100%; display: flex; flex-direction: column; gap: 0.3rem;'; // Added flex gap

    currentZoneLoot.forEach((loot, index) => {
        if (!loot) return; // Skip already picked up

        const listItem = document.createElement('li');
        listItem.className = 'loot-item';
        listItem.style.cssText = `
            padding: 0.3rem 0.5rem; border-radius: 4px;
            cursor: pointer; background-color: rgba(50, 60, 75, 0.7);
            font-size: 0.8rem; border: 1px solid #4b5563;
            transition: background-color 0.2s, border-color 0.2s;
        `;
        listItem.dataset.lootIndex = index;

        // --- Clear potential old listeners ---
        listItem.removeEventListener('click', handleCreditLootClick);
        listItem.removeEventListener('click', handleLootItemClick);
        listItem.removeEventListener('mouseover', handleLootItemMouseOver);
        listItem.removeEventListener('mouseout', handleLootItemMouseOut);
        listItem.removeEventListener('mousemove', handleLootItemMouseMove);
        // ------------------------------------


        if (loot.type === 'credits') {
            listItem.textContent = `${loot.amount} Credits`;
            listItem.style.color = '#facc15';
            listItem.style.fontWeight = 'bold';
            listItem.addEventListener('click', handleCreditLootClick);
            // No tooltip needed for credits
        }
        else if (loot.type === 'item' && loot.itemData) {
            const item = loot.itemData;
            listItem.dataset.itemData = JSON.stringify(item); // Store data for tooltip
            listItem.textContent = item.name || 'Unknown Item';

            // Style based on rarity (Added specific dataset attributes for easier CSS styling)
            const rarity = item.rarity?.toLowerCase() || 'common';
            listItem.dataset.rarity = rarity; // Store rarity for CSS
            switch (rarity) {
                case 'uncommon': listItem.style.color = '#63a4ff'; listItem.style.borderColor = '#63a4ff'; break;
                case 'rare': listItem.style.color = '#bf85ff'; listItem.style.borderColor = '#bf85ff'; break;
                case 'epic': listItem.style.color = '#ffa500'; listItem.style.borderColor = '#ffa500'; break;
                case 'legendary': listItem.style.color = '#ff4500'; listItem.style.borderColor = '#ff4500'; break;
                default: listItem.style.color = '#e5e7eb'; break;
            }

            // Add listener specific to items (pickup)
            listItem.addEventListener('click', handleLootItemClick);

            // --- Add tooltip listeners ---
            listItem.addEventListener('mouseover', handleLootItemMouseOver);
            listItem.addEventListener('mouseout', handleLootItemMouseOut); // *** ENSURE THIS IS ADDED ***
            listItem.addEventListener('mousemove', handleLootItemMouseMove);
            // ---------------------------
        } else {
             // Handle potential malformed loot entries
             listItem.textContent = "Invalid Loot Entry";
             listItem.style.color = 'red';
             listItem.style.cursor = 'default';
        }

        listItem.addEventListener('mouseover', () => listItem.style.backgroundColor = 'rgba(75, 85, 99, 0.8)'); // Hover effect
        listItem.addEventListener('mouseout', () => listItem.style.backgroundColor = 'rgba(50, 60, 75, 0.7)'); // Remove hover effect


        lootList.appendChild(listItem);
    });

    lootContainer.appendChild(lootList);
}

// NEW FUNCTION BLOCK

/**
 * Handles clicking on a Credits loot item in the list.
 * @param {Event} event
 */
async function handleCreditLootClick(event) {
    // ---> HIDE TOOLTIP FIRST <---
    // (Even though credits don't show a tooltip, this is good practice
    // in case logic changes or to prevent edge cases if the mouse quickly
    // moved from an item to credits before clicking)
    hideTooltip();
    // --------------------------

    const listItem = event.currentTarget;
    const index = parseInt(listItem.dataset.lootIndex, 10);

    if (isNaN(index) || !currentZoneLoot[index] || currentZoneLoot[index].type !== 'credits') {
        console.warn("Invalid credit loot item clicked or already picked up:", index);
        return;
    }
    if (!currentCharacterData || !auth.currentUser) {
        addCombatLogMessage("Cannot pickup credits: Character data missing.");
        return;
    }

    const lootEntry = currentZoneLoot[index];
    const creditsCollected = lootEntry.amount;

    console.log(`Picking up ${creditsCollected} credits.`);

    // --- Update Player Currency ---
    const currentCurrency = currentCharacterData.currency || 0;
    const newCurrency = currentCurrency + creditsCollected;
    currentCharacterData.currency = newCurrency; // Update local data

    // --- Mark loot as picked up ---
    currentZoneLoot[index] = null; // Remove from loot pool

    // --- Update UI ---
    displayLoot(); // Re-render loot list AFTER hiding tooltip and updating data
    if (townCurrency) townCurrency.textContent = newCurrency; // Update town display if visible
    addCombatLogMessage(`Collected ${creditsCollected} Credits.`);
    // -------------------

    // --- Save Updated Currency to Firestore ---
    try {
        const charRef = doc(db, "characters", currentCharacterData.id);
        await updateDoc(charRef, {
            currency: newCurrency // Save the new total
        });
        console.log("Player currency updated in Firestore.");
    } catch (error) {
        console.error("Failed to save currency update:", error);
        addCombatLogMessage("Error saving currency!");
        // --- Rollback Logic ---
        currentZoneLoot[index] = lootEntry; // Put back if save failed
        currentCharacterData.currency = currentCurrency; // Revert local data
        displayLoot(); // Re-display credits if rolled back
        if (townCurrency) townCurrency.textContent = currentCharacterData.currency; // Revert town display too
        // ---------------------
    }
    // ---------------------------------------
}
/**
 * Handles clicking on a loot item in the list.
 * @param {Event} event
 */
function handleLootItemClick(event) {
    const listItem = event.currentTarget;
    const index = parseInt(listItem.dataset.lootIndex, 10);

    if (!isNaN(index) && currentZoneLoot[index]) {
        pickupLootItem(index);
    }
}
// END OF NEW FUNCTION BLOCK
// NEW FUNCTION BLOCK

/**
 * Attempts to add a loot item to the player's inventory, handling stacking.
 * @param {number} lootIndex - The index of the item in the currentZoneLoot array.
 */
async function pickupLootItem(lootIndex) {
    hideTooltip(); // Hide tooltip before processing

    if (!currentCharacterData || !auth.currentUser) {
        addCombatLogMessage("Cannot pickup loot: Character data missing.");
        return;
    }

    const lootEntry = currentZoneLoot[lootIndex];
    // Ensure loot entry and item data exist
    if (!lootEntry || lootEntry.type !== 'item' || !lootEntry.itemData) {
        console.warn("Invalid loot entry selected for pickup:", lootIndex, lootEntry);
        return;
    }

    // Use a copy of the base item data from the loot entry
    const itemBaseData = { ...lootEntry.itemData };
    console.log(`Attempting to pickup: ${itemBaseData.name}, Stackable: ${itemBaseData.stackable}`);

    // Initialize inventory if it doesn't exist
    if (!Array.isArray(currentCharacterData.inventory)) {
        currentCharacterData.inventory = [];
    }
    const inventorySize = currentCharacterData.inventorySize || 60; // Default size

    let itemSuccessfullyProcessed = false; // Flag to check if item was stacked or added

    // --- Logic for STACKABLE items ---
    if (itemBaseData.stackable) {
        let existingStackFound = false;
        const maxStack = itemBaseData.maxStack || 50; // Use definition's maxStack, default 50

        // Iterate through existing inventory to find a stack with space
        for (let i = 0; i < currentCharacterData.inventory.length; i++) {
            const existingItem = currentCharacterData.inventory[i];
            // Check if it's the same item ID and has room
            if (existingItem && existingItem.id === itemBaseData.id && (existingItem.quantity || 0) < maxStack) {
                existingItem.quantity = (existingItem.quantity || 0) + 1; // Increment quantity
                existingStackFound = true;
                itemSuccessfullyProcessed = true; // Mark as processed
                console.log(`Stacked ${itemBaseData.name}. New quantity: ${existingItem.quantity}`);
                addCombatLogMessage(`Picked up: ${itemBaseData.name} (Stacked)`);
                break; // Important: Stop after adding to the first available stack
            }
        }

        // If no existing stack was found or updated, try adding a NEW stack
        if (!existingStackFound) {
            if (currentCharacterData.inventory.length < inventorySize) {
                // Create a new inventory item instance with quantity 1
                const newItemInstance = { ...itemBaseData, quantity: 1 };
                currentCharacterData.inventory.push(newItemInstance);
                itemSuccessfullyProcessed = true; // Mark as processed
                console.log(`Added new stack of ${itemBaseData.name}.`);
                addCombatLogMessage(`Picked up: ${itemBaseData.name} (New Stack)`);
            } else {
                // Inventory is full, cannot add a new stack
                addCombatLogMessage(`Inventory full! Cannot add new stack of ${itemBaseData.name}.`);
                // Do not proceed further, leave loot on ground
                return; // Exit the function
            }
        }
    }
    // --- Logic for NON-STACKABLE items ---
    else {
        if (currentCharacterData.inventory.length < inventorySize) {
             // Add the item with quantity 1 for consistency
            currentCharacterData.inventory.push({ ...itemBaseData, quantity: 1 });
            itemSuccessfullyProcessed = true; // Mark as processed
            console.log(`Added non-stackable item: ${itemBaseData.name}`);
            addCombatLogMessage(`Picked up: ${itemBaseData.name}`);
        } else {
            // Inventory is full
            addCombatLogMessage(`Inventory full! Cannot pickup ${itemBaseData.name}.`);
             // Do not proceed further, leave loot on ground
            return; // Exit the function
        }
    }

    // --- Proceed only if item was successfully added or stacked ---
    if (itemSuccessfullyProcessed) {
        // Mark loot as picked up from the ground
        currentZoneLoot[lootIndex] = null;

        // Update the loot list UI (remove the picked-up item)
        displayLoot();

        // --- Save Updated Inventory to Firestore ---
        try {
            const charRef = doc(db, "characters", currentCharacterData.id);
            // Save the entire inventory array, which now includes items with quantities
            await updateDoc(charRef, {
                inventory: currentCharacterData.inventory
            });
            console.log("Inventory saved to Firestore after pickup.");
        } catch (error) {
            console.error("Failed to save inventory update after pickup:", error);
            addCombatLogMessage("Error saving inventory!");
            // Implement rollback or notify user of potential desync
            // Simple rollback attempt:
            // currentZoneLoot[lootIndex] = lootEntry; // Put loot back visually (local only)
            // displayLoot(); // Refresh loot display
            // Reverting the inventory change locally is complex and might require a deep copy mechanism.
            // For now, log the error and accept potential local/db difference.
        }
        // ---------------------------------------

    }
    // If item was not processed (e.g., inventory full), we returned earlier,
    // so the loot remains visually on the ground and no save occurs.
}

function updateActionButtonsState() { const sel = selectedCharacterId !== null; if (launchCharButton) launchCharButton.disabled = !sel; if (deleteCharButton) deleteCharButton.disabled = !sel; }
function resetSelectionState() { selectedCharacterId = null; selectedCharacterName = null; if (selectedCharacterElement) { selectedCharacterElement.classList.remove('selected-char'); selectedCharacterElement = null; } if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden'); mapPanel?.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected')); updateActionButtonsState(); }

// --- Authentication Logic ---
if (auth) { setPersistence(auth, browserLocalPersistence).then(() => { console.log("Persistence set."); setupAuthStateListener(); }).catch((e) => { console.error("Persistence error:", e); setupAuthStateListener(); displayError(loginError, "Auto-login failed."); }); } else { console.error("Auth init failed."); displayError(loginError, "Init error."); }
function setupAuthStateListener() { if (!auth) { console.error("Auth listener setup failed."); return; } onAuthStateChanged(auth, (user) => { clearErrors(); resetSelectionState(); if (user) { console.log("User logged in:", user.uid); showScreen('char-select'); loadCharacters(user.uid); } else { console.log("User logged out."); showScreen('login'); currentCharacterData = null; if (loginPasswordInput) loginPasswordInput.value = ''; } }); }

// --- Assign DOM Elements and Attach Listeners after DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Assign DOM Elements
    loginScreen = document.getElementById('login-screen');
    charSelectScreen = document.getElementById('char-select-screen');
    charCreateScreen = document.getElementById('char-create-screen');
    townScreen = document.getElementById('town-screen');
    combatScreen = document.getElementById('combat-screen');
    loginEmailInput = document.getElementById('login-email');
    loginPasswordInput = document.getElementById('login-password');
    loginButton = document.getElementById('login-button');
    registerButton = document.getElementById('register-button');
    loginFeedback = document.getElementById('login-feedback');
    loginError = document.getElementById('login-error');
    resetPasswordButton = document.getElementById('reset-password-button');
    googleSignInButton = document.getElementById('google-signin-button');
    characterListDiv = document.getElementById('character-list');
    charSelectError = document.getElementById('char-select-error');
    launchCharButton = document.getElementById('launch-char-button');
    deleteCharButton = document.getElementById('delete-char-button');
    createNewCharButton = document.getElementById('create-new-char-button');
    logoutButton = document.getElementById('logout-button');
    deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
    deleteConfirmMessage = document.getElementById('delete-confirm-message');
    confirmDeleteButton = document.getElementById('confirm-delete-button');
    cancelDeleteButton = document.getElementById('cancel-delete-button');
    charNameInput = document.getElementById('char-name');
    classSelectionGrid = document.getElementById('class-selection');
    selectedClassInput = document.getElementById('selected-class');
    createButton = document.getElementById('create-button');
    backToSelectButton = document.getElementById('back-to-select-button');
    charCreateError = document.getElementById('char-create-error');
    townHeaderInfo = document.getElementById('town-header-info');
    townCharName = document.getElementById('town-char-name');
    townCharLevel = document.getElementById('town-char-level');
    townCharClass = document.getElementById('town-char-class');
    townCurrency = document.getElementById('town-currency');
    townNav = document.getElementById('town-nav');
    townLogoutButton = document.getElementById('town-logout-button');
    townSwitchCharButton = document.getElementById('town-switch-char-button');
    townMainContent = document.querySelector('.town-main-content');
    overviewPanel = document.getElementById('overview-panel');
    overviewCharName = document.getElementById('overview-char-name');
    inventoryPanel = document.getElementById('inventory-panel');
    inventoryGrid = document.getElementById('inventory-grid');
    mapPanel = document.getElementById('map-panel');
    mapNodeList = document.getElementById('map-node-list');
    enterZoneButton = document.getElementById('enter-zone-button');
    skillsPanel = document.getElementById('skills-panel');
    learnedSkillsList = document.getElementById('learned-skills-list');
    skillAssignmentBar = document.getElementById('skill-assignment-bar');
    combatZoneName = document.getElementById('combat-zone-name');
    exitCombatButton = document.getElementById('exit-combat-button');
    enemyGrid = document.getElementById('enemy-grid');
    playerSkillBarCombat = document.getElementById('player-skill-bar');
    combatLog = document.getElementById('combat-log');
    playerHealthBar = document.getElementById('player-health-bar');
    playerHealthFill = document.getElementById('player-health-fill');
    playerHealthText = document.getElementById('player-health-text');
    playerManaBar = document.getElementById('player-mana-bar');
    playerManaFill = document.getElementById('player-mana-fill');
    playerManaText = document.getElementById('player-mana-text');
    itemTooltip = document.getElementById('item-tooltip');

    // Attach Event Listeners (Non-Combat)
    if (loginButton) { loginButton.addEventListener('click', () => { clearLoginMessages(); const e=loginEmailInput?.value.trim()||''; const p=loginPasswordInput?.value||''; if(!e||!p){displayError(loginError, "Email/Password needed."); return;} loginButton.disabled=true; displayError(loginFeedback,"Logging in..."); signInWithEmailAndPassword(auth,e,p).catch(err=>{console.error("Login Err:",err.code,err.message);let m="Login failed.";if(err.code==='auth/user-not-found'||err.code==='auth/wrong-password'||err.code==='auth/invalid-credential'){m="Invalid email/password.";}else if(err.code==='auth/invalid-email'){m="Invalid email format.";} displayError(loginError, m); }).finally(() => { if(loginButton) loginButton.disabled = false; displayError(loginFeedback, ""); }); }); }
    if (registerButton) { registerButton.addEventListener('click', () => { clearLoginMessages(); const e=loginEmailInput?.value.trim()||''; const p=loginPasswordInput?.value||''; if(!e||!p){displayError(loginError, "Email/Password needed."); return;} if(p.length<6){displayError(loginError,"Password must be >= 6 chars."); return;} registerButton.disabled=true; displayError(loginFeedback,"Registering..."); createUserWithEmailAndPassword(auth,e,p).catch(err=>{console.error("Register Err:",err.code,err.message);let m="Register failed.";if(err.code==='auth/email-already-in-use'){m="Email already registered.";}else if(err.code==='auth/invalid-email'){m="Invalid email format.";}else if(err.code==='auth/weak-password'){m="Password too weak.";}else{m=`Error: ${err.message}`;} displayError(loginError, m); }).finally(() => { if(registerButton) registerButton.disabled = false; displayError(loginFeedback, ""); }); }); }
    if (resetPasswordButton) { resetPasswordButton.addEventListener('click', () => { clearLoginMessages(); const e=loginEmailInput?.value.trim()||''; if(!e){displayError(loginError, "Enter email to reset."); return;} resetPasswordButton.disabled=true; displayError(loginFeedback,"Sending reset email..."); sendPasswordResetEmail(auth,e).then(()=>{displayError(loginFeedback,`Reset email sent to ${e}.`);}).catch(err=>{let m=`Failed: ${err.message}`;if(err.code==='auth/user-not-found'){m="No account found.";} displayError(loginError, m); displayError(loginFeedback,"");}).finally(()=>{if(resetPasswordButton)resetPasswordButton.disabled=false;}); }); }
    if (googleSignInButton) { googleSignInButton.addEventListener('click', () => { clearLoginMessages(); const p = new GoogleAuthProvider(); googleSignInButton.disabled=true; displayError(loginFeedback,"Opening Google..."); signInWithPopup(auth,p).catch(err=>{console.error("Google Err:",err.code,err.message);let m="Google Sign-In failed.";if(err.code==='auth/popup-closed-by-user'){m="Sign-in cancelled.";}else if(err.code==='auth/popup-blocked'){m="Popup blocked.";}else if(err.code==='auth/account-exists-with-different-credential'){m="Account exists with different method.";} displayError(loginError, m);}).finally(()=>{if(googleSignInButton)googleSignInButton.disabled=false; displayError(loginFeedback,"");}); }); }
    if (logoutButton) { logoutButton.addEventListener('click', () => { signOut(auth).catch((e) => { console.error("Logout error:", e); displayError(charSelectError, "Logout error."); }); }); }
    if (characterListDiv) { characterListDiv.addEventListener('click', (event) => { const item = event.target.closest('.character-list-item'); if (!item) return; const id=item.dataset.charId; const name=item.dataset.charName; if (selectedCharacterElement===item) return; resetSelectionState(); selectedCharacterId=id; selectedCharacterName=name; selectedCharacterElement=item; item.classList.add('selected-char'); updateActionButtonsState(); }); }
    if (launchCharButton) { launchCharButton.addEventListener('click', () => { if (selectedCharacterId) launchGame(selectedCharacterId); }); }
    if (deleteCharButton) { deleteCharButton.addEventListener('click', () => { if (selectedCharacterId && selectedCharacterName) { if(deleteConfirmMessage) deleteConfirmMessage.textContent = `Delete ${selectedCharacterName}?`; if(deleteConfirmDialog) deleteConfirmDialog.classList.remove('hidden'); } }); }
    if (confirmDeleteButton) { confirmDeleteButton.addEventListener('click', () => { if (selectedCharacterId) deleteCharacter(selectedCharacterId); }); }
    if (cancelDeleteButton) { cancelDeleteButton.addEventListener('click', () => { if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden'); }); }
    if (createNewCharButton) { createNewCharButton.addEventListener('click', () => { clearErrors(); resetSelectionState(); showScreen('char-create'); if(charNameInput) charNameInput.value=''; if(selectedClassInput) selectedClassInput.value=''; classSelectionGrid?.querySelectorAll('.class-card.selected').forEach(c=>c.classList.remove('selected')); }); }
    if (backToSelectButton) { backToSelectButton.addEventListener('click', () => { clearErrors(); showScreen('char-select'); }); }
    if (classSelectionGrid) { classSelectionGrid.addEventListener('click', (event) => { const btn=event.target.closest('.class-select-button'); if(btn){ const card=btn.closest('.class-card'); if(!card)return; const name=card.dataset.class; classSelectionGrid.querySelectorAll('.class-card.selected').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); if(selectedClassInput){selectedClassInput.value=name;} } }); }
    if (createButton) {
        createButton.addEventListener('click', async () => {
            clearErrors();
            const name = charNameInput?.value.trim() || '';
            const cls = selectedClassInput?.value || '';
            const user = auth.currentUser;
            if (!user) {
                displayError(charCreateError, "Not logged in.");
                showScreen('login');
                return;
            }
            if (!name) {
                displayError(charCreateError, "Enter name.");
                return;
            }
            if (name.length > 20) {
                displayError(charCreateError, "Name too long.");
                return;
            }
            if (!cls) {
                displayError(charCreateError, "Select class.");
                return;
            }
            createButton.disabled = true;
            displayError(charCreateError, "Creating...");
            try {
                const skillAssignments = {};
                const equippedItems = {};
                let startingHp = 150,
                    startingMaxHp = 150,
                    startingMana = 100,
                    startingMaxMana = 100;
                if (cls === 'Juggernaut') {
                    equippedItems['weapon1'] = { ...ITEM_DEFINITIONS['starter_mace']
                    };
                    skillAssignments[4] = 'basic_strike';
                    startingHp = 200;
                    startingMaxHp = 200;
                    startingMana = 80;
                    startingMaxMana = 80;
                } else if (cls === 'Sharpshooter') {
                    /* TODO */
                    startingHp = 120;
                    startingMaxHp = 120;
                    startingMana = 120;
                    startingMaxMana = 120;
                    skillAssignments[4] = 'basic_strike'; /* Assign basic strike default */
                }
                const data = {
                    userId: user.uid,
                    name,
                    class: cls,
                    level: 1,
                    experience: 0,
                    xpToNextLevel: XP_FOR_LEVEL[1], // XP needed to reach level 2
                    currency: 0,
                    location: "Starhaven",
                    unlockedZones: ['landing_zone_alpha'],
                    createdAt: Timestamp.fromDate(new Date()),
                    inventory: [],
                    inventorySize: 60,
                    equipped: equippedItems,
                    skillAssignments,
                    hp: startingHp,
                    maxHp: startingMaxHp,
                    mana: startingMana,
                    maxMana: startingMaxMana,
                    shipName: DEFAULT_SHIP_NAME,
                    unlockedUpgrades: [],
                    activeMissions: {}, // Stores active mission progress
                    completedMissions: [], // Stores IDs of completed missions
                };
                await addDoc(collection(db, 'characters'), data);
                showScreen('char-select');
                loadCharacters(user.uid);
            } catch (e) {
                console.error("Create char error:", e);
                displayError(charCreateError, `Failed: ${e.message}`);
            } finally {
                if (createButton) createButton.disabled = false;
                if (charCreateError && charCreateError.textContent === "Creating character...") {
                    clearErrors();
                }
            }
        });
    }    if (townNav) { townNav.addEventListener('click', (event) => { if (event.target.classList.contains('town-nav-button') && !event.target.classList.contains('active')) { const panelId = event.target.dataset.panel; if(panelId) activateTownPanel(panelId); } }); }
    if (townLogoutButton) { townLogoutButton.addEventListener('click', () => { currentCharacterData = null; signOut(auth).catch((e) => console.error("Logout error:", e)); }); }
    if (townSwitchCharButton) { townSwitchCharButton.addEventListener('click', () => { currentCharacterData = null; showScreen('char-select'); }); }
    if (mapNodeList) { mapNodeList.addEventListener('click', (event) => { const nodeButton = event.target.closest('.map-node'); if (nodeButton && !nodeButton.disabled) { mapNodeList.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected')); nodeButton.classList.add('selected'); selectedZoneId = nodeButton.dataset.zoneId; if (enterZoneButton) enterZoneButton.removeAttribute('disabled'); } }); }
    if (enterZoneButton) { enterZoneButton.addEventListener('click', () => { if (selectedZoneId && currentCharacterData) { enterCombatZone(selectedZoneId); } else { console.warn("No zone selected or char not loaded."); } }); }
    if (exitCombatButton) { exitCombatButton.addEventListener('click', () => { leaveCombatZone(); }); }
    if (learnedSkillsList) { learnedSkillsList.addEventListener('click', handleLearnedSkillClick); }
    if (skillAssignmentBar) { skillAssignmentBar.addEventListener('click', handleAssignSlotClick); }

    // Initial Setup
    if (auth) { setupAuthStateListener(); } else { displayError(loginError, "Init error."); }
    console.log("Initial setup complete.");

}); // <-- End of DOMContentLoaded listener


// --- Load Characters Function ---
async function loadCharacters(userId) {
    const listDiv = document.getElementById('character-list');
    if (!userId || !db || !listDiv) { /* ... */ return; }
    listDiv.innerHTML = '<p class="no-characters-message">Loading...</p>'; resetSelectionState();
    try { const q = query(collection(db, 'characters'), where("userId", "==", userId)); const querySnapshot = await getDocs(q); if (querySnapshot.empty) { listDiv.innerHTML = '<p class="no-characters-message">No characters found.</p>'; return; } let html = ''; querySnapshot.forEach((doc) => { const char = doc.data(); html += `<div class="character-list-item" data-char-id="${doc.id}" data-char-name="${char.name||'Unnamed'}"><span>${char.name||'Unnamed'} - Lvl ${char.level||1} ${char.class||'Unknown'}</span></div>`; }); listDiv.innerHTML = html; }
    catch (error) { console.error("loadChars Error:", error); displayError(charSelectError, "Load failed."); listDiv.innerHTML = '<p class="no-characters-message" style="color: red;">Error loading.</p>'; }
}

function initializeStartingMissions() {
    if (!currentCharacterData) return;

    // Check if activeMissions is an object and if it's empty
    const noActiveMissions = !currentCharacterData.activeMissions || Object.keys(currentCharacterData.activeMissions).length === 0;
    // Also ensure completedMissions exists
    if (!Array.isArray(currentCharacterData.completedMissions)) {
        currentCharacterData.completedMissions = [];
    }

    if (noActiveMissions) {
        console.log("No active missions found, initializing starting missions.");
        currentCharacterData.activeMissions = {}; // Ensure it's an object

        // Add the first main mission
        const firstMainMissionId = 'main_act1_01_clear_landing_zone';
        const firstMainMissionDef = MISSION_DEFINITIONS[firstMainMissionId];
        if (firstMainMissionDef) {
            currentCharacterData.activeMissions[firstMainMissionId] = {
                missionId: firstMainMissionId,
                status: 'ACTIVE',
                objectivesProgress: {}
            };
            firstMainMissionDef.objectives.forEach(objDef => {
                currentCharacterData.activeMissions[firstMainMissionId].objectivesProgress[objDef.id] = {
                    currentCount: 0,
                    isComplete: false
                };
            });
            console.log(`Added starting mission: ${firstMainMissionDef.title}`);
        }
        // Potential: Save character data here if missions were added, or save on next natural save point.
        // For now, let's assume it will be saved when other progress (like XP) is saved.
    }
}

/**
 * Checks if the character has enough XP to level up and processes the level up.
 * Handles multiple level-ups if enough XP is gained.
 * Returns true if a level up occurred, false otherwise.
 */
function checkForLevelUp() {
    if (!currentCharacterData || currentCharacterData.level >= MAX_LEVEL) {
        return false; // Cannot level up if at max level or no data
    }

    let leveledUp = false;
    // Loop in case of multiple level-ups from a single XP gain
    while (currentCharacterData.experience >= currentCharacterData.xpToNextLevel && currentCharacterData.level < MAX_LEVEL) {
        currentCharacterData.level++;
        currentCharacterData.experience -= currentCharacterData.xpToNextLevel; // Subtract XP needed for the level just gained
        
        // Update xpToNextLevel for the new current level
        if (currentCharacterData.level < MAX_LEVEL) {
            currentCharacterData.xpToNextLevel = XP_FOR_LEVEL[currentCharacterData.level] || Infinity; // Infinity if somehow out of bounds
        } else { // Reached MAX_LEVEL
            currentCharacterData.xpToNextLevel = 0; // Or some indicator of maxed
            currentCharacterData.experience = 0; // Cap XP at max level
        }

        leveledUp = true;
        const levelUpMessage = `LEVEL UP! Reached Level ${currentCharacterData.level}!`;
        console.log(levelUpMessage);
        if (isCombatActive && combatLog) { // Add to combat log if in combat
            addCombatLogMessage(levelUpMessage);
        } else if (overviewPanel && overviewPanel.classList.contains('active')) { // Add to overview if in town
            // Could display a temporary message on the overview panel
        }

        // TODO: Implement other level up benefits:
        // - Attribute points
        // - Skill points
        // - Full heal HP/Mana
        // - Unlock new skills based on level/class
        // For now, just update stats that might depend on level (e.g. HP/Mana, if they scale)
        // PLAYER_STATS_PLACEHOLDER.maxHp = 150 + (currentCharacterData.level -1) * 10; // Example scaling
        // PLAYER_STATS_PLACEHOLDER.currentHp = PLAYER_STATS_PLACEHOLDER.maxHp;
        // PLAYER_STATS_PLACEHOLDER.maxMana = 100 + (currentCharacterData.level -1) * 5;
        // PLAYER_STATS_PLACEHOLDER.currentMana = PLAYER_STATS_PLACEHOLDER.maxMana;
        // updateResourceDisplay(); // If combat UI needs update
    }

    if (leveledUp) {
        // Update level display in town header if town is visible
        if (townCharLevel && townScreen && !townScreen.classList.contains('hidden')) {
            townCharLevel.textContent = currentCharacterData.level;
        }
        // Update XP bar if it exists and is visible
        updateXpBarDisplay(); // We will create this function next
    }
    return leveledUp;
}

// --- Delete Character Function ---
async function deleteCharacter(characterId) {
    if (!characterId || !db) return;
    displayError(charSelectError, "Deleting..."); if(confirmDeleteButton) confirmDeleteButton.disabled = true; if(cancelDeleteButton) cancelDeleteButton.disabled = true;
    try { await deleteDoc(doc(db, "characters", characterId)); displayError(charSelectError, "Deleted."); resetSelectionState(); const user = auth.currentUser; if (user) { loadCharacters(user.uid); } else { showScreen('login'); } setTimeout(clearErrors, 3000); }
    catch (error) { console.error("Delete Error:", error); displayError(charSelectError, `Delete failed: ${error.message}`); }
    finally { if(confirmDeleteButton) confirmDeleteButton.disabled = false; if(cancelDeleteButton) cancelDeleteButton.disabled = false; if (deleteConfirmDialog) deleteConfirmDialog.classList.add('hidden'); }
}

// --- Launch Game Function (Shows Town) ---
/**
 * Loads character data and launches the player into the town screen.
 * Updates UI elements including character info, level, currency, and XP bar.
 * @param {string} characterId The ID of the character to launch.
 */
async function launchGame(characterId) {
    displayError(charSelectError, "Loading character data..."); // Show loading feedback
    try {
        const charDocSnap = await getDoc(doc(db, "characters", characterId));
        if (charDocSnap.exists()) {
            currentCharacterData = { id: charDocSnap.id, ...charDocSnap.data() };
            initializeStartingMissions();
            // --- Initialize/Validate XP data for the character ---
            // This handles characters created before the XP system or if data is somehow missing
            if (!currentCharacterData.xpToNextLevel || (currentCharacterData.xpToNextLevel === 0 && currentCharacterData.level < MAX_LEVEL)) {
                if (currentCharacterData.level > 0 && currentCharacterData.level < MAX_LEVEL) {
                    currentCharacterData.xpToNextLevel = XP_FOR_LEVEL[currentCharacterData.level] || Infinity;
                } else if (currentCharacterData.level === MAX_LEVEL) {
                    currentCharacterData.xpToNextLevel = 0; // Indicates max level reached
                    currentCharacterData.experience = 0; // Cap XP at max level
                } else { // Default for new or level 1 characters if data is inconsistent
                    currentCharacterData.level = 1;
                    currentCharacterData.experience = 0;
                    currentCharacterData.xpToNextLevel = XP_FOR_LEVEL[1];
                }
                // Consider saving this back to Firestore if it was missing/corrected,
                // though typically it's updated upon XP gain.
            }
            // ----------------------------------------------------

            // --- Setup Skill Bar ---
            skillBar.slots.forEach(slot => {
                slot.skillId = null;
                slot.cooldownUntil = 0;
                slot.cooldownStart = 0;
            });
            if (currentCharacterData.skillAssignments) {
                skillBar.slots.forEach((slot, i) => {
                    if (slot && currentCharacterData.skillAssignments[i]) {
                        slot.skillId = currentCharacterData.skillAssignments[i] || null;
                    }
                });
            } else {
                // If no assignments, set default appearance/skills based on class
                setPlayerAppearance(); // Ensures basic_strike or class defaults are set
            }
            // ------------------------

            // --- Update Town Header UI ---
            if (townCharName) townCharName.textContent = currentCharacterData.name || 'N/A';
            if (townCharLevel) townCharLevel.textContent = currentCharacterData.level || '1';
            if (townCharClass) townCharClass.textContent = currentCharacterData.class || 'N/A';
            if (townCurrency) townCurrency.textContent = currentCharacterData.currency || '0';
            // ---------------------------

            // --- Update XP Bar Display ---
            updateXpBarDisplay();
            // ---------------------------

            activateTownPanel('overview-panel'); // Or your preferred default panel
            showScreen('town');
            clearErrors(); // Clear any errors from character select
            console.log("Game launched for character:", currentCharacterData.name, "Level:", currentCharacterData.level);

        } else {
            displayError(charSelectError, "Load Error: Character document not found.");
            console.error("Character not found for ID:", characterId);
        }
    } catch (error) {
        console.error("Error fetching character data for launchGame:", error);
        displayError(charSelectError, `Load Error: ${error.message}`);
    }
}

// --- Town Screen Logic ---
function activateTownPanel(panelId) {
    townNav.querySelector('.town-nav-button.active')?.classList.remove('active');
    if (townMainContent) {
        townMainContent.querySelector('.town-panel.active')?.classList.add('hidden');
        townMainContent.querySelector('.town-panel.active')?.classList.remove('active');
    } else {
        return;
    }
    const newButton = townNav.querySelector(`.town-nav-button[data-panel="${panelId}"]`);
    const newPanel = document.getElementById(panelId);
    if (newButton) {
        newButton.classList.add('active');
    }
    if (newPanel) {
        newPanel.classList.remove('hidden');
        newPanel.classList.add('active');
        switch (panelId) {
            case 'overview-panel': displayOverviewPanel(); break;
            case 'inventory-panel': displayInventoryPanel(); break;
            case 'missions-panel': displayMissionsPanel(); break;
            case 'station-panel': displayShipPanel(); break; // CHANGED
            case 'stats-panel': displayStatsPanel(); break;
            case 'skills-panel': displaySkillsPanel(); break;
            case 'map-panel': displayMapPanel(); break;
            case 'vendor-panel': displayVendorPanel(); break;
            case 'crafting-panel': displayCraftingPanel(); break;
            default: break;
        }
    } else {
        console.error("Panel not found:", panelId);
    }
}
function displayOverviewPanel() { if (!currentCharacterData) return; if (overviewCharName) overviewCharName.textContent = currentCharacterData.name || 'Traveler'; }
/**
 * Displays the Loadout/Inventory panel, enabling right-click context menus.
 */
/**
 * Displays the Loadout/Inventory panel, enabling right-click context menus.
 * (Cleaned up to remove D&D listener references)
 */
function displayInventoryPanel() {
    console.log('--- displayInventoryPanel START ---');
    if (!currentCharacterData) {
        console.error('displayInventoryPanel Error: Character data MISSING!');
        return;
    }
    console.log('Equipped state at render:', JSON.stringify(currentCharacterData.equipped));

    const equipmentSlotsContainer = document.querySelector('.equipment-slots');
    const inventoryGridEl = document.getElementById('inventory-grid');

    const existingError = document.querySelector('#inventory-panel .error-display');
    if (existingError) existingError.remove();

    // --- Setup Equipment Slots ---
    equipmentSlotsContainer?.querySelectorAll('.equip-slot').forEach(slotEl => {
        const slotName = slotEl.dataset.slot;
        if (!slotName) return;
        const item = currentCharacterData.equipped?.[slotName] || null;

        console.log(`Rendering equip slot '${slotName}', Item found:`, item ? item.name : 'null');

        // --- Clean up previous state and listeners ---
        const newSlotEl = slotEl.cloneNode(true); // Use cloneNode to easily remove all old listeners
        slotEl.parentNode.replaceChild(newSlotEl, slotEl);
        const currentSlotEl = equipmentSlotsContainer.querySelector(`.equip-slot[data-slot="${slotName}"]`); // Re-select

        // Reset visual state explicitly
        currentSlotEl.innerHTML = '';
        currentSlotEl.removeAttribute('style');
        currentSlotEl.removeAttribute('draggable'); // Remove draggable
        currentSlotEl.className = 'equip-slot'; // Reset class
        currentSlotEl.dataset.slot = slotName;
        currentSlotEl.classList.remove('has-item', 'dragging', 'drag-over'); // Clean D&D classes just in case
        // ------------------------------------------

        if (item && item.name) {
            // --- Item Equipped ---
            currentSlotEl.textContent = item.name;
            currentSlotEl.style.color = '#e5e7eb';
            currentSlotEl.style.borderStyle = 'solid';
            currentSlotEl.style.borderColor = '#6b7280';
            currentSlotEl.dataset.itemId = item.id;
            currentSlotEl.classList.add('has-item');

            // Add Tooltip listeners
            currentSlotEl.addEventListener('mouseover', handleSlotMouseOver);
            currentSlotEl.addEventListener('mouseout', handleSlotMouseOut);
            currentSlotEl.addEventListener('mousemove', handleSlotMouseMove);
            // Add Context Menu Listener
            currentSlotEl.addEventListener('contextmenu', (e) => handleContextMenu(e, 'equipment', slotName));
        } else {
            // --- Slot Empty ---
            currentSlotEl.textContent = slotName.charAt(0).toUpperCase() + slotName.slice(1);
            currentSlotEl.style.color = '#6b7280';
            currentSlotEl.style.borderStyle = 'dashed';
            currentSlotEl.style.borderColor = '#4b5563';
            delete currentSlotEl.dataset.itemId;
        }
        // No D&D listeners (dragover, drop, dragleave) are added here anymore
    });

    // --- Setup Inventory Grid ---
    if (inventoryGridEl) {
        inventoryGridEl.innerHTML = ''; // Clear grid

        // --- Remove D&D listeners from grid container (if they were ever added) ---
        // This check is safe even if the handlers are undefined
        if (typeof handleDragOver === 'function') inventoryGridEl.removeEventListener('dragover', handleDragOver);
        if (typeof handleDragLeave === 'function') inventoryGridEl.removeEventListener('dragleave', handleDragLeave);
        if (typeof handleDrop === 'function') inventoryGridEl.removeEventListener('drop', handleDrop);
        // -------------------------------------------------------------------------

        const size = currentCharacterData.inventorySize || 60;
        const items = currentCharacterData.inventory || [];

        for (let i = 0; i < size; i++) {
            const item = items[i] || null;
            const slotEl = document.createElement('div');
            slotEl.className = 'inv-slot';
            slotEl.dataset.slotIndex = i; // Keep index for identification

            // --- Clean potential old context listener ---
             const newSlotEl = slotEl.cloneNode(true); // Use cloneNode for inventory slots too
             // We need to append before adding new listeners if using cloneNode this way...
             // Let's revert to manual removal for inventory slots as it's simpler in a loop

             slotEl.removeEventListener('contextmenu', handleContextMenu);
             slotEl.removeEventListener('mouseover', handleSlotMouseOver);
             slotEl.removeEventListener('mouseout', handleSlotMouseOut);
             slotEl.removeEventListener('mousemove', handleSlotMouseMove);
             slotEl.removeAttribute('draggable'); // Ensure draggable is removed
             slotEl.classList.remove('has-item', 'dragging', 'drag-over'); // Clean classes
             //------------------------------------------------

            if (item && item.name) {
                // Item in Slot
                 // TODO: Update display to show quantity
                slotEl.textContent = item.name.substring(0, 1);
                slotEl.classList.add('has-item');
                slotEl.dataset.itemId = item.id;

                // Add Tooltip listeners
                slotEl.addEventListener('mouseover', handleSlotMouseOver);
                slotEl.addEventListener('mouseout', handleSlotMouseOut);
                slotEl.addEventListener('mousemove', handleSlotMouseMove);
                // Add Context Menu Listener
                slotEl.addEventListener('contextmenu', (e) => handleContextMenu(e, 'inventory', i));

            } else {
                // Slot Empty
                // Styles are handled by CSS :not(.has-item)
            }
            inventoryGridEl.appendChild(slotEl);
        }
    }
    console.log(`--- displayInventoryPanel END ---`);
}
async function saveEquipmentAndInventory() {
    if (!currentCharacterData || !auth.currentUser) {
        console.error("Cannot save equipment/inventory: Character data or user missing.");
        // Display error in the currently active panel if possible
        const activePanel = document.querySelector('.town-panel.active');
        if (activePanel) {
             displayPanelError(activePanel.id, "Error: Cannot save changes. Character/Login missing.");
        }
        return; // Stop if essential data is missing
    }

    console.log("Attempting to save equipment and inventory...");
    // Log concise versions to avoid flooding console if large inventory
    console.log(" - Equipped:", JSON.stringify(Object.keys(currentCharacterData.equipped || {})));
    console.log(" - Inventory Count:", currentCharacterData.inventory?.length);

    // Optional: Add a visual loading indicator here if desired

    try {
        const charRef = doc(db, "characters", currentCharacterData.id);
        await updateDoc(charRef, {
            equipped: currentCharacterData.equipped, // Save the updated equipped object
            inventory: currentCharacterData.inventory // Save the updated inventory array
        });
        console.log("Equipment and inventory saved successfully to Firestore.");
        // Optional: Remove loading indicator

    } catch (error) {
        console.error("Firestore Error: Failed to save equipment/inventory update:", error);
         const activePanel = document.querySelector('.town-panel.active');
         if (activePanel) {
            displayPanelError(activePanel.id, `Critical Error: Failed to save changes! (${error.code || error.message})`);
         }
        // Optional: Remove loading indicator
        // NOTE: Rollback of local data on save failure is complex. Currently,
        // local data might be out of sync with DB if this save fails.
    }
}
/**
 * Displays the list of active main and side missions in the missions panel.
 * Shows "Claim Rewards" button for missions with objectives met.
 */
function displayMissionsPanel() {
    const panel = document.getElementById('missions-panel');
    if (!panel) {
        console.error("Missions panel element not found!");
        return;
    }
    panel.innerHTML = ''; // Clear previous content

    const title = document.createElement('h3');
    title.className = 'panel-title';
    title.textContent = 'Mission Log'; // Changed title slightly
    panel.appendChild(title);

    // --- Active Missions Section ---
    const activeMissionsSection = document.createElement('div');
    activeMissionsSection.id = 'active-missions-section';
    const activeHeader = document.createElement('h4');
    activeHeader.className = 'mission-category-title';
    activeHeader.textContent = 'Active Missions';
    activeMissionsSection.appendChild(activeHeader);
    panel.appendChild(activeMissionsSection);


    if (!currentCharacterData || !currentCharacterData.activeMissions || Object.keys(currentCharacterData.activeMissions).length === 0) {
        const noMissionsMsg = document.createElement('p');
        noMissionsMsg.textContent = "No active missions.";
        noMissionsMsg.className = 'no-characters-message';
        activeMissionsSection.appendChild(noMissionsMsg);
        // Still proceed to render completed section if needed
    } else {
        let displayedActiveMissionCount = 0;
        // Separate into Main and Side for display order (optional, or just sort)
        const activeMainMissions = [];
        const activeSideMissions = [];

        for (const missionId in currentCharacterData.activeMissions) {
            const missionDef = MISSION_DEFINITIONS[missionId];
            if (!missionDef) {
                console.warn(`Mission definition not found for active mission ID: ${missionId}`);
                continue;
            }
            if (missionDef.type === 'MAIN') {
                activeMainMissions.push(missionId);
            } else {
                activeSideMissions.push(missionId);
            }
        }
        
        const renderMissionList = (missionIdList, container) => {
            missionIdList.forEach(missionId => {
                const activeMissionData = currentCharacterData.activeMissions[missionId];
                const missionDef = MISSION_DEFINITIONS[missionId]; // Already checked it exists

                const missionCard = document.createElement('div');
                missionCard.className = 'mission-card';
                missionCard.classList.add(missionDef.type.toLowerCase());
                if (activeMissionData.status === 'OBJECTIVES_MET') {
                    missionCard.classList.add('ready-to-claim');
                }

                let content = `<h5 class="mission-title">${missionDef.title}</h5>`;
                if (activeMissionData.status !== 'OBJECTIVES_MET') { // Only show description if not ready to claim
                    content += `<p class="mission-description">${missionDef.description}</p>`;
                }

                content += '<div class="mission-objectives-list">';
                missionDef.objectives.forEach(objDef => {
                    const progress = activeMissionData.objectivesProgress[objDef.id] || { currentCount: 0, isComplete: false };
                    const progressText = objDef.requiredCount > 1 ? `(${progress.currentCount || 0} / ${objDef.requiredCount})` : '';
                    const completedClass = progress.isComplete ? 'completed' : '';
                    content += `<p class="mission-objective ${completedClass}">- ${objDef.text} ${progressText}</p>`;
                });
                content += '</div>';

                // Display Rewards (always visible as a preview)
                let rewardsText = [];
                if (missionDef.rewards.xp) rewardsText.push(`${missionDef.rewards.xp} XP`);
                if (missionDef.rewards.credits) rewardsText.push(`${missionDef.rewards.credits} Credits`);
                if (missionDef.rewards.items && missionDef.rewards.items.length > 0) {
                    missionDef.rewards.items.forEach(itemReward => {
                        const itemDef = ITEM_DEFINITIONS[itemReward.itemId];
                        rewardsText.push(`${itemReward.quantity}x ${itemDef ? itemDef.name : 'Unknown Item'}`);
                    });
                }
                if (rewardsText.length > 0) {
                    content += `<p class="mission-rewards">Rewards: ${rewardsText.join(', ')}</p>`;
                }

                missionCard.innerHTML = content; // Set content first

                // Add "Claim Rewards" button if objectives are met
                if (activeMissionData.status === 'OBJECTIVES_MET') {
                    const claimButton = document.createElement('button');
                    claimButton.className = 'action-button launch-button claim-reward-button'; // Use existing styles
                    claimButton.textContent = 'Claim Rewards';
                    claimButton.addEventListener('click', async () => {
                        claimButton.disabled = true; // Prevent double clicks
                        claimButton.textContent = 'Claiming...';
                        await completeMission(missionId); // completeMission will re-render
                    });
                    missionCard.appendChild(claimButton);
                }
                container.appendChild(missionCard);
                displayedActiveMissionCount++;
            });
        };
        
        renderMissionList(activeMainMissions, activeMissionsSection);
        renderMissionList(activeSideMissions, activeMissionsSection);

        if (displayedActiveMissionCount === 0 && Object.keys(currentCharacterData.activeMissions).length > 0) {
            // This case might occur if all "active" missions are actually in a non-ACTIVE status
            // but not yet moved to completedMissions (e.g., a "FAILED" status if we add it)
            const noMissionsMsg = document.createElement('p');
            noMissionsMsg.textContent = "No missions currently requiring action.";
            noMissionsMsg.className = 'no-characters-message';
            activeMissionsSection.appendChild(noMissionsMsg);
        }
    }


    // --- Completed Missions Section ---
    const completedMissionsSection = document.createElement('div');
    completedMissionsSection.id = 'completed-missions-section';
    const completedHeader = document.createElement('h4');
    completedHeader.className = 'mission-category-title completed-title';
    completedHeader.textContent = 'Completed Missions';
    completedMissionsSection.appendChild(completedHeader);
    panel.appendChild(completedMissionsSection);

    if (!currentCharacterData.completedMissions || currentCharacterData.completedMissions.length === 0) {
        const noCompletedMsg = document.createElement('p');
        noCompletedMsg.textContent = "No missions completed yet.";
        noCompletedMsg.className = 'no-items-message';
        completedMissionsSection.appendChild(noCompletedMsg);
    } else {
        currentCharacterData.completedMissions.forEach(missionId => {
            const missionDef = MISSION_DEFINITIONS[missionId];
            if (!missionDef) {
                console.warn(`Definition for completed mission ${missionId} not found.`);
                return;
            }
            const missionCard = document.createElement('div');
            missionCard.className = 'mission-card completed';
            missionCard.classList.add(missionDef.type.toLowerCase());

            let content = `<h5 class="mission-title">${missionDef.title}</h5>`;
            // Could add a summary of rewards received or completion date here later
            content += `<p class="mission-description"><em>This mission has been completed.</em></p>`;
            missionCard.innerHTML = content;
            completedMissionsSection.appendChild(missionCard);
        });
    }
}

/**
 * Displays the Ship panel with available upgrades.
 * Builds DOM elements directly to ensure event listeners are attached correctly.
 */
function displayShipPanel() {
    console.log("Displaying Ship Panel");
    if (!currentCharacterData) {
        displayPanelError('station-panel', "Character data not loaded.");
        return;
    }

    const panel = document.getElementById('station-panel');
    if (!panel) {
        console.error("Ship panel element (#station-panel) not found!");
        return;
    }

    const panelTitle = panel.querySelector('.panel-title');
    if (panelTitle) {
        panelTitle.textContent = `${currentCharacterData.shipName || DEFAULT_SHIP_NAME} - Upgrades`;
    }

    let upgradesContainer = panel.querySelector('.ship-upgrades-container');
    if (!upgradesContainer) {
        upgradesContainer = document.createElement('div');
        upgradesContainer.className = 'ship-upgrades-container';
        if (panelTitle) {
            panelTitle.after(upgradesContainer);
        } else {
            panel.appendChild(upgradesContainer);
        }
    }
    upgradesContainer.innerHTML = ''; // Clear previous upgrades

    let errorDisplay = panel.querySelector('.panel-error-display');
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.className = 'error-message panel-error-display';
        errorDisplay.style.marginBottom = '1rem';
        upgradesContainer.before(errorDisplay);
    }
    errorDisplay.textContent = '';

    for (const upgradeId in SHIP_UPGRADE_DEFINITIONS) {
        const upgradeDef = SHIP_UPGRADE_DEFINITIONS[upgradeId];
        const upgradeCard = document.createElement('div');
        upgradeCard.className = 'upgrade-card';

        let prerequisitesMet = true;
        if (upgradeDef.prerequisites && upgradeDef.prerequisites.length > 0) {
            for (const prereqId of upgradeDef.prerequisites) {
                if (!currentCharacterData.unlockedUpgrades?.includes(prereqId)) {
                    prerequisitesMet = false;
                    break;
                }
            }
        }

        // --- Build Card Content by Appending DOM Elements ---
        const titleEl = document.createElement('h4');
        titleEl.textContent = upgradeDef.name;
        upgradeCard.appendChild(titleEl);

        const descEl = document.createElement('p');
        descEl.className = 'description';
        descEl.textContent = upgradeDef.description;
        upgradeCard.appendChild(descEl);

        let costString = "Cost: ";
        const costs = [];
        if (upgradeDef.costCredits > 0) {
            costs.push(`${upgradeDef.costCredits} Credits`);
        }
        if (upgradeDef.costItems && upgradeDef.costItems.length > 0) {
            upgradeDef.costItems.forEach(itemCost => {
                const itemDef = ITEM_DEFINITIONS[itemCost.itemId];
                costs.push(`${itemCost.quantity} x ${itemDef ? itemDef.name : itemCost.itemId}`);
            });
        }
        costString += costs.join(', ') || "Free";
        const costEl = document.createElement('p');
        costEl.className = 'cost';
        costEl.textContent = costString;
        upgradeCard.appendChild(costEl);

        const statusEl = document.createElement('p');
        statusEl.className = 'status';

        if (currentCharacterData.unlockedUpgrades?.includes(upgradeId)) {
            statusEl.textContent = "Status: Unlocked";
            upgradeCard.classList.add('unlocked');
        } else if (!prerequisitesMet) {
            const prereqNames = upgradeDef.prerequisites.map(id => SHIP_UPGRADE_DEFINITIONS[id]?.name || id).join(', ');
            statusEl.textContent = `Locked (Requires: ${prereqNames})`;
            statusEl.classList.add('locked'); // Add class to status paragraph
            upgradeCard.classList.add('locked');
        } else { // Available for purchase/crafting
            statusEl.textContent = "Status: Available";
            const actionButton = document.createElement('button');
            actionButton.className = 'action-button'; // General button style
            actionButton.textContent = (upgradeDef.costItems && upgradeDef.costItems.length > 0) ? "Craft" : "Purchase";

            // *** Attach listener directly to this DOM element ***
            actionButton.addEventListener('click', () => {
                // Add a log here to immediately confirm the click is registered
                console.log(`Button clicked for upgrade: ${upgradeId}`);
                attemptPurchaseOrCraftUpgrade(upgradeId);
            });
            // ----------------------------------------------------
            upgradeCard.appendChild(actionButton); // Append the actual button element
        }
        upgradeCard.appendChild(statusEl); // Append status element
        // --- End building card content ---

        upgradesContainer.appendChild(upgradeCard);
    }
}
function displayStatsPanel() { /* TODO */ }
function displaySkillsPanel() { if (!currentCharacterData || !learnedSkillsList || !skillAssignmentBar) return; const listContainer = learnedSkillsList; const assignmentBar = skillAssignmentBar; listContainer.innerHTML = ''; let skillsHTML = ''; const learned = []; const currentLevel = currentCharacterData.level || 1; const CLEAVE_UNLOCK_LEVEL = 5; if (currentCharacterData.class === 'Juggernaut' ) { learned.push('basic_strike'); if (currentLevel >= CLEAVE_UNLOCK_LEVEL) { learned.push('juggernaut_cleave'); } } else if (currentCharacterData.class === 'Sharpshooter') { learned.push('basic_strike'); learned.push('sharpshooter_piercing_shot'); } if (learned.length === 0) { skillsHTML = '<p class="no-characters-message">No skills learned.</p>'; } else { learned.forEach(id => { const data = ATTACK_DEFINITIONS[id]; if (data) { let dets = `<div class="skill-tags">${data.tags?.join(', ') || ''}</div>`; dets += `<span class="skill-prop">Cost:</span> ${data.cost||0} ${data.costType||''} | <span class="skill-prop">CD:</span> ${data.cooldown||0}ms | <span class="skill-prop">Speed:</span> ${(data.attackSpeedMultiplier*100).toFixed(0)}% | <span class="skill-prop">Effect:</span> ${(data.effectiveness*100).toFixed(0)}%`; if (data.aoe?.type==='grid_shape') { dets += ` | <span class="skill-prop">AoE:</span> ${data.aoe.width}x${data.aoe.height} ${data.aoe.shape||''}${data.aoe.targeting==='centered_on_target'?' (Centered)':''}`; } else if (!data.aoe) { dets += ` | <span class="skill-prop">AoE:</span> Single Target`; } skillsHTML += `<div class="skill-item" data-skill-id="${id}"><div class="skill-name">${data.name||id}</div><div class="skill-details">${dets}</div><div class="skill-description-text">${data.description||''}</div></div>`; } else { skillsHTML += `<div class="skill-item missing-data" data-skill-id="${id}"><div class="skill-name">${id} (Missing)</div></div>`; } }); } listContainer.innerHTML = skillsHTML; const assignSlots = assignmentBar.querySelectorAll('.assign-skill-slot'); assignSlots.forEach((slotDiv, i) => { if (i < skillBar.slots.length) { const assignedId = skillBar.slots[i]?.skillId; const data = assignedId ? ATTACK_DEFINITIONS[assignedId] : null; const keyHTML = slotDiv.querySelector('span')?.outerHTML || `<span>${skillBar.slots[i]?.key || '?'}</span>`; let content = data ? `<div class="assigned-skill-name">${data.name || assignedId}</div>` : `<div class="assigned-skill-name empty">[Empty]</div>`; slotDiv.style.opacity = data ? '1' : '0.6'; slotDiv.innerHTML = content + keyHTML; } }); addSkillPanelListeners(); selectedSkillForAssignment = null; selectedSlotElementForAssignment = null; listContainer.querySelectorAll('.skill-item.selected-for-assignment').forEach(item => item.classList.remove('selected-for-assignment')); assignmentBar.querySelectorAll('.assign-skill-slot.selected-for-assignment').forEach(slot => slot.classList.remove('selected-for-assignment')); }
function displayMapPanel() {
    console.log("Display Map Panel");
    selectedZoneId = null;
    if (enterZoneButton) enterZoneButton.setAttribute('disabled', 'true');
    if (mapNodeList) mapNodeList.querySelectorAll('.map-node.selected').forEach(node => node.classList.remove('selected'));

    // --- Update Map Node Availability ---
    if (currentCharacterData && mapNodeList) {
        // Get the list of zones the character has unlocked
        const unlocked = currentCharacterData.unlockedZones || ['landing_zone_alpha']; // Default if field missing
        console.log("Unlocked Zones:", unlocked); // Check this log output

        mapNodeList.querySelectorAll('.map-node').forEach(node => {
            const zoneId = node.dataset.zoneId;
            if (zoneId) {
                const zoneName = ZONE_CONFIG[zoneId]?.name || node.dataset.zoneName || zoneId;

                // Check if THIS zone's ID is in the character's unlocked list
                if (unlocked.includes(zoneId)) {
                    // --- Zone is UNLOCKED ---
                    node.disabled = false; // Enable the button
                    node.textContent = zoneName; // Show normal name
                    node.style.opacity = '1';
                    node.style.cursor = 'pointer';
                    // Optional: Add a class if you want to visually mark completed zones differently later
                    // if (currentCharacterData.completedZones?.includes(zoneId)) {
                    //     node.classList.add('completed');
                    // } else {
                    //     node.classList.remove('completed');
                    // }

                } else {
                    // --- Zone is LOCKED ---
                    node.disabled = true; // Disable the button
                    node.textContent = `${zoneName} (Locked)`; // Indicate locked status
                    node.style.opacity = '0.5';
                    node.style.cursor = 'not-allowed';
                    // node.classList.remove('completed'); // Remove completed class if locked
                }
            }
        });
    } else {
         console.warn("Cannot update map node availability: Missing character data or map node list.");
         // Fallback: Disable all except landing zone if no data
         mapNodeList?.querySelectorAll('.map-node').forEach(node => {
              if(node.dataset.zoneId !== 'landing_zone_alpha') {
                  node.disabled = true;
                  node.textContent = `${node.dataset.zoneName || node.dataset.zoneId} (Locked)`;
                  node.style.opacity = '0.5';
                  node.style.cursor = 'not-allowed';
              } else { // Ensure landing zone is enabled in fallback
                  node.disabled = false;
                  node.textContent = ZONE_CONFIG['landing_zone_alpha']?.name || 'Landing Zone Alpha';
                  node.style.opacity = '1';
                  node.style.cursor = 'pointer';
              }
         });
    }
    // ----------------------------------
}
/**
 * Attempts to purchase or craft a ship upgrade.
 * @param {string} upgradeId The ID of the upgrade to attempt.
 */
async function attemptPurchaseOrCraftUpgrade(upgradeId) {
    console.log(`--- attemptPurchaseOrCraftUpgrade CALLED for ID: ${upgradeId} ---`); // Confirms function entry
    if (!currentCharacterData || !SHIP_UPGRADE_DEFINITIONS[upgradeId]) {
        console.error("Missing data for upgrade attempt.");
        displayPanelError('station-panel', "Error: Upgrade data missing.");
        return;
    }

    const upgradeDef = SHIP_UPGRADE_DEFINITIONS[upgradeId];
    let canAfford = true;
    let missingItemsMessages = [];

    // 1. Check Credits
    if (upgradeDef.costCredits > 0 && (currentCharacterData.currency || 0) < upgradeDef.costCredits) {
        canAfford = false;
        missingItemsMessages.push(`Not enough credits (Need ${upgradeDef.costCredits})`);
    }

    // 2. Check Crafting Items
    const itemsToDeductIndices = {}; // Stores { inventoryIndex: quantityToDeduct }

    if (upgradeDef.costItems && upgradeDef.costItems.length > 0) {
        for (const requiredItem of upgradeDef.costItems) {
            let foundQuantity = 0;
            for (let i = 0; i < currentCharacterData.inventory.length; i++) {
                const invItem = currentCharacterData.inventory[i];
                if (invItem && invItem.id === requiredItem.itemId) {
                    foundQuantity += (invItem.quantity || 1);
                }
            }

            if (foundQuantity < requiredItem.quantity) {
                canAfford = false;
                const itemDef = ITEM_DEFINITIONS[requiredItem.itemId];
                missingItemsMessages.push(`Missing ${requiredItem.quantity - foundQuantity} x ${itemDef ? itemDef.name : requiredItem.itemId}`);
            }
        }
    }

    if (!canAfford) {
        displayPanelError('station-panel', `Cannot unlock ${upgradeDef.name}: ${missingItemsMessages.join(', ')}.`);
        return;
    }

    // --- If affordable, proceed with purchase/crafting ---
    console.log(`Unlocking upgrade: ${upgradeDef.name}`);
    displayPanelError('station-panel', `Unlocking ${upgradeDef.name}...`); // Clear previous errors

    // 3. Deduct Credits
    if (upgradeDef.costCredits > 0) {
        currentCharacterData.currency = (currentCharacterData.currency || 0) - upgradeDef.costCredits;
    }

    // 4. Deduct Items (More complex due to stacks)
    if (upgradeDef.costItems && upgradeDef.costItems.length > 0) {
        const newInventory = [...currentCharacterData.inventory]; // Work on a copy

        for (const requiredItem of upgradeDef.costItems) {
            let quantityToDeduct = requiredItem.quantity;
            for (let i = newInventory.length - 1; i >= 0; i--) { // Iterate backwards for safe splicing/modification
                const invItem = newInventory[i];
                if (invItem && invItem.id === requiredItem.itemId) {
                    if ((invItem.quantity || 1) > quantityToDeduct) {
                        invItem.quantity -= quantityToDeduct;
                        quantityToDeduct = 0;
                        break;
                    } else {
                        quantityToDeduct -= (invItem.quantity || 1);
                        newInventory.splice(i, 1); // Remove item/stack
                        if (quantityToDeduct <= 0) break;
                    }
                }
            }
        }
        currentCharacterData.inventory = newInventory; // Assign modified inventory
    }

    // 5. Add Upgrade
    if (!currentCharacterData.unlockedUpgrades) {
        currentCharacterData.unlockedUpgrades = [];
    }
    currentCharacterData.unlockedUpgrades.push(upgradeId);

    // 6. Save to Firestore
    try {
        const charRef = doc(db, "characters", currentCharacterData.id);
        await updateDoc(charRef, {
            currency: currentCharacterData.currency,
            inventory: currentCharacterData.inventory,
            unlockedUpgrades: currentCharacterData.unlockedUpgrades
        });
        console.log(`Upgrade ${upgradeDef.name} unlocked and data saved.`);
        displayPanelError('station-panel', `${upgradeDef.name} unlocked!`); // Success message
    } catch (error) {
        console.error("Failed to save upgrade:", error);
        displayPanelError('station-panel', `Error saving ${upgradeDef.name}. Please try again.`);
        // TODO: Implement rollback of local changes if save fails (complex)
        // For now, player might have local changes not reflected in DB.
        // A robust solution would involve snapshotting state before modification.
        return; // Stop further UI updates if save failed
    }

    // 7. Update UI
    if (townCurrency) townCurrency.textContent = currentCharacterData.currency; // Update header currency
    displayShipPanel(); // Re-render the ship panel to show new status

    // Handle progression items
    if (upgradeDef.isProgressionItem && upgradeDef.unlocksFeature === 'canTravelToNextSector') {
        // Show a special notification or unlock map features
        console.log("Progression item crafted! Next sector travel potentially unlocked.");
        // Update character data for act progression if needed
        // currentCharacterData.currentAct = 2; (or similar)
        // await updateDoc(charRef, { currentAct: currentCharacterData.currentAct });
        // TODO: This will require changes to map display logic later
        alert(`Congratulations! The ${upgradeDef.name} is complete! You feel a shift in the ship's capabilities, allowing travel beyond this star cluster.`);
    }
}
// Add this function definition
// Add this function definition
// Add this function definition

/**
 * Processes the sale of all items currently selected in the itemsToSellIndices array.
 */
/**
 * Processes the sale of all items currently selected in the itemsToSellIndices array.
 * Updates local data, saves to Firestore, and refreshes UI including town header currency.
 */
async function processSaleOfSelectedItems() {
    if (!isSellModeActive || itemsToSellIndices.length === 0) {
        displayVendorError("No items selected or not in sell mode.");
        return;
    }
    if (!currentCharacterData || !auth.currentUser) {
        displayVendorError("Error: Character data missing or not logged in.");
        return;
    }

    // --- Disable buttons during processing ---
    const sellButton = document.getElementById('sell-selected-button');
    const toggleButton = document.getElementById('toggle-sell-mode-button');
    if(sellButton) sellButton.disabled = true;
    if(toggleButton) toggleButton.disabled = true;
    displayVendorError("Processing sale..."); // Indicate activity

    // --- Calculate Total Value ---
    let totalSellValue = 0;
    const itemsBeingSoldNames = []; // For logging/confirmation
    itemsToSellIndices.forEach(index => {
        const item = currentCharacterData.inventory[index];
        if (item && item.sellValue) {
            totalSellValue += item.sellValue;
            itemsBeingSoldNames.push(item.name);
        }
    });

    console.log(`Attempting to sell ${itemsToSellIndices.length} items for ${totalSellValue} Credits:`, itemsBeingSoldNames.join(', '));

    // --- Perform Local Updates ---
    const previousCurrency = currentCharacterData.currency;
    const previousInventory = [...currentCharacterData.inventory]; // Shallow copy for rollback
    const townCurrencyEl = document.getElementById('town-currency'); // Get town currency element reference

    // 1. Add Credits (Local)
    currentCharacterData.currency += totalSellValue;

    // ---> Update Town Header Currency Display (Local Update) <---
    if (townCurrencyEl) {
        townCurrencyEl.textContent = currentCharacterData.currency;
        console.log("Updated town header currency display (local).");
    }
    // -------------------------------------------------------------

    // 2. Create NEW inventory array EXCLUDING sold items (Local)
    const newInventory = currentCharacterData.inventory.filter((item, index) => {
        // Keep the item if its index is NOT in the itemsToSellIndices array
        return !itemsToSellIndices.includes(index);
    });
    currentCharacterData.inventory = newInventory; // Replace old inventory

    // --- Save Changes to Firestore ---
    try {
        const charRef = doc(db, "characters", currentCharacterData.id);
        await updateDoc(charRef, {
            currency: currentCharacterData.currency,
            inventory: currentCharacterData.inventory // Save the NEW inventory array
        });
        console.log("Bulk sale saved successfully to Firestore.");
        displayVendorError(`Sold ${itemsToSellIndices.length} items for ${totalSellValue} Credits.`); // Success feedback

        // --- Clear Selection State After Successful Save ---
        itemsToSellIndices = []; // Clear selection only on successful save


    } catch (error) {
        console.error("Failed to save bulk sale transaction:", error);
        displayVendorError("Critical Error: Failed to save sale! Reverting local changes.");

        // --- Attempt Rollback on Save Failure ---
        currentCharacterData.currency = previousCurrency;
        currentCharacterData.inventory = previousInventory; // Restore previous inventory

        // ---> Update Town Header Currency Display (Rollback) <---
        if (townCurrencyEl) {
            townCurrencyEl.textContent = currentCharacterData.currency; // Revert display
             console.log("Rolled back town header currency display.");
        }
        // --------------------------------------------------------

        // Note: itemsToSellIndices remain selected after a failed save, allowing retry

    } finally {
         // --- Re-enable buttons and Re-render Vendor Panel UI ---
        if(toggleButton) toggleButton.disabled = false;
        // Sell button state will be updated by displayVendorPanel
        displayVendorPanel(); // Refresh the entire vendor panel view to show correct selections/inventory
    }
}

// Make sure displayVendorError helper exists (or adapt message display)
function displayVendorError(message) {
    const vendorErrorEl = document.getElementById('vendor-error');
    if (vendorErrorEl) {
        vendorErrorEl.textContent = message;
    }
    if(message) console.warn("Vendor Panel Message:", message);
}
/**
 * Handles clicks on sellable items within the player's vendor inventory grid.
 * Only performs actions if isSellModeActive is true.
 * @param {Event} event The click event.
 */
function handleVendorInventoryClick(event) {
    if (!isSellModeActive) {
        console.log("Click ignored: Sell mode not active.");
        // Optionally add logic here for inspecting items when sell mode is OFF
        return;
    }

    const slotElement = event.currentTarget;
    const originalIndex = parseInt(slotElement.dataset.originalIndex, 10);

    if (isNaN(originalIndex)) {
        console.error("Invalid original index on clicked vendor item slot.");
        return;
    }

    const item = currentCharacterData.inventory[originalIndex];
    if (!item || !item.sellValue || item.sellValue <= 0) {
        console.warn("Clicked unsellable item slot while in sell mode.");
        return; // Should not happen if listener is only on sellable items
    }

    const alreadySelected = itemsToSellIndices.includes(originalIndex);

    if (alreadySelected) {
        // --- Deselect Item ---
        itemsToSellIndices = itemsToSellIndices.filter(idx => idx !== originalIndex);
        slotElement.classList.remove('selected-for-sale');
        console.log(`Deselected item at index ${originalIndex}: ${item.name}`);
    } else {
        // --- Select Item ---
        itemsToSellIndices.push(originalIndex);
        slotElement.classList.add('selected-for-sale');
        console.log(`Selected item at index ${originalIndex}: ${item.name}`);
    }

    // Update the sell button text/state
    updateSellButtonState();
}
/**
 * Toggles the vendor panel's selling mode on/off.
 */
function toggleSellMode() {
    isSellModeActive = !isSellModeActive; // Toggle the state

    const toggleButton = document.getElementById('toggle-sell-mode-button');
    const sellModeIndicator = document.getElementById('sell-mode-indicator');
    const playerSellArea = document.querySelector('.player-sell-area'); // Target the parent container


    if (toggleButton) {
        toggleButton.textContent = isSellModeActive ? 'Exit Sell Mode' : 'Enable Sell Mode';
        toggleButton.classList.toggle('active', isSellModeActive);
    }
     if (sellModeIndicator) {
        sellModeIndicator.textContent = isSellModeActive ? 'Select Items to Sell' : 'View Inventory';
     }
     playerSellArea?.classList.toggle('sell-mode-active', isSellModeActive);


    if (!isSellModeActive) {
        // --- Cleanup when exiting sell mode ---
        itemsToSellIndices = []; // Clear selection array
        // Remove visual selection from all items in the grid
        const playerGrid = document.getElementById('vendor-player-inventory-grid');
        playerGrid?.querySelectorAll('.inv-slot.selected-for-sale').forEach(slot => {
            slot.classList.remove('selected-for-sale');
        });
        console.log("Exited Sell Mode, selection cleared.");
    } else {
        console.log("Entered Sell Mode.");
    }

    // Update the sell button state (it might become enabled/disabled)
    updateSellButtonState();
}
/**
 * Populates the vendor panel UI with vendor info, player credits, and player inventory.
 * Handles setting up sell mode interactions.
 */
function displayVendorPanel() {
    console.log("Displaying Vendor Panel");
    if (!currentCharacterData) {
        console.error("Cannot display vendor panel: Character data not loaded.");
        const vendorError = document.getElementById('vendor-error');
        if(vendorError) vendorError.textContent = "Error: Character data not loaded.";
        return;
    }

    // --- Get Elements & Vendor Data ---
    currentVendorId = 'starhaven_kiosk'; // Assuming default vendor
    const vendorData = VENDOR_DATA[currentVendorId];
    const vendorNameEl = document.getElementById('vendor-name');
    const playerCurrencyEl = document.getElementById('vendor-player-currency');
    const playerInventoryGridEl = document.getElementById('vendor-player-inventory-grid');
    const vendorStockGridEl = document.getElementById('vendor-stock-grid');
    const vendorErrorEl = document.getElementById('vendor-error');
    const toggleSellModeButton = document.getElementById('toggle-sell-mode-button');
    const sellSelectedButton = document.getElementById('sell-selected-button');
    const sellModeIndicator = document.getElementById('sell-mode-indicator');

    // --- Clear Previous State / Attach Listeners ---
    if(vendorErrorEl) vendorErrorEl.textContent = '';
    if (playerInventoryGridEl) playerInventoryGridEl.innerHTML = '<p class="placeholder-text" style="display: none;">Loading inventory...</p>'; // Clear player grid, hide loading text quickly
    if (vendorStockGridEl) vendorStockGridEl.innerHTML = '<p class="placeholder-text">Loading stock...</p>'; // Clear vendor grid

    // Attach listeners to control buttons (ensure only one listener is attached)
    if (toggleSellModeButton) {
        toggleSellModeButton.removeEventListener('click', toggleSellMode); // Prevent duplicates
        toggleSellModeButton.addEventListener('click', toggleSellMode);
    }
    if (sellSelectedButton) {
        sellSelectedButton.removeEventListener('click', processSaleOfSelectedItems); // Prevent duplicates
        sellSelectedButton.addEventListener('click', processSaleOfSelectedItems);
    }

    // Set Vendor Name
    if (vendorNameEl && vendorData) vendorNameEl.textContent = vendorData.name || "Vendor";
    else if (vendorNameEl) vendorNameEl.textContent = "Unknown Vendor";

    // Display Player Currency
    if (playerCurrencyEl) playerCurrencyEl.textContent = currentCharacterData.currency || 0;

    // --- Update Sell Mode UI Elements ---
    if (toggleSellModeButton) {
         toggleSellModeButton.textContent = isSellModeActive ? 'Exit Sell Mode' : 'Enable Sell Mode';
         toggleSellModeButton.classList.toggle('active', isSellModeActive);
    }
     if (sellModeIndicator) {
        sellModeIndicator.textContent = isSellModeActive ? 'Select Items to Sell' : 'View Inventory';
     }
     document.querySelector('.player-sell-area')?.classList.toggle('sell-mode-active', isSellModeActive);

    // --- Display Player Inventory for Selling ---
    if (playerInventoryGridEl) {
        playerInventoryGridEl.innerHTML = ''; // Clear loading/previous content immediately
        const items = currentCharacterData.inventory || [];
        const size = currentCharacterData.inventorySize || 60;

        // ----- Removed the "Inventory empty" message logic from here -----

        // Render items present in inventory
        let hasRenderedItems = false;
        items.forEach((item, index) => {
            if (!item || !item.name) return; // Skip if item is somehow null/invalid

            const slotEl = document.createElement('div');
            slotEl.className = 'inv-slot has-item';
            slotEl.dataset.originalIndex = index; // Store the ORIGINAL index
            slotEl.dataset.itemId = item.id;
            slotEl.textContent = item.name.substring(0, 1); // Or icon

            // Add Tooltip Listeners
            slotEl.removeEventListener('mouseover', handleSlotMouseOver);
            slotEl.removeEventListener('mouseout', handleSlotMouseOut);
            slotEl.removeEventListener('mousemove', handleSlotMouseMove);
            slotEl.addEventListener('mouseover', handleSlotMouseOver);
            slotEl.addEventListener('mouseout', handleSlotMouseOut);
            slotEl.addEventListener('mousemove', handleSlotMouseMove);

            // Add Sell Mode Click Listener (only if sellable)
            slotEl.removeEventListener('click', handleVendorInventoryClick); // Cleanup
            if (item.sellValue && item.sellValue > 0) {
                slotEl.classList.add('sellable');
                slotEl.addEventListener('click', handleVendorInventoryClick);
                // Check if this item is already selected for sale
                if (itemsToSellIndices.includes(index)) {
                    slotEl.classList.add('selected-for-sale');
                }
            } else {
                slotEl.classList.add('unsellable');
                slotEl.style.cursor = 'not-allowed';
            }

            playerInventoryGridEl.appendChild(slotEl);
            hasRenderedItems = true; // Mark that we added at least one item
        });

        // If no items were actually rendered, add a less intrusive placeholder (optional)
        // if (!hasRenderedItems && size > 0) {
        //     // You could add a subtle visual indicator or leave it blank
        //     // Example: playerInventoryGridEl.classList.add('truly-empty');
        // }


        // Optional: Render empty slots placeholders if desired (for visual consistency)
        const currentItemCount = items.filter(Boolean).length;
         for (let i = currentItemCount; i < size; i++) {
             const emptySlotEl = document.createElement('div');
             emptySlotEl.className = 'inv-slot empty-inv-slot';
             playerInventoryGridEl.appendChild(emptySlotEl);
         }

    } else {
        console.error("Player inventory grid element not found for vendor panel.");
    }

    // --- Display Vendor Inventory (Placeholder) ---
    if (vendorStockGridEl) {
        vendorStockGridEl.innerHTML = '<p class="placeholder-text">Vendor buying implemented later.</p>';
        // TODO: Populate vendor stock
    }

    // --- Final UI State Update ---
    updateSellButtonState(); // Set initial state of the sell button
}

/**
 * Handles clicking an item in the player's inventory grid within the vendor panel.
 * @param {Event} event The click event.
 */
async function handleSellItemClick(event) {
    if (!currentCharacterData || !auth.currentUser) {
        displayVendorError("Error: Character data not loaded or user not logged in.");
        return;
    }

    const slotElement = event.currentTarget; // The clicked .inv-slot div
    const originalIndex = parseInt(slotElement.dataset.slotIndex, 10); // Get the item's index in the main inventory array

    if (isNaN(originalIndex) || originalIndex < 0 || originalIndex >= currentCharacterData.inventory.length) {
        console.error("Invalid slot index clicked:", slotElement.dataset.slotIndex);
        displayVendorError("Error processing sale. Invalid item index.");
        return;
    }

    const itemToSell = currentCharacterData.inventory[originalIndex];

    if (!itemToSell) {
        console.error("Clicked slot index refers to an empty/invalid item:", originalIndex);
        displayVendorError("Error: Item not found at clicked slot.");
        return; // Should not happen if listener only added to items
    }

    const sellValue = itemToSell.sellValue || 0;

    if (sellValue <= 0) {
        console.warn("Attempted to sell unsellable item:", itemToSell.name);
        displayVendorError(`Cannot sell ${itemToSell.name}. No sell value.`);
        return; // Should not happen if listener prevented
    }

    // --- Confirmation --- (Simple browser confirm)
    const confirmSale = confirm(`Sell ${itemToSell.name} for ${sellValue} Credits?`);
    if (!confirmSale) {
        return; // User cancelled
    }
    // --------------------

    console.log(`Selling ${itemToSell.name} (Index: ${originalIndex}) for ${sellValue} credits.`);
    displayVendorError(""); // Clear previous errors

    // --- Perform Local Updates ---
    const previousCurrency = currentCharacterData.currency;
    const previousInventory = [...currentCharacterData.inventory]; // Shallow copy for potential rollback

    // 1. Add Credits
    currentCharacterData.currency += sellValue;

    // 2. Remove Item from Inventory (using the original index)
    currentCharacterData.inventory.splice(originalIndex, 1);

    // --- Update UI Immediately ---
    // Re-render the vendor panel to reflect changes
    displayVendorPanel();
    // Also update the main town header currency display if visible
    if (townCurrency) townCurrency.textContent = currentCharacterData.currency;

    // --- Save Changes to Firestore ---
    try {
        const charRef = doc(db, "characters", currentCharacterData.id);
        await updateDoc(charRef, {
            currency: currentCharacterData.currency,
            inventory: currentCharacterData.inventory // Save the modified inventory array
        });
        console.log("Vendor transaction saved successfully to Firestore.");
        // Optional: Add a success message to the vendor panel?
        // displayVendorMessage(`Sold ${itemToSell.name} for ${sellValue} Credits.`);

    } catch (error) {
        console.error("Failed to save vendor transaction:", error);
        displayVendorError("Critical Error: Failed to save sale! Reverting changes.");

        // --- Attempt Rollback on Save Failure ---
        currentCharacterData.currency = previousCurrency;
        currentCharacterData.inventory = previousInventory;

        // Re-render UI again to show reverted state
        displayVendorPanel();
        if (townCurrency) townCurrency.textContent = currentCharacterData.currency;
        // ---------------------------------------
    }
}

// Helper function to display errors specifically in the vendor panel
function displayCraftingPanel() { /* TODO */ }

// --- Skill Panel Listeners & Saving ---
function addSkillPanelListeners() { if (!learnedSkillsList || !skillAssignmentBar) return; learnedSkillsList.removeEventListener('click', handleLearnedSkillClick); skillAssignmentBar.removeEventListener('click', handleAssignSlotClick); learnedSkillsList.addEventListener('click', handleLearnedSkillClick); skillAssignmentBar.addEventListener('click', handleAssignSlotClick); }
function handleLearnedSkillClick(event) { const item = event.target.closest('.skill-item'); if (!item) return; const skillId = item.dataset.skillId; if (item.classList.contains('selected-for-assignment')) { item.classList.remove('selected-for-assignment'); selectedSkillForAssignment = null; } else { learnedSkillsList.querySelectorAll('.skill-item.selected-for-assignment').forEach(i => i.classList.remove('selected-for-assignment')); if (selectedSlotElementForAssignment) { selectedSlotElementForAssignment.classList.remove('selected-for-assignment'); selectedSlotElementForAssignment = null; } if (skillId) { item.classList.add('selected-for-assignment'); selectedSkillForAssignment = skillId; } else { selectedSkillForAssignment = null; } } }
function handleAssignSlotClick(event) { const slot = event.target.closest('.assign-skill-slot'); if (!slot) return; const index = parseInt(slot.dataset.slotIndex, 10); if (isNaN(index) || index < 0 || index >= skillBar.slots.length) return; if (selectedSkillForAssignment) { skillBar.slots[index].skillId = selectedSkillForAssignment; skillBar.slots[index].cooldownUntil = 0; displaySkillsPanel(); selectedSkillForAssignment = null; saveSkillAssignments(); } else { if (skillBar.slots[index].skillId) { skillBar.slots[index].skillId = null; skillBar.slots[index].cooldownUntil = 0; displaySkillsPanel(); saveSkillAssignments(); selectedSlotElementForAssignment = null; assignmentBar.querySelectorAll('.assign-skill-slot.selected-for-assignment').forEach(s => s.classList.remove('selected-for-assignment')); } else { skillAssignmentBar.querySelectorAll('.assign-skill-slot.selected-for-assignment').forEach(s => s.classList.remove('selected-for-assignment')); slot.classList.add('selected-for-assignment'); selectedSlotElementForAssignment = slot; learnedSkillsList?.querySelectorAll('.skill-item.selected-for-assignment').forEach(i => i.classList.remove('selected-for-assignment')); selectedSkillForAssignment = null; } } }
async function saveSkillAssignments() { if (!currentCharacterData || !auth.currentUser) return; const assignments = {}; skillBar.slots.forEach((s, i) => { assignments[i] = s.skillId || null; }); try { await updateDoc(doc(db, "characters", currentCharacterData.id), { skillAssignments: assignments }); currentCharacterData.skillAssignments = assignments; console.log("Assignments saved."); } catch (e) { console.error("Save assignments error:", e); displayError(charCreateError, "Failed to save skill setup."); } }

// --- Tooltip Functions ---
/**
 * Formats the HTML content for the item tooltip.
 * Now accepts an item instance which may include quantity.
 * @param {object} itemInstance - The item instance data (potentially with quantity).
 * @returns {string} HTML string for the tooltip.
 */
function formatItemTooltip(itemInstance) {
    if (!itemInstance) return '';

    // Helper to format stat keys (unchanged)
    function fmt(key) {
        const map = {
            'physicalDamageMin': 'Min Phys Dmg', 'physicalDamageMax': 'Max Phys Dmg',
            'attackSpeed': 'Attack Speed', 'critChance': 'Crit Chance %',
            'defense': 'Defense', 'addedPhysicalDamage': '+ Flat Phys Dmg',
            'percentIncreasedPhysicalDamage': '% Incr Phys Dmg',
            'percentIncreasedAttackSpeed': '% Incr Attack Speed',
        };
        return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }

    // --- Tooltip HTML Construction ---
    let html = `<div class="item-name rarity-${itemInstance.rarity || 'common'}">${itemInstance.name || 'Unknown Item'}</div>`;

    // --- Display Quantity if greater than 1 ---
     if (itemInstance.quantity && itemInstance.quantity > 1) {
        html += `<div class="item-quantity">Quantity: ${itemInstance.quantity}</div>`;
     }
    // -----------------------------------------

    if (itemInstance.type) {
        html += `<span class="item-type">${itemInstance.type} ${itemInstance.slot ? `(${itemInstance.slot.join('/')})` : ''}</span>`;
    }

    // Display Base Stats
    if (itemInstance.baseStats && Object.keys(itemInstance.baseStats).length > 0) {
         html += '<div class="item-stats-section">';
        Object.entries(itemInstance.baseStats).forEach(([key, value]) => {
            const name = fmt(key);
            let formattedValue = value;
            if (key.includes('percent') || key === 'critChance') {
                formattedValue = `${(value * 100).toFixed(1)}%`;
            } else if (key === 'attackSpeed') {
                formattedValue = value.toFixed(2);
            } else if (typeof value === 'number' && !Number.isInteger(value)) {
                 formattedValue = value.toFixed(1); // Basic float formatting
            }
            html += `<span class="item-stat">${name}: <span class="value">${formattedValue}</span></span>`;
        });
         html += '</div>';
    }

    // Display Stack Info (Max Stack) if stackable
    if (itemInstance.stackable) {
        html += `<span class="item-stack-info">Max Stack: ${itemInstance.maxStack || '?'}</span>`;
    }

    // Display Sell Value
    if (typeof itemInstance.sellValue === 'number' && itemInstance.sellValue > 0) {
        html += `<span class="item-sell-value">Sell Value: <span class="value currency">${itemInstance.sellValue}</span></span>`;
    }

    return html;
}
/**
 * Displays the item tooltip based on the hovered element.
 * Handles equipment slots, inventory slots (main panel & vendor panel), and loot items.
 * @param {Event} event The mouse event.
 * @param {HTMLElement} element The element being hovered over.
 */
function showTooltip(event, element) {
    if (!itemTooltip || !currentCharacterData) return; // Ensure tooltip element and character data exist
    let itemInstance = null; // Changed variable name to reflect we get the INSTANCE

    try { // Added try-catch for safety when accessing data attributes/arrays
        if (element.classList.contains('equip-slot')) {
            const slotName = element.dataset.slot;
            itemInstance = currentCharacterData.equipped?.[slotName] || null; // Get equipped item instance
        }
        else if (element.classList.contains('inv-slot') && element.classList.contains('has-item')) { // Check it's an inventory slot AND it has an item
            let itemIndex = -1;
            // Check for vendor panel's originalIndex first
            if (element.dataset.originalIndex !== undefined) {
                itemIndex = parseInt(element.dataset.originalIndex, 10);
            }
            // Fallback check for main inventory panel's slotIndex (if you use that elsewhere)
            else if (element.dataset.slotIndex !== undefined) {
                 itemIndex = parseInt(element.dataset.slotIndex, 10);
            }

            // Retrieve the specific item instance from the inventory array using the found index
            if (!isNaN(itemIndex) && itemIndex >= 0 && Array.isArray(currentCharacterData.inventory) && itemIndex < currentCharacterData.inventory.length) {
                itemInstance = currentCharacterData.inventory[itemIndex]; // Get the actual item object WITH quantity
            }
        }
        else if (element.classList.contains('loot-item') && element.dataset.itemData) {
            // Loot items have data stringified in dataset, parse it. Quantity isn't usually relevant here yet.
            itemInstance = JSON.parse(element.dataset.itemData);
        }
    } catch (e) {
         console.error("Error retrieving item data for tooltip:", e, "Element:", element);
         itemInstance = null;
    }


    // Now, display the tooltip using the retrieved item instance
    if (itemInstance) {
        itemTooltip.innerHTML = formatItemTooltip(itemInstance); // Pass the instance to format
        positionTooltip(event);
        itemTooltip.classList.add('visible');
        itemTooltip.classList.remove('hidden');
    } else {
        hideTooltip(); // Hide if no valid item instance was found
    }
}
function hideTooltip() { if (!itemTooltip) return; itemTooltip.classList.remove('visible'); itemTooltip.classList.add('hidden'); }
function positionTooltip(event) { if (!itemTooltip) return; const r=itemTooltip.getBoundingClientRect(); const ox=15, oy=15; let l=event.clientX+ox; let t=event.clientY+oy; if(l+r.width>window.innerWidth){l=event.clientX-r.width-ox;} if(t+r.height>window.innerHeight){t=event.clientY-r.height-oy;} if(l<0)l=ox; if(t<0)t=oy; itemTooltip.style.left=`${l}px`; itemTooltip.style.top=`${t}px`; }
function handleSlotMouseOver(event) { showTooltip(event, this); }
function handleSlotMouseOut(event) { hideTooltip(); }
function handleSlotMouseMove(event) { if (itemTooltip?.classList.contains('visible')) { positionTooltip(event); } }

// --- Player Appearance (for default skills) ---
function setPlayerAppearance() { if (!currentCharacterData) { skillBar.slots.forEach(slot => { slot.skillId = null; slot.cooldownUntil = 0; slot.cooldownStart = 0; }); return; } const charClass = currentCharacterData.class; skillBar.slots.forEach(slot => { slot.skillId = null; slot.cooldownUntil = 0; slot.cooldownStart = 0; }); switch (charClass) { case 'Juggernaut': skillBar.slots[4].skillId = 'basic_strike'; break; /* Add other classes */ default: skillBar.slots[4].skillId = 'basic_strike'; break; } console.log("Default skills set:", skillBar.slots.map(s => s.skillId)); }

// --- COMBAT LOGIC FUNCTIONS ---
let lastTickTime = 0;

/**
 * Initializes and shows the combat screen for a given zone.
 * @param {string} zoneId The ID of the zone to enter.
 */
function enterCombatZone(zoneId) {
    console.log(`--- enterCombatZone CALLED with zoneId: ${zoneId} ---`);
    currentZoneLoot = [];
    displayLoot();
    if (!currentCharacterData) { console.error("Cannot enter combat: No character data."); return; }
    if (isCombatActive) { console.warn("Already in combat?"); return; }

    const zoneInfo = ZONE_CONFIG[zoneId] || ZONE_CONFIG['default'];
    activeZoneId = zoneId;
    currentPackIndex = 0;
    totalPacksInZone = zoneInfo.packs || 1;
    isBossEncounter = false;
    lastAttackedTargetId = null;

    if (combatZoneName) combatZoneName.textContent = zoneInfo.name;

    if (enemyGrid) {
        const ct = `repeat(${zoneInfo.gridCols}, minmax(90px, 120px))`;
        const rt = `repeat(${zoneInfo.gridRows}, minmax(90px, 120px))`;
        enemyGrid.style.gridTemplateColumns = ct;
        enemyGrid.style.gridTemplateRows = rt;
    } else { console.error("Enemy grid container not found!"); return; }

    showScreen('combat');
    renderCombatSkillBar();
    displayCombatLoadout();

    // --- Initialize Player Combat Stats & UI ---
    // TODO: These should pull directly from currentCharacterData.stats or similar derived values
    PLAYER_STATS_PLACEHOLDER.currentHp = currentCharacterData.maxHp || PLAYER_STATS_PLACEHOLDER.maxHp; // Example if HP is stored on char
    PLAYER_STATS_PLACEHOLDER.currentMana = currentCharacterData.maxMana || PLAYER_STATS_PLACEHOLDER.maxMana;
    updateResourceDisplay(); // Updates HP/Mana bars

    // --- Initialize/Update Combat XP Bar ---
    updateXpBarDisplay();
    // ---------------------------------------

    if (combatLog) { combatLog.innerHTML = ''; }
    addCombatLogMessage(`Entering ${zoneInfo.name}...`);

    isCombatActive = true;
    loadNextEncounter();

    lastTickTime = 0;
    if (combatLoopRequestId) { cancelAnimationFrame(combatLoopRequestId); }
    combatLoopRequestId = requestAnimationFrame(combatTick);
    addCombatSkillListeners();
}
// NEW FUNCTION BLOCK

function displayCombatLoadout() {
    console.log("Displaying combat loadout...");
    const placeholderCard = document.getElementById('left-placeholder-card');
    if (!placeholderCard) {
        console.error("Left placeholder card not found for combat loadout.");
        return;
    }
    if (!currentCharacterData || !currentCharacterData.equipped) {
        placeholderCard.innerHTML = '<p>Loadout data unavailable.</p>';
        console.warn("Cannot display loadout - character data or equipped object missing.");
        return;
    }

    // Clear previous content
    placeholderCard.innerHTML = '';
    placeholderCard.style.alignItems = 'flex-start'; // Align items to top instead of center
    placeholderCard.style.justifyContent = 'flex-start'; // Align to start
    placeholderCard.style.padding = '0.75rem'; // Adjust padding


    // Create container for the loadout grid
    const loadoutContainer = document.createElement('div');
    loadoutContainer.id = 'combat-loadout-display'; // Use this ID for styling
    loadoutContainer.style.display = 'grid';
    // Define grid layout (similar to town, maybe smaller gaps)
    loadoutContainer.style.gridTemplateAreas = `
        "head head"
        "weapon1 chest"
        "weapon2 legs"
        "accessory1 feet"
        "accessory2 ."
    `;
    loadoutContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    loadoutContainer.style.gap = '0.5rem'; // Smaller gap
    loadoutContainer.style.width = '100%'; // Take full width of placeholder

    // Define the slots to display
    const slotsToShow = ['head', 'chest', 'legs', 'feet', 'weapon1', 'weapon2', 'accessory1', 'accessory2'];

    // --- Create and Populate Slots ---
    slotsToShow.forEach(slotName => {
        const slotEl = document.createElement('div');
        slotEl.className = 'equip-slot combat-equip-slot'; // Use town style + specific combat style
        slotEl.dataset.slot = slotName; // Set data attribute for targeting/tooltips
        slotEl.style.gridArea = slotName; // Assign to grid area

        const item = currentCharacterData.equipped[slotName];

        // Remove existing listeners before adding (safety for potential re-renders)
        slotEl.removeEventListener('mouseover', handleSlotMouseOver);
        slotEl.removeEventListener('mouseout', handleSlotMouseOut);
        slotEl.removeEventListener('mousemove', handleSlotMouseMove);

        if (item && item.name) {
            // Item exists - display name, style, add listeners
            slotEl.textContent = item.name;
            slotEl.style.color = '#e5e7eb';
            slotEl.style.borderStyle = 'solid';
            slotEl.style.borderColor = '#6b7280';
            slotEl.style.fontSize = '0.7rem'; // Smaller text maybe
            slotEl.style.minHeight = '35px'; // Smaller min height maybe
            slotEl.style.cursor = 'pointer'; // Indicate tooltip hover
            slotEl.dataset.itemId = item.id; // Store ID if needed

            // Attach tooltip listeners from town inventory logic
            slotEl.addEventListener('mouseover', handleSlotMouseOver);
            slotEl.addEventListener('mouseout', handleSlotMouseOut);
            slotEl.addEventListener('mousemove', handleSlotMouseMove);
        } else {
            // No item - display placeholder
            slotEl.textContent = slotName.charAt(0).toUpperCase() + slotName.slice(1);
            slotEl.style.color = '#6b7280';
            slotEl.style.borderStyle = 'dashed';
            slotEl.style.borderColor = '#4b5563';
            slotEl.style.fontSize = '0.7rem';
            slotEl.style.minHeight = '35px';
            slotEl.style.cursor = 'default';
            delete slotEl.dataset.itemId;
        }
        loadoutContainer.appendChild(slotEl);
    });

    placeholderCard.appendChild(loadoutContainer);
}
// END OF NEW FUNCTION BLOCK

function leaveCombatZone() {
    currentZoneLoot = []; // Clear any remaining loot from the combat zone
    displayLoot();      // Update the loot UI to be empty

    console.log("Leaving combat zone.");
    isCombatActive = false; // Stop combat loop and related logic

    if (combatLoopRequestId) {
        cancelAnimationFrame(combatLoopRequestId);
        combatLoopRequestId = null;
        console.log("Combat loop stopped.");
    }

    // Remove combat-specific input listeners
    document.removeEventListener('keydown', handleCombatKeyPress);
    document.removeEventListener('keyup', handleCombatKeyRelease);
    document.removeEventListener('mousedown', handleCombatMouseClick);
    document.removeEventListener('mouseup', handleCombatMouseRelease);
    document.removeEventListener('contextmenu', preventContextMenu);
    document.removeEventListener('mousemove', handleCombatMouseMoveRepeat);

    // Reset combat state variables
    activeRepeatSkillId = null;
    activeRepeatTargetId = null;
    keysDown = {};
    document.querySelectorAll('.enemy-card.repeat-hover-target').forEach(el => el.classList.remove('repeat-hover-target'));
    currentEnemies = [];
    gridState = [];
    if (enemyGrid) enemyGrid.innerHTML = ''; // Clear enemy display
    lastAttackedTargetId = null;
    activeZoneId = null; // Clear the record of the active combat zone
    currentPackIndex = 0;
    totalPacksInZone = 0;
    isBossEncounter = false;

    // --- Switch to Town Screen & Update Header ---
    showScreen('town');
    activateTownPanel('overview-panel'); // Or 'map-panel', or your preferred default

    // --- Explicitly update the town currency, level, and XP bar display ---
    if (currentCharacterData) { // Ensure character data is available
        if (townCurrency) {
            townCurrency.textContent = currentCharacterData.currency || 0;
        }
        if (townCharLevel) {
            townCharLevel.textContent = currentCharacterData.level || '1';
        }
        updateXpBarDisplay(); // Update the XP bar with current XP/XP to next level
        console.log("Updated town UI (currency, level, XP) on returning to town.");
    }
    // ------------------------------------------------------------------

    // Scroll combat log to the bottom (if it has content)
    if (combatLog && combatLog.scrollHeight > combatLog.clientHeight) {
        combatLog.scrollTop = combatLog.scrollHeight;
    }
}
function loadNextEncounter() {
    console.log(`--- loadNextEncounter CALLED ---`); console.log(`State: currentPack=${currentPackIndex}, totalPacks=${totalPacksInZone}, isBoss=${isBossEncounter}, activeZoneId=${activeZoneId}`); console.log("Checking isCombatActive:", isCombatActive);
    if (!isCombatActive) { console.log("Exiting loadNextEncounter because !isCombatActive"); return; }
    const zoneInfo = ZONE_CONFIG[activeZoneId] || ZONE_CONFIG['default']; if (!zoneInfo) { console.error("!!! Failed to get zoneInfo in loadNextEncounter for:", activeZoneId); return; }
    console.log("ZoneInfo retrieved successfully."); lastAttackedTargetId = null; document.querySelectorAll('.enemy-card.targeted').forEach(el => el.classList.remove('targeted')); console.log("Target cleared.");
    console.log(`Checking condition: ${currentPackIndex} >= ${totalPacksInZone} ?`);
    if (currentPackIndex >= totalPacksInZone) { console.log(">>> CONDITION TRUE: Loading Boss Encounter."); isBossEncounter = true; loadBossEncounter(zoneInfo); }
    else { console.log(`>>> CONDITION FALSE: Loading Enemy Pack ${currentPackIndex + 1} of ${totalPacksInZone}.`); isBossEncounter = false; loadEnemyPack(zoneInfo, currentPackIndex); }
    console.log(`Incrementing currentPackIndex from ${currentPackIndex} to ${currentPackIndex + 1}`); currentPackIndex++; console.log("--- loadNextEncounter FINISHED ---");
}

function loadEnemyPack(zoneInfo, packIndex) {
    console.log(`--- loadEnemyPack CALLED for packIndex: ${packIndex} ---`); console.log("Received zoneInfo:", JSON.stringify(zoneInfo));
    if (!enemyGrid || !zoneInfo) { console.error("loadEnemyPack preconditions failed."); return; }
    enemyGrid.innerHTML = ''; currentEnemies = []; const gridCols = zoneInfo.gridCols; const gridRows = zoneInfo.gridRows; gridState = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
    console.log(`Values for count calc: minPerPack=${zoneInfo.enemyCountMinPerPack}, maxPerPack=${zoneInfo.enemyCountMaxPerPack}, cols=${gridCols}, rows=${gridRows}`);
    const min = zoneInfo.enemyCountMinPerPack || 1; const max = zoneInfo.enemyCountMaxPerPack || (gridCols * gridRows); const maxPossible = gridCols * gridRows; const actualMax = Math.min(max, maxPossible); const actualMin = Math.min(min, actualMax);
    if (typeof actualMin !== 'number' || typeof actualMax !== 'number' || actualMin > actualMax) { console.error(`Invalid min/max range: Min=${actualMin}, Max=${actualMax}`); /* Handle error? */ }
    const enemyCount = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
    console.log(`Calculated enemyCount for pack ${packIndex + 1}: ${enemyCount}`);
    let possibleEnemies = zoneInfo.possibleEnemies || Object.keys(ENEMY_DEFINITIONS); const availableCoords = []; for (let y = 0; y < gridRows; y++) { for (let x = 0; x < gridCols; x++) { availableCoords.push({ x, y }); } }
    for (let i = availableCoords.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [availableCoords[i], availableCoords[j]] = [availableCoords[j], availableCoords[i]]; }
    const spawnCoords = availableCoords.slice(0, enemyCount); const spawnSet = new Set(spawnCoords.map(coord => `${coord.x},${coord.y}`)); console.log("Spawn Set:", spawnSet);
    for (let y = 0; y < gridRows; y++) { for (let x = 0; x < gridCols; x++) { const coordKey = `${x},${y}`; /* console.log(`Checking cell [${x},${y}], key: ${coordKey}, in set: ${spawnSet.has(coordKey)}`); */ let cellElement; if (spawnSet.has(coordKey)) { /* console.log(`   >>> Spawning enemy at [${x},${y}]`); */ const enemyTypeKey = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)]; const baseEnemyData = ENEMY_DEFINITIONS[enemyTypeKey] || { id: `unknown_${x}_${y}`, name: 'Unknown', hp: 50, defense: 0 }; const enemyData = { instanceId: `enemy_${Date.now()}_${x}_${y}`, typeId: baseEnemyData.id, name: baseEnemyData.name, maxHp: baseEnemyData.hp, currentHp: baseEnemyData.hp, defense: baseEnemyData.defense || 0, gridX: x, gridY: y, element: null }; currentEnemies.push(enemyData); gridState[y][x] = enemyData; const card = document.createElement('div'); card.className = 'enemy-card'; card.dataset.enemyInstanceId = enemyData.instanceId; card.dataset.gridX = x; card.dataset.gridY = y; const nameEl = document.createElement('div'); nameEl.className = 'enemy-name'; nameEl.textContent = enemyData.name; card.appendChild(nameEl); const hpBar = document.createElement('div'); hpBar.className = 'enemy-hp-bar'; const hpFill = document.createElement('div'); hpFill.className = 'enemy-hp-fill'; hpFill.style.width = `100%`; hpBar.appendChild(hpFill); card.appendChild(hpBar); const hpText = document.createElement('div'); hpText.className = 'enemy-hp-text'; hpText.style.fontSize = '0.7rem'; hpText.style.marginTop = '0.25rem'; hpText.textContent = `${enemyData.currentHp}/${enemyData.maxHp}`; card.appendChild(hpText); enemyData.element = card; cellElement = card; } else { cellElement = document.createElement('div'); cellElement.className = 'grid-cell empty-cell'; gridState[y][x] = null; } enemyGrid.appendChild(cellElement); } }
    addCombatLogMessage(`Encounter: Pack ${packIndex + 1} / ${totalPacksInZone}`);
}

function loadBossEncounter(zoneInfo) {
    console.log(`--- loadBossEncounter CALLED ---`); console.log("Received zoneInfo:", JSON.stringify(zoneInfo));
    if (!enemyGrid || !zoneInfo) { console.error("loadBossEncounter preconditions failed."); return; }
    enemyGrid.innerHTML = ''; currentEnemies = []; const gridCols = zoneInfo.gridCols; const gridRows = zoneInfo.gridRows; gridState = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
    const bossId = zoneInfo.bossId; const bossBaseData = ENEMY_DEFINITIONS[bossId]; if (!bossBaseData) { console.error(`Boss definition not found: ${bossId}`); addCombatLogMessage(`Error: Boss data missing!`); return; }
    console.log(`Spawning Boss: ${bossBaseData.name}`); addCombatLogMessage(`Encounter: Boss - ${bossBaseData.name}!`);
    const bossX = Math.floor(gridCols / 2); const bossY = Math.floor(gridRows / 3);
    const bossData = { instanceId: `boss_${Date.now()}`, typeId: bossBaseData.id, name: bossBaseData.name, maxHp: bossBaseData.hp, currentHp: bossBaseData.hp, defense: bossBaseData.defense || 0, gridX: bossX, gridY: bossY, element: null }; currentEnemies.push(bossData); if(gridState[bossY]?.[bossX] !== undefined) gridState[bossY][bossX] = bossData; // Check bounds before setting state
    const card = document.createElement('div'); card.className = 'enemy-card boss-card'; card.dataset.enemyInstanceId = bossData.instanceId; card.dataset.gridX = bossX; card.dataset.gridY = bossY; const nameEl = document.createElement('div'); nameEl.className = 'enemy-name'; nameEl.textContent = bossData.name; card.appendChild(nameEl); const hpBar = document.createElement('div'); hpBar.className = 'enemy-hp-bar'; const hpFill = document.createElement('div'); hpFill.className = 'enemy-hp-fill'; hpFill.style.width = `100%`; hpBar.appendChild(hpFill); card.appendChild(hpBar); const hpText = document.createElement('div'); hpText.className = 'enemy-hp-text'; hpText.style.fontSize = '0.7rem'; hpText.style.marginTop = '0.25rem'; hpText.textContent = `${bossData.currentHp}/${bossData.maxHp}`; card.appendChild(hpText); bossData.element = card;
    for (let y = 0; y < gridRows; y++) { for (let x = 0; x < gridCols; x++) { if (x === bossX && y === bossY) { enemyGrid.appendChild(card); } else { const cellElement = document.createElement('div'); cellElement.className = 'grid-cell empty-cell'; gridState[y][x] = null; enemyGrid.appendChild(cellElement); } } }
}

function renderCombatSkillBar() { if (!playerSkillBarCombat) return; playerSkillBarCombat.innerHTML = ''; skillBar.slots.forEach((slotData, i) => { const slotDiv = document.createElement('div'); slotDiv.className = 'assign-skill-slot combat-skill-slot'; if (i >= 4) slotDiv.classList.add('mouse-skill'); slotDiv.dataset.slotIndex = i; slotDiv.dataset.skillId = slotData.skillId || ''; const cooldownOverlay = document.createElement('div'); cooldownOverlay.className = 'skill-cooldown-overlay'; slotDiv.appendChild(cooldownOverlay); const cooldownText = document.createElement('div'); cooldownText.className = 'skill-cooldown-text'; slotDiv.appendChild(cooldownText); const keySpan = document.createElement('span'); keySpan.textContent = slotData.key || '?'; slotDiv.appendChild(keySpan); const nameDiv = document.createElement('div'); nameDiv.className = 'assigned-skill-name'; const skillId = slotData.skillId; const skillDef = skillId ? ATTACK_DEFINITIONS[skillId] : null; if (skillDef) { nameDiv.textContent = skillDef.name || skillId.replace(/_/g, ' '); slotDiv.style.opacity = '1'; slotDiv.classList.add('assigned'); } else { nameDiv.textContent = '[Empty]'; nameDiv.classList.add('empty'); slotDiv.style.opacity = '0.6'; slotDiv.classList.remove('assigned'); } slotDiv.appendChild(nameDiv); playerSkillBarCombat.appendChild(slotDiv); }); }

// --- Combat Input Handling ---
function addCombatSkillListeners() { document.removeEventListener('keydown', handleCombatKeyPress); document.removeEventListener('keyup', handleCombatKeyRelease); document.removeEventListener('mousedown', handleCombatMouseClick); document.removeEventListener('mouseup', handleCombatMouseRelease); document.removeEventListener('contextmenu', preventContextMenu); document.addEventListener('keydown', handleCombatKeyPress); document.addEventListener('keyup', handleCombatKeyRelease); document.addEventListener('mousedown', handleCombatMouseClick); document.addEventListener('mouseup', handleCombatMouseRelease); document.addEventListener('contextmenu', preventContextMenu); }
function preventContextMenu(event) { if (isCombatActive) event.preventDefault(); }
function handleCombatKeyPress(event) { if (!isCombatActive || event.repeat) return; const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 }; const slotIndex = keyMap[event.key]; if (slotIndex !== undefined) { event.preventDefault(); const slotData = skillBar.slots[slotIndex]; if (slotData && slotData.skillId) { keysDown[event.key] = true; activeRepeatSkillId = slotData.skillId; activeRepeatTargetId = lastAttackedTargetId; attemptUseSkill(activeRepeatSkillId, activeRepeatTargetId); } } }
function handleCombatKeyRelease(event) { if (!isCombatActive) return; const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 }; const slotIndex = keyMap[event.key]; if (slotIndex !== undefined) { keysDown[event.key] = false; const slotData = skillBar.slots[slotIndex]; if (slotData && slotData.skillId && slotData.skillId === activeRepeatSkillId) { activeRepeatSkillId = null; activeRepeatTargetId = null; /* TODO: Fallback */ } } }
function handleCombatMouseClick(event) { // Mousedown now
    if (!isCombatActive) return;

    let slotIndex = -1;
    let buttonKey = null;

    if (event.button === 0) { slotIndex = 4; buttonKey = 'LMB'; }
    else if (event.button === 2) { slotIndex = 5; buttonKey = 'RMB'; }

    if (slotIndex !== -1 && buttonKey) {
        const slotData = skillBar.slots[slotIndex];
        if (slotData && slotData.skillId) {
             console.log(`Mouse Down: ${buttonKey} -> ${slotData.skillId}`);
             keysDown[buttonKey] = true;

             const targetElement = event.target.closest('.enemy-card');
             let targetInstanceId = null;
             if(targetElement) {
                 targetInstanceId = targetElement.dataset.enemyInstanceId;
                 const targetData = currentEnemies.find(e => e.instanceId === targetInstanceId);
                 if (!targetData || targetData.currentHp <=0) { targetInstanceId = null; }
             }

             activeRepeatSkillId = slotData.skillId;
             activeRepeatTargetId = targetInstanceId;
             attemptUseSkill(activeRepeatSkillId, activeRepeatTargetId); // Attempt immediate use

             // --- ADD Mousemove Listener ---
             console.log("Adding mousemove listener for repeat targeting");
             document.addEventListener('mousemove', handleCombatMouseMoveRepeat);
             // Add initial hover target feedback
             document.querySelectorAll('.enemy-card.repeat-hover-target').forEach(el => el.classList.remove('repeat-hover-target'));
             if (targetInstanceId && targetElement) {
                 targetElement.classList.add('repeat-hover-target');
             }
             // -----------------------------

        } else { /* No skill bound */ }
    }
}
function handleCombatMouseRelease(event) {
    if (!isCombatActive) return;

    let slotIndex = -1;
    let buttonKey = null;

    if (event.button === 0) { slotIndex = 4; buttonKey = 'LMB'; }
    else if (event.button === 2) { slotIndex = 5; buttonKey = 'RMB'; }

    if (slotIndex !== -1 && buttonKey) {
         keysDown[buttonKey] = false;
         const slotData = skillBar.slots[slotIndex];

         // If the released button corresponds to the currently repeating skill
         if (slotData && slotData.skillId && slotData.skillId === activeRepeatSkillId) {
              console.log(`Mouse Up: ${buttonKey} -> Stopping repeat for ${activeRepeatSkillId}`);

              // --- REMOVE Mousemove Listener ---
              console.log("Removing mousemove listener");
              document.removeEventListener('mousemove', handleCombatMouseMoveRepeat);
              // Clear hover target feedback
              document.querySelectorAll('.enemy-card.repeat-hover-target').forEach(el => el.classList.remove('repeat-hover-target'));
              // -------------------------------

              activeRepeatSkillId = null;
              activeRepeatTargetId = null;
              // TODO: Implement fallback to other held keys/buttons if desired
         }
    }
}
// --- Skill Execution Logic ---
function attemptUseSkill(skillId, targetId) {
    if (!isCombatActive) return; const skillDef = ATTACK_DEFINITIONS[skillId]; if (!skillDef) { console.error(`Skill definition not found: ${skillId}`); return; } const slotData = skillBar.slots.find(slot => slot.skillId === skillId); if (!slotData) { console.error(`Skill slot data not found: ${skillId}`); return; } const now = Date.now(); if (now < slotData.cooldownUntil) { return; } const needsTarget = skillDef.requiresTarget !== false && (skillDef.tags?.includes('ATTACK') || skillDef.tags?.includes('SINGLE_TARGET') || skillDef.aoe?.targeting === 'centered_on_target'); if (needsTarget && !targetId) { addCombatLogMessage(`Select a target for ${skillDef.name}.`); return; } if (targetId) { const targetData = currentEnemies.find(e => e.instanceId === targetId); if (!targetData || targetData.currentHp <= 0) { addCombatLogMessage(`Invalid target.`); return; } } const cost = skillDef.cost || 0; if (PLAYER_STATS_PLACEHOLDER.currentMana < cost) { addCombatLogMessage(`Not enough ${skillDef.costType || 'MANA'} for ${skillDef.name} (Need ${cost}).`); return; } executeSkill(skillDef, slotData, targetId);
}

// MODIFIED FUNCTION BLOCK (only the call to calculateDamage changes)
function executeSkill(skillDef, slotData, targetId) {
    const now = Date.now();

    // 1. Deduct Cost (using placeholder for now, needs update)
    const cost = skillDef.cost || 0;
    // TODO: Use actual character resource: currentCharacterData.mana -= cost;
    PLAYER_STATS_PLACEHOLDER.currentMana -= cost; // Still using placeholder for mana deduction
    updateResourceDisplay(); // Update UI

    // 2. Set Cooldown
    slotData.cooldownStart = now;
    slotData.cooldownUntil = now + (skillDef.cooldown || 1000);
    updateCooldownVisuals();

    // 3. Find Primary Target Data
    const primaryTargetData = targetId ? currentEnemies.find(enemy => enemy.instanceId === targetId) : null;
    if (targetId && !primaryTargetData) { console.warn(`Primary target ${targetId} vanished.`); return; }

    // 4. Find All Affected Targets
    const affectedTargets = findAffectedTargets(skillDef, primaryTargetData);

    // 5. Apply Effects (Damage) to Targets
    addCombatLogMessage(`${currentCharacterData?.name || 'Player'} used ${skillDef.name}!`);
    let successfullyHit = false;
    if (affectedTargets.length > 0) {
        affectedTargets.forEach(targetData => {
            // --- PASS currentCharacterData instead of placeholder ---
            const damageDealt = calculateDamage(skillDef, currentCharacterData, targetData);
            // -------------------------------------------------------
            applyDamage(targetData, damageDealt); // applyDamage handles HP check
            addCombatLogMessage(`-> Hit ${targetData.name} for ${damageDealt} damage.`);
            successfullyHit = true;
        });
        // Update Last Attacked Target
        if (targetId && successfullyHit) { lastAttackedTargetId = targetId; console.log("Set lastAttackedTargetId:", lastAttackedTargetId); }

    } else if (skillDef.tags?.includes('ATTACK')) {
         addCombatLogMessage(`-> Missed or no valid targets.`);
    }

    // 6. Trigger Animations / Visual Effects (Placeholder)
    // ...
}
// END OF MODIFIED FUNCTION BLOCK
function findAffectedTargets(skillDef, primaryTargetData) {
    if (!skillDef) return []; const gridRows = gridState.length; const gridCols = gridState[0]?.length || 0; if (gridRows === 0 || gridCols === 0) return []; if (!skillDef.aoe || skillDef.tags?.includes('SINGLE_TARGET')) { return (primaryTargetData && primaryTargetData.currentHp > 0) ? [primaryTargetData] : []; } if (skillDef.aoe.type === 'grid_shape' && primaryTargetData) { const affected = new Set(); const { width, height, targeting } = skillDef.aoe; const pX = primaryTargetData.gridX; const pY = primaryTargetData.gridY; let sX = (targeting === 'centered_on_target') ? pX - Math.floor((width -1) / 2) : pX; let sY = (targeting === 'centered_on_target') ? pY - Math.floor((height -1) / 2) : pY; for (let yO = 0; yO < height; yO++) { for (let xO = 0; xO < width; xO++) { const cX = sX + xO; const cY = sY + yO; if (cX >= 0 && cX < gridCols && cY >= 0 && cY < gridRows) { const target = gridState[cY][cX]; if (target && target.currentHp > 0) { affected.add(target); } } } } return Array.from(affected); } return [];
}

// REVISED FUNCTION BLOCK

function calculateDamage(skillDef, attackerData, targetData) {
    console.log(`\n--- Calculating Damage ---`); // Start calculation log group
    console.log(`Skill: ${skillDef?.name || skillDef?.id || 'Unknown Skill'}`);
    console.log(`Attacker: ${attackerData?.name || 'Unknown Attacker'}`);
    console.log(`Target: ${targetData?.name || 'Unknown Target'} (Defense: ${targetData?.defense || 0})`);

    // --- 1. Base Weapon Damage ---
    let weaponMinDmg = 1; // Unarmed
    let weaponMaxDmg = 2;
    const primaryWeapon = attackerData?.equipped?.weapon1;

    if (primaryWeapon && primaryWeapon.baseStats) {
        weaponMinDmg = primaryWeapon.baseStats.physicalDamageMin || weaponMinDmg;
        weaponMaxDmg = primaryWeapon.baseStats.physicalDamageMax || weaponMaxDmg;
        console.log(` -> Base Weapon: ${primaryWeapon.name} (${weaponMinDmg}-${weaponMaxDmg})`);
    } else {
        console.log(` -> Base Weapon: Unarmed (${weaponMinDmg}-${weaponMaxDmg})`);
    }
    if (weaponMaxDmg < weaponMinDmg) weaponMaxDmg = weaponMinDmg;
    const weaponRoll = weaponMinDmg + Math.random() * (weaponMaxDmg - weaponMinDmg);
    console.log(` -> Weapon Roll: ${weaponRoll.toFixed(2)}`);

    // --- 2. Base Damage from Skill Interaction ---
    const skillWeaponMultiplier = skillDef.weaponDamageMultiplier ?? 1.0;
    const skillEffectiveness = skillDef.effectiveness ?? 1.0;
    let baseSkillDamage = weaponRoll * skillWeaponMultiplier * skillEffectiveness;
    console.log(` -> Skill Base (Roll * Wpn Multi [${skillWeaponMultiplier.toFixed(2)}] * Effect [${skillEffectiveness.toFixed(2)}]): ${baseSkillDamage.toFixed(2)}`);

    // --- 3. Aggregate Stats from ALL Equipped Gear ---
    let totalFlatPhysical = 0;
    let totalPercentIncreasedPhysical = 0;
    // console.log("--- Aggregating Gear Stats ---"); // Included below now
    for (const slot in attackerData.equipped) {
        const item = attackerData.equipped[slot];
        if (item && item.baseStats) {
            // console.log(`Processing item in slot [${slot}]: ${item.name}`); // Optional item-by-item log
            const itemFlatPhys = item.baseStats.addedPhysicalDamage || 0;
            const itemPercentPhys = item.baseStats.percentIncreasedPhysicalDamage || 0;
            totalFlatPhysical += itemFlatPhys;
            totalPercentIncreasedPhysical += itemPercentPhys;
        }
    }
    console.log(` -> Gear Totals: +${totalFlatPhysical} Flat Phys, +${(totalPercentIncreasedPhysical * 100).toFixed(0)}% Increased Phys`);
    // console.log("-----------------------------");

    // --- 4. (Future) Add Damage from Character Base Stats & Scaling ---
    // console.log(` -> Adding Stat Bonuses... (Not implemented)`);

    // --- 5. Apply Aggregated Stats ---
    // Apply flat damage first
    let modifiedBaseDamage = baseSkillDamage + totalFlatPhysical;
    console.log(` -> Base + Flat Phys: ${modifiedBaseDamage.toFixed(2)}`);

    // Apply percentage increases
    let finalDamageBeforeMitigation = modifiedBaseDamage * (1 + totalPercentIncreasedPhysical);
    console.log(` -> After % Increase (x ${ (1 + totalPercentIncreasedPhysical).toFixed(2) }): ${finalDamageBeforeMitigation.toFixed(2)}`);

    // --- 6. Apply Target Mitigation ---
    const defense = targetData.defense || 0;
    const damageReduction = Math.max(0, Math.min(0.9, defense / (defense + 50))); // Example formula
    const mitigatedDamage = finalDamageBeforeMitigation * (1 - damageReduction);
    console.log(` -> Target Mitigation (Def: ${defense}, Reduction: ${(damageReduction * 100).toFixed(1)}%): ${mitigatedDamage.toFixed(2)}`);

    // --- 7. Final Checks ---
    if (finalDamageBeforeMitigation <= 0 && !skillDef.canBeNegative) {
         console.log(" -> Damage <= 0, returning 0.");
         console.log(`--- Damage Calculation End ---`);
         return 0;
    }

    // Ensure minimum damage (e.g., always deal at least 1) and round
    const finalDamage = Math.max(1, Math.round(mitigatedDamage));
    console.log(` -> Final Damage (Min 1, Rounded): ${finalDamage}`);
    console.log(`--- Damage Calculation End ---`); // End calculation log group

    // TODO: Add Critical Strike Calculation logging here if applicable

    return finalDamage;
}
// END OF REVISED FUNCTION BLOCK
// MODIFIED FUNCTION BLOCK (applyDamage - Relevant part)
// MODIFIED FUNCTION BLOCK (Fixed isDead declaration order)
function applyDamage(targetData, damageAmount) {
    if (!targetData || targetData.currentHp <= 0) return; // Already dead or invalid

    // 1. Apply damage
    targetData.currentHp -= damageAmount;

    // 2. Determine if the target is now dead *immediately after* applying damage
    let isDead = targetData.currentHp <= 0; // <<< MOVED DECLARATION HERE

    // 3. Update Visuals
    if (targetData.element) {
        const hpFill = targetData.element.querySelector('.enemy-hp-fill');
        const hpText = targetData.element.querySelector('.enemy-hp-text');

        // Check the already defined isDead variable
        if (!isDead) {
            // --- Target Still Alive ---
            const healthPercent = Math.max(0, (targetData.currentHp / targetData.maxHp) * 100);
            if (hpFill) hpFill.style.width = `${healthPercent}%`;
            // Display current HP, don't round down yet if it's like 0.5
            if (hpText) hpText.textContent = `${targetData.currentHp <= 0 ? 0 : targetData.currentHp}/${targetData.maxHp}`;
            showDamageNumber(targetData.element, damageAmount);
            targetData.element.classList.add('hit');
            setTimeout(() => targetData.element?.classList.remove('hit'), 150);
        } else {
            // --- Target Just Died ---
            // Update final HP display before clearing content
             targetData.currentHp = 0; // Ensure HP doesn't show negative
             if (hpFill) hpFill.style.width = `0%`;
             if (hpText) hpText.textContent = `0/${targetData.maxHp}`;

            // Make non-interactive immediately
            targetData.element.onclick = null;
            targetData.element.style.cursor = 'default';

            // Add classes for styling
            targetData.element.classList.add('defeated');
            targetData.element.classList.add('enemy-remains');

            // Clear content after animation delay
            setTimeout(() => {
                 if (targetData.element) {
                    targetData.element.querySelector('.enemy-name')?.remove();
                    targetData.element.querySelector('.enemy-hp-bar')?.remove();
                    targetData.element.querySelector('.enemy-hp-text')?.remove();
                 }
            }, 1000);
        }
    }

    // 4. Handle Death Logic (if target is dead)
    if (isDead) { // <<< Now this check uses the declared variable
        console.log(`${targetData.name} defeated!`);
        addCombatLogMessage(`${targetData.name} was defeated!`);

        // Call Loot Handler
        handleEnemyDeath(targetData);

        // Remove from active enemies list
        const enemyIndex = currentEnemies.findIndex(e => e.instanceId === targetData.instanceId);
        if (enemyIndex > -1) { currentEnemies.splice(enemyIndex, 1); }
        else { console.warn("Defeated enemy not found in currentEnemies:", targetData.instanceId); }

        // Mark as null in grid state
        if (targetData.gridY >= 0 && targetData.gridY < gridState.length &&
            targetData.gridX >= 0 && gridState[targetData.gridY] && targetData.gridX < gridState[targetData.gridY].length) {
             gridState[targetData.gridY][targetData.gridX] = null;
        } else {
            console.warn("Invalid grid coordinates for defeated enemy:", targetData);
        }


        if (lastAttackedTargetId === targetData.instanceId) { lastAttackedTargetId = null; }

        // Check if Encounter is Over
        if (currentEnemies.length === 0) {
            console.log("Encounter cleared!");
            if (isBossEncounter) {
                addCombatLogMessage(`Boss Defeated!`);
                completeZone(activeZoneId);
            } else {
                addCombatLogMessage(`Pack ${currentPackIndex} / ${totalPacksInZone} Cleared!`);
                addCombatLogMessage("Loading next encounter...");
                setTimeout(loadNextEncounter, 1500);
            }
        }
    }
}

function handleLootItemMouseOver(event) {
    showTooltip(event, this); // 'this' refers to the loot list item
}
function handleLootItemMouseOut(event) {
    hideTooltip();
}
function handleLootItemMouseMove(event) {
    if (itemTooltip?.classList.contains('visible')) {
        positionTooltip(event);
    }
}

/**
 * Handles logic for when a zone is cleared (boss defeated).
 * Updates COMPLETE_ZONE mission objectives, unlocks next zone, saves progress,
 * and shows completion options in the header.
 * @param {string} zoneId The ID of the zone that was completed.
 */
async function completeZone(zoneId) {
    console.log(`--- completeZone START for zone: ${zoneId} ---`);
    addCombatLogMessage("Zone Cleared! Congratulations!");
    isCombatActive = false; // Stop combat loop actions, enemy attacks etc.
    activeRepeatSkillId = null;
    activeRepeatTargetId = null;

    const zoneInfo = ZONE_CONFIG[zoneId] || ZONE_CONFIG['default'];
    const nextZoneIdToUnlock = zoneInfo.unlocksZoneId;
    let characterDataChanged = false; // Flag to indicate if a save to Firestore is needed

    // --- Update Mission Objectives: COMPLETE_ZONE ---
    if (currentCharacterData && currentCharacterData.activeMissions) {
        console.log(`Checking active missions for COMPLETE_ZONE objectives related to ${zoneId}`);
        for (const missionId in currentCharacterData.activeMissions) {
            const activeMission = currentCharacterData.activeMissions[missionId];
            // Only consider missions that are currently 'ACTIVE' (not already 'OBJECTIVES_MET' or other states)
            if (activeMission.status !== 'ACTIVE') continue;

            const missionDef = MISSION_DEFINITIONS[missionId];
            if (!missionDef) continue;

            let missionProgressMadeThisIteration = false;
            for (const objDef of missionDef.objectives) {
                if (objDef.type === 'COMPLETE_ZONE' && objDef.targetId === zoneId) {
                    const objectiveProgress = activeMission.objectivesProgress[objDef.id];
                    if (objectiveProgress && !objectiveProgress.isComplete) {
                        objectiveProgress.currentCount = (objectiveProgress.currentCount || 0) + 1;

                        if (objectiveProgress.currentCount >= objDef.requiredCount) {
                            objectiveProgress.isComplete = true;
                            console.log(`Objective '${objDef.text}' for mission '${missionDef.title}' COMPLETED by clearing zone ${zoneId}.`);
                            addCombatLogMessage(`Objective Complete: ${missionDef.title} - ${objDef.text.substring(0,30)}...`, 'quest');
                        }
                        missionProgressMadeThisIteration = true;
                        characterDataChanged = true; // Mark that mission progress data changed
                    }
                }
            }

            if (missionProgressMadeThisIteration) {
                // Check if the entire mission is now ready to claim (this also saves the 'OBJECTIVES_MET' status)
                await checkMissionCompletion(missionId);
                // checkMissionCompletion will handle its own save if status changes to OBJECTIVES_MET
                // but we still mark characterDataChanged for other potential saves if needed.
            }
        }
    }
    // ------------------------------------------------

    // --- Unlock Next Zone (if applicable) ---
    if (nextZoneIdToUnlock && currentCharacterData) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not logged in for zone completion save.");

            const currentUnlocked = currentCharacterData.unlockedZones || [];
            if (!currentUnlocked.includes(nextZoneIdToUnlock)) {
                const updatedUnlocked = [...currentUnlocked, nextZoneIdToUnlock];
                currentCharacterData.unlockedZones = updatedUnlocked; // Update local data first
                characterDataChanged = true; // Mark that unlockedZones changed

                console.log(`Locally unlocked zone: ${nextZoneIdToUnlock}`);
                addCombatLogMessage(`New destination available: ${ZONE_CONFIG[nextZoneIdToUnlock]?.name || nextZoneIdToUnlock}`, 'quest');
            }
        } catch (error) {
            // This catch is for the client-side error before DB op, actual DB error handled below
            console.error("Error preparing to unlock next zone:", error);
            addCombatLogMessage("Error updating zone progression locally.");
        }
    }
    // ------------------------------------

    // --- Save any character data changes (missions, unlocked zones) ---
    if (characterDataChanged) {
        console.log("Character data changed (missions/zones), attempting to save to Firestore.");
        try {
            const charRef = doc(db, "characters", currentCharacterData.id);
            await updateDoc(charRef, {
                activeMissions: currentCharacterData.activeMissions,
                unlockedZones: currentCharacterData.unlockedZones
                // Note: checkMissionCompletion saves its own status update if mission becomes OBJECTIVES_MET
                // This save ensures other objective progress (counts) or new unlockedZones are saved.
            });
            console.log("Mission progress and/or unlocked zones saved after zone completion.");
        } catch (error) {
            console.error("Failed to save mission progress/unlocked zones after zone completion:", error);
            addCombatLogMessage("Error saving progression details.");
            // Consider how to handle this error - e.g., flag for retry, notify user.
        }
    }

    // --- Show and Configure Header Buttons for Completion ---
    updateCombatHeaderActionButtons('completed', zoneId, nextZoneIdToUnlock);
    // ----------------------------------------------------

    addCombatLogMessage("Collect any remaining loot or choose an action from the header.");
    console.log(`--- completeZone END for zone: ${zoneId} ---`);
}// END OF MODIFIED FUNCTION
// --- Combat Loop & UI Updates ---
function updateCooldownVisuals() { if (!playerSkillBarCombat) return; const now = Date.now(); playerSkillBarCombat.querySelectorAll('.combat-skill-slot').forEach((slotDiv, i) => { const overlay = slotDiv.querySelector('.skill-cooldown-overlay'); const text = slotDiv.querySelector('.skill-cooldown-text'); if (!overlay || !text) return; const slotData = skillBar.slots[i]; const cooldownTotal = (slotData.cooldownUntil && slotData.cooldownStart) ? (slotData.cooldownUntil - slotData.cooldownStart) : (ATTACK_DEFINITIONS[slotData.skillId]?.cooldown || 0); const cooldownEnds = slotData.cooldownUntil || 0; if (cooldownTotal > 50 && cooldownEnds > now) { const remaining = cooldownEnds - now; const progress = Math.max(0, Math.min(1, remaining / cooldownTotal)); overlay.style.height = `${progress * 100}%`; const remSec = (remaining / 1000); text.textContent = remSec > 1 ? Math.ceil(remSec) : remSec.toFixed(1); text.style.display = 'block'; slotDiv.style.cursor = 'not-allowed'; } else { if (overlay.style.height !== '0%') overlay.style.height = '0%'; if (text.style.display !== 'none') text.style.display = 'none'; slotDiv.style.cursor = slotDiv.classList.contains('assigned') ? 'pointer' : 'not-allowed'; if (slotData.cooldownStart && cooldownEnds <= now) delete slotData.cooldownStart; } }); }
function updateResourceDisplay() { const currentHp = PLAYER_STATS_PLACEHOLDER.currentHp; const maxHp = PLAYER_STATS_PLACEHOLDER.maxHp; const currentMana = PLAYER_STATS_PLACEHOLDER.currentMana; const maxMana = PLAYER_STATS_PLACEHOLDER.maxMana; if (playerHealthBar && playerHealthFill && playerHealthText) { const hpP = (maxHp > 0) ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0; playerHealthFill.style.width = `${hpP}%`; playerHealthText.textContent = `HP: ${Math.max(0, Math.round(currentHp))}/${maxHp}`; } if (playerManaBar && playerManaFill && playerManaText) { const manaP = (maxMana > 0) ? Math.max(0, Math.min(100, (currentMana / maxMana) * 100)) : 0; playerManaFill.style.width = `${manaP}%`; playerManaText.textContent = `MP: ${Math.max(0, Math.round(currentMana))}/${maxMana}`; } }
function addCombatLogMessage(message) { if (!combatLog) return; const p = document.createElement('p'); p.textContent = message; combatLog.appendChild(p); combatLog.scrollTop = combatLog.scrollHeight; }
function showDamageNumber(targetElement, damageAmount) { if (!targetElement || !enemyGrid) return; const numberEl = document.createElement('div'); numberEl.textContent = damageAmount; numberEl.className = 'damage-number'; const rect = targetElement.getBoundingClientRect(); const gridRect = enemyGrid.getBoundingClientRect(); const relativeLeft = rect.left - gridRect.left; const relativeTop = rect.top - gridRect.top; numberEl.style.position = 'absolute'; numberEl.style.top = `${relativeTop - 10}px`; enemyGrid.appendChild(numberEl); const numberWidth = numberEl.offsetWidth; numberEl.style.left = `${relativeLeft + rect.width / 2 - (numberWidth / 2) + (Math.random() * 20 - 10)}px`; setTimeout(() => { numberEl.remove(); }, 800); }

function combatTick(timestamp) {
    if (!isCombatActive) { if (combatLoopRequestId) cancelAnimationFrame(combatLoopRequestId); combatLoopRequestId = null; return; }
    gameTime = timestamp; const deltaTime = lastTickTime > 0 ? (timestamp - lastTickTime) / 1000 : 0; lastTickTime = timestamp;
    updateCooldownVisuals();
    if (activeRepeatSkillId) { attemptUseSkill(activeRepeatSkillId, activeRepeatTargetId); } // Handle repeating skill
    if (deltaTime > 0) { PLAYER_STATS_PLACEHOLDER.currentMana = Math.min(PLAYER_STATS_PLACEHOLDER.maxMana, PLAYER_STATS_PLACEHOLDER.currentMana + PLAYER_STATS_PLACEHOLDER.manaRegen * deltaTime); updateResourceDisplay(); }
    // processEnemyTurns(deltaTime); // Future AI
    if (isCombatActive) { combatLoopRequestId = requestAnimationFrame(combatTick); }
    else { if (combatLoopRequestId) cancelAnimationFrame(combatLoopRequestId); combatLoopRequestId = null; }
}

function handleCombatMouseMoveRepeat(event) {
    if (!isCombatActive || !activeRepeatSkillId) return; // Only run if repeating a skill

    // Find the enemy card element under the cursor, if any
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest('.enemy-card');
    let newTargetId = null;

    if (targetElement) {
        const enemyInstanceId = targetElement.dataset.enemyInstanceId;
        // Check if it's a valid, living enemy
        const targetData = currentEnemies.find(e => e.instanceId === enemyInstanceId);
        if (targetData && targetData.currentHp > 0) {
            newTargetId = enemyInstanceId; // Found a valid new target
        }
    }

    // Update the active target ONLY if it has changed
    if (newTargetId !== activeRepeatTargetId) {
        console.log(`Repeat target changed: ${activeRepeatTargetId} -> ${newTargetId}`);
        activeRepeatTargetId = newTargetId;
        // Optional: Add visual feedback to highlight the new target under the cursor
        document.querySelectorAll('.enemy-card.repeat-hover-target').forEach(el => el.classList.remove('repeat-hover-target'));
        if (newTargetId && targetElement) {
             targetElement.classList.add('repeat-hover-target');
             // Add CSS for .repeat-hover-target { outline: 1px dashed cyan; }
        }
    }
}