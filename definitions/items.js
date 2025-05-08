export const ITEM_DEFINITIONS = {
    // Existing items with sellValue added
    'starter_mace': {
        id: 'starter_mace',
        name: 'Scrap Metal Cudgel',
        type: 'OneHandMace',
        slot: ['weapon1', 'weapon2'],
        rarity: 'common',
        baseStats: {
            'physicalDamageMin': 5,
            'physicalDamageMax': 8,
            'attackSpeed': 1.2,
            'critChance': 5.0,
            'addedPhysicalDamage': 2
        },
        sellValue: 10
    },
    'worn_leather_cap': {
        id: 'worn_leather_cap',
        name: 'Worn Leather Cap',
        type: 'Helmet',
        slot: ['head'],
        rarity: 'uncommon',
        baseStats: {
            'defense': 5,
            'percentIncreasedPhysicalDamage': 0.05
        },
        sellValue: 15
    },
    'reinforced_chestplate': {
        id: 'reinforced_chestplate',
        name: 'Reinforced Chestplate',
        type: 'ChestArmor',
        slot: ['chest'],
        rarity: 'uncommon',
        baseStats: {
            'defense': 15,
            'addedPhysicalDamage': 3
        },
        sellValue: 25
    },
    'basic_gloves': {
        id: 'basic_gloves',
        name: 'Basic Gloves',
        type: 'Gloves',
        slot: ['hands'],
        rarity: 'common',
        baseStats: {
            'defense': 2,
            'percentIncreasedAttackSpeed': 0.08
        },
        sellValue: 5
    }, // Assuming 'hands' slot
    'iron_ring': {
        id: 'iron_ring',
        name: 'Iron Ring',
        type: 'Ring',
        slot: ['accessory1', 'accessory2'],
        rarity: 'uncommon',
        baseStats: {
            'addedPhysicalDamage': 1
        },
        sellValue: 12
    },

    // New Items with sellValue added
    'scrap_metal': {
        id: 'scrap_metal',
        name: 'Scrap Metal',
        type: 'Component',
        rarity: 'common',
        stackable: true,
        maxStack: 50,
        sellValue: 1
    }, // Components have value
    'basic_wiring': {
        id: 'basic_wiring',
        name: 'Basic Wiring',
        type: 'Component',
        rarity: 'common',
        stackable: true,
        maxStack: 50,
        sellValue: 2
    },
    'ammo_clip_standard': {
        id: 'ammo_clip_standard',
        name: 'Std. Ammo Clip',
        type: 'Consumable',
        rarity: 'common',
        stackable: true,
        maxStack: 20,
        sellValue: 3
    },
    'commander_targeting_module': {
        id: 'commander_targeting_module',
        name: 'Commander Targeting Module',
        type: 'Accessory',
        slot: ['accessory1', 'accessory2'],
        rarity: 'rare',
        baseStats: {
            'critChance': 3.0,
            'percentIncreasedPhysicalDamage': 0.08
        },
        sellValue: 75
    }, // Rare drop
    'advanced_power_core': {
        id: 'advanced_power_core',
        name: 'Advanced Power Core',
        type: 'Component',
        rarity: 'epic',
        stackable: false,
        sellValue: 150
    } // Epic drop
    // Add more items with sellValue...
};