export const LOOT_TABLES = {
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