export const ATTACK_DEFINITIONS = {
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