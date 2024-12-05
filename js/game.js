class WerewolfGame {
    constructor() {
        // Use WeakMap for better memory management
        this.players = new Map();
        this.assignedRoles = new Map();
        this.lockedRoles = new Map();
        this.maxPlayers = 20;
        this.minPlayers = 8;
        this._gameState = {
            isAssigningRoles: false,
            lastAssignment: null,
            errorState: null
        };
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            this.initializeEventListeners();
            this.updatePlayerCount();
            this.renderPlayers();
        } catch (error) {
            this.handleError('Initialization error', error);
        }
    }

    handleError(context, error) {
        console.error(`${context}:`, error);
        this._gameState.errorState = {
            context,
            message: error.message,
            timestamp: new Date()
        };
    }

    initializeEventListeners() {
        try {
            const elements = {
                playerForm: document.getElementById('player-form'),
                assignRolesBtn: document.getElementById('assign-roles'),
                resetGameBtn: document.getElementById('reset-game'),
                modal: document.getElementById('modal'),
                closeModal: document.querySelector('.close')
            };

            // Validate all required elements exist
            Object.entries(elements).forEach(([key, element]) => {
                if (!element) {
                    throw new Error(`Required element not found: ${key}`);
                }
            });

            // Debounced event handlers for better performance
            const debouncedHandleSubmit = this.debounce((e) => this.handlePlayerSubmit(e), 300);
            const debouncedAssignRoles = this.debounce(() => this.assignRoles(), 300);
            const debouncedResetGame = this.debounce(() => this.resetGame(), 300);

            // Add event listeners with error boundaries
            elements.playerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.safeExecute(() => debouncedHandleSubmit(e));
            });

            elements.assignRolesBtn.addEventListener('click', () => 
                this.safeExecute(debouncedAssignRoles));

            elements.resetGameBtn.addEventListener('click', () => 
                this.safeExecute(debouncedResetGame));

            // Modal controls with improved UX
            if (elements.modal && elements.closeModal) {
                elements.closeModal.addEventListener('click', () => 
                    this.safeExecute(() => this.closeModal(elements.modal)));
                
                window.addEventListener('click', (e) => {
                    if (e.target === elements.modal) {
                        this.safeExecute(() => this.closeModal(elements.modal));
                    }
                });
            }
        } catch (error) {
            this.handleError('Event listener initialization error', error);
        }
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    safeExecute(callback) {
        try {
            return callback();
        } catch (error) {
            this.handleError('Operation error', error);
            return null;
        }
    }

    closeModal(modal) {
        modal.classList.remove('show');
    }

    handlePlayerSubmit(e) {
        const input = document.getElementById('player-name');
        if (!input) {
            this.handleError('Form submission error', new Error('Player name input not found'));
            return;
        }

        const playerName = input.value.trim();

        try {
            // Input validation
            if (!playerName) {
                throw new Error('Veuillez entrer un nom de joueur');
            }

            if (playerName.length > 30) {
                throw new Error('Le nom du joueur ne doit pas dépasser 30 caractères');
            }

            // Check for duplicate names using case-insensitive comparison
            const isDuplicate = Array.from(this.players.values()).some(name => 
                name.toLowerCase() === playerName.toLowerCase()
            );
            
            if (isDuplicate) {
                throw new Error('Ce nom de joueur existe déjà');
            }

            if (this.players.size >= this.maxPlayers) {
                throw new Error(`Nombre maximum de joueurs atteint (${this.maxPlayers})`);
            }

            // Add player and update UI
            const playerId = this.addPlayer(playerName);
            if (playerId) {
                input.value = '';
                input.focus();
                this.updatePlayerCount();
                this.renderPlayers();
            }
        } catch (error) {
            this.handleError('Player submission error', error);
            alert(error.message);
        }
    }

    addPlayer(name) {
        try {
            // Validate input
            if (!name || typeof name !== 'string') {
                throw new Error('Nom de joueur invalide');
            }

            // Check max players again as a safeguard
            if (this.players.size >= this.maxPlayers) {
                throw new Error('Nombre maximum de joueurs atteint');
            }

            const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
            this.players.set(playerId, name);
            return playerId;
        } catch (error) {
            console.error('Error adding player:', error);
            alert(error.message || 'Une erreur est survenue lors de l\'ajout du joueur');
            return null;
        }
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.lockedRoles.delete(playerId);
        this.updatePlayerCount();
        this.renderPlayers();
    }

    lockRole(playerId, role) {
        if (this.players.has(playerId)) {
            this.lockedRoles.set(playerId, role);
        }
    }

    unlockRole(playerId) {
        this.lockedRoles.delete(playerId);
    }

    assignRoles() {
        if (this._gameState.isAssigningRoles) {
            alert('Attribution des rôles en cours...');
            return;
        }

        try {
            this._gameState.isAssigningRoles = true;

            if (this.players.size < this.minPlayers) {
                throw new Error(`Il faut au moins ${this.minPlayers} joueurs pour commencer une partie!`);
            }

            const distribution = calculateRoleDistribution(this.players.size);
            const balanceResult = isBalanced(distribution);

            if (!balanceResult.isBalanced) {
                const metrics = balanceResult.metrics;
                console.warn('Unbalanced role distribution:', metrics);
                if (!confirm('La distribution des rôles n\'est pas optimale. Voulez-vous continuer?')) {
                    return;
                }
            }

            // Create array of available roles based on distribution
            let availableRoles = [];
            distribution.forEach((count, roleKey) => {
                for (let i = 0; i < count; i++) {
                    availableRoles.push(roleKey);
                }
            });

            // Assign roles with improved randomization
            this.assignedRoles.clear();
            
            // First, handle locked roles
            this.lockedRoles.forEach((role, playerId) => {
                this.assignedRoles.set(playerId, role);
                const index = availableRoles.indexOf(role);
                if (index > -1) {
                    availableRoles.splice(index, 1);
                }
            });

            // Then, randomly assign remaining roles using Fisher-Yates shuffle
            const unassignedPlayers = Array.from(this.players.keys())
                .filter(id => !this.lockedRoles.has(id));
            
            for (let i = availableRoles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
            }

            unassignedPlayers.forEach((playerId, index) => {
                if (index < availableRoles.length) {
                    this.assignedRoles.set(playerId, availableRoles[index]);
                }
            });

            this._gameState.lastAssignment = new Date();
            this.showRoleAssignments();
        } catch (error) {
            this.handleError('Role assignment error', error);
            alert(error.message);
        } finally {
            this._gameState.isAssigningRoles = false;
        }
    }

    showRoleAssignments() {
        const modal = document.getElementById('modal');
        const roleAssignments = document.getElementById('role-assignments');
        roleAssignments.innerHTML = '';

        const assignmentsList = document.createElement('ul');
        assignmentsList.style.listStyle = 'none';
        assignmentsList.style.padding = '0';

        this.assignedRoles.forEach((roleKey, playerId) => {
            const playerName = this.players.get(playerId);
            const role = ROLES[roleKey];
            
            const li = document.createElement('li');
            li.style.padding = '0.5rem';
            li.style.marginBottom = '0.5rem';
            li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            li.style.borderRadius = '4px';
            
            li.innerHTML = `
                <strong>${playerName}</strong>: ${role.name}
                <div style="font-size: 0.9em; opacity: 0.8">${role.description}</div>
            `;
            
            assignmentsList.appendChild(li);
        });

        roleAssignments.appendChild(assignmentsList);
        modal.classList.add('show');
    }

    resetGame() {
        if (confirm('Êtes-vous sûr de vouloir recommencer une nouvelle partie?')) {
            this.players.clear();
            this.assignedRoles.clear();
            this.lockedRoles.clear();
            this.updatePlayerCount();
            this.renderPlayers();
        }
    }

    updatePlayerCount() {
        try {
            const countElement = document.getElementById('current-players');
            if (countElement) {
                countElement.textContent = this.players.size.toString();
            }
        } catch (error) {
            console.error('Error updating player count:', error);
        }
    }

    renderPlayers() {
        const container = document.querySelector('.players-container');
        if (!container) {
            this.handleError('Rendering error', new Error('Container des joueurs non trouvé'));
            return;
        }

        try {
            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Clear existing content
            container.innerHTML = '';

            // Add players with optimized animations
            this.players.forEach((name, id) => {
                const li = document.createElement('li');
                li.className = 'player-item';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                nameSpan.title = name;
                li.appendChild(nameSpan);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-player';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Retirer le joueur';
                
                // Use event delegation for better performance
                removeBtn.dataset.playerId = id;
                removeBtn.dataset.playerName = name;
                
                li.appendChild(removeBtn);
                fragment.appendChild(li);
            });

            // Attach event listener to container using event delegation
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-player')) {
                    const playerId = e.target.dataset.playerId;
                    const playerName = e.target.dataset.playerName;
                    
                    if (confirm(`Voulez-vous vraiment retirer ${playerName} ?`)) {
                        this.removePlayer(playerId);
                    }
                }
            });

            // Batch DOM updates
            requestAnimationFrame(() => {
                container.appendChild(fragment);
                
                // Trigger animations in next frame
                requestAnimationFrame(() => {
                    container.querySelectorAll('.player-item').forEach((li, index) => {
                        li.style.transition = 'all 0.3s ease';
                        li.style.transform = 'translateX(0)';
                        li.style.opacity = '1';
                    });
                });
            });

            this.updatePlayerCount();
        } catch (error) {
            this.handleError('Player rendering error', error);
            alert('Une erreur est survenue lors de l\'affichage des joueurs');
        }
    }
}

// Initialize game with error boundary
try {
    const game = new WerewolfGame();
    window.game = game; // For debugging only
} catch (error) {
    console.error('Failed to initialize game:', error);
    alert('Une erreur est survenue lors de l\'initialisation du jeu');
}
