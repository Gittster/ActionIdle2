export const SHIP_UPGRADE_DEFINITIONS = {
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
    'auto_attack_basic_lmb': {
        id: 'auto_attack_basic_lmb',
        name: "Basic Targeting Assist (LMB)",
        description: "Automatically triggers your assigned LMB skill against the furthest top-left enemy when active and LMB is not manually held.",
        type: 'combat_assist',
        costCredits: 1000, // New cost
        costItems: [],
        prerequisites: [], // No prereqs for now
        unlocksFeature: 'autoAttackLMB',
        icon: null
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