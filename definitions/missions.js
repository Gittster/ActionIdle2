export const MISSION_DEFINITIONS = {
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