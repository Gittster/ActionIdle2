import { ENEMY_DEFINITIONS } from './enemies.js'

export const ZONE_CONFIG = {
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