const ROLES = {
    WEREWOLF: {
        name: 'Loup-Garou',
        team: 'werewolves',
        description: 'Se réveille la nuit pour éliminer un villageois',
        minPlayers: 8,
        scaling: {
            8: 2,  // 8-11 players: 2 werewolves
            12: 3, // 12-15 players: 3 werewolves
            16: 4  // 16-20 players: 4 werewolves
        }
    },
    SEER: {
        name: 'Voyante',
        team: 'villagers',
        description: 'Peut découvrir le rôle d\'un joueur chaque nuit',
        minPlayers: 8,
        scaling: {
            8: 1,
            12: 2
        }
    },
    WITCH: {
        name: 'Sorcière',
        team: 'villagers',
        description: 'Possède deux potions: une pour sauver, une pour tuer',
        minPlayers: 8,
        scaling: {
            8: 1,
            14: 2
        }
    },
    HUNTER: {
        name: 'Chasseur',
        team: 'villagers',
        description: 'Peut éliminer un joueur en mourant',
        minPlayers: 8,
        scaling: {
            8: 1
        }
    },
    CUPID: {
        name: 'Cupidon',
        team: 'villagers',
        description: 'Désigne deux amoureux au début du jeu',
        minPlayers: 10,
        scaling: {
            10: 1
        }
    },
    ALIEN: {
        name: 'Alien',
        team: 'villagers',
        description: 'Peut espionner les Loups-Garous depuis l\'espace',
        minPlayers: 10,
        scaling: {
            10: 1
        }
    },
    BEAR: {
        name: 'Ours',
        team: 'neutral',
        description: 'Grogne si ses voisins sont des Loups-Garous',
        minPlayers: 12,
        scaling: {
            12: 1
        }
    },
    ELDER: {
        name: 'L\'Ancien',
        team: 'villagers',
        description: 'Peut survivre à une première attaque des Loups-Garous',
        minPlayers: 12,
        scaling: {
            12: 1
        }
    },
    RAVEN: {
        name: 'Corbeau',
        team: 'villagers',
        description: 'Désigne un joueur suspect chaque nuit',
        minPlayers: 12,
        scaling: {
            12: 1
        }
    },
    BARBIE: {
        name: 'Barbie',
        team: 'villagers',
        description: 'Protège un joueur chaque nuit avec son style unique',
        minPlayers: 14,
        scaling: {
            14: 1
        }
    },
    SHEPHERD: {
        name: 'Berger',
        team: 'villagers',
        description: 'Connaît l\'identité d\'un joueur au début',
        minPlayers: 14,
        scaling: {
            14: 1
        }
    }
};

const calculateRoleDistribution = (playerCount) => {
    // Input validation with detailed error message
    if (typeof playerCount !== 'number' || !Number.isInteger(playerCount)) {
        throw new Error('Le nombre de joueurs doit être un nombre entier');
    }
    if (playerCount < 8 || playerCount > 20) {
        throw new Error(`Le nombre de joueurs doit être entre 8 et 20. Actuellement: ${playerCount}`);
    }

    let distribution = new Map();
    
    // Optimized werewolf count calculation
    const werewolfCount = Math.min(
        Math.max(2, Math.floor(playerCount / 4)),
        playerCount <= 11 ? 2 : playerCount <= 15 ? 3 : 4
    );
    distribution.set('WEREWOLF', werewolfCount);

    // Add mandatory roles with validation
    const mandatoryRoles = ['SEER', 'WITCH', 'HUNTER'];
    mandatoryRoles.forEach(role => {
        if (!ROLES[role]) {
            throw new Error(`Rôle obligatoire manquant dans la configuration: ${role}`);
        }
        distribution.set(role, 1);
    });

    // Calculate remaining slots efficiently
    let assignedCount = werewolfCount + mandatoryRoles.length;
    let remainingSlots = playerCount - assignedCount;

    // Optimized role distribution for different player counts
    const addRolesIfPossible = (roles, minPlayers) => {
        if (remainingSlots > 0 && playerCount >= minPlayers) {
            roles.forEach(role => {
                if (remainingSlots > 0 && ROLES[role]) {
                    distribution.set(role, 1);
                    remainingSlots--;
                }
            });
        }
    };

    // Add roles based on player count thresholds
    addRolesIfPossible(['ALIEN', 'CUPID'], 10);
    addRolesIfPossible(['BEAR', 'ELDER', 'RAVEN'], 12);
    addRolesIfPossible(['BARBIE', 'SHEPHERD'], 14);

    // Optimize villager distribution
    if (remainingSlots > 0) {
        // First, try to add more werewolves if needed
        const currentWerewolves = distribution.get('WEREWOLF');
        const maxAdditionalWerewolves = Math.min(
            Math.floor(remainingSlots / 4),
            Math.floor(playerCount / 6)
        );

        if (maxAdditionalWerewolves > 0) {
            distribution.set('WEREWOLF', currentWerewolves + maxAdditionalWerewolves);
            remainingSlots -= maxAdditionalWerewolves;
        }

        // Distribute remaining slots among special roles
        if (remainingSlots > 0) {
            const availableRoles = ['SEER', 'WITCH', 'HUNTER', 'CUPID', 'ALIEN'];
            let roleIndex = 0;
            
            while (remainingSlots > 0 && roleIndex < availableRoles.length) {
                const role = availableRoles[roleIndex];
                const currentCount = distribution.get(role) || 0;
                
                // Add one more of the current role
                distribution.set(role, currentCount + 1);
                remainingSlots--;
                
                roleIndex = (roleIndex + 1) % availableRoles.length;
            }
        }
    }

    // Validate final distribution
    const finalTotal = Array.from(distribution.values()).reduce((sum, count) => sum + count, 0);
    if (finalTotal !== playerCount) {
        throw new Error(`Erreur de distribution: ${finalTotal} rôles pour ${playerCount} joueurs`);
    }

    return distribution;
};

const isBalanced = (distribution) => {
    try {
        const totalPlayers = Array.from(distribution.values()).reduce((sum, count) => sum + count, 0);
        const werewolfCount = distribution.get('WEREWOLF') || 0;
        
        // Use Map for O(1) lookup of role counts
        const teamCounts = new Map([['villagers', 0], ['werewolves', werewolfCount]]);
        const specialRolesCount = new Set(['SEER', 'WITCH', 'HUNTER', 'CUPID', 'ALIEN', 'BEAR', 'ELDER', 'RAVEN', 'BARBIE', 'SHEPHERD']);
        let specialCount = 0;

        // Efficient single-pass counting
        distribution.forEach((count, roleKey) => {
            const role = ROLES[roleKey];
            if (!role) {
                throw new Error(`Rôle inconnu dans la distribution: ${roleKey}`);
            }

            // Count team members
            const teamCount = teamCounts.get(role.team) || 0;
            teamCounts.set(role.team, teamCount + count);

            // Count special roles
            if (specialRolesCount.has(roleKey)) {
                specialCount += count;
            }
        });

        // Calculate ratios and thresholds
        const villagerCount = teamCounts.get('villagers');
        const villagerToWerewolfRatio = villagerCount / werewolfCount;
        const specialRoleRatio = specialCount / totalPlayers;

        // Dynamic balance thresholds based on player count
        const minRatio = totalPlayers <= 11 ? 1.5 : 2;
        const minSpecialRatio = 0.2;
        const maxSpecialRatio = 0.6;

        return {
            isBalanced: villagerToWerewolfRatio >= minRatio && 
                       specialRoleRatio >= minSpecialRatio && 
                       specialRoleRatio <= maxSpecialRatio,
            metrics: {
                villagerToWerewolfRatio,
                specialRoleRatio,
                totalPlayers,
                werewolfCount,
                villagerCount,
                specialCount
            }
        };
    } catch (error) {
        console.error('Error in balance calculation:', error);
        return { isBalanced: false, error: error.message };
    }
};
