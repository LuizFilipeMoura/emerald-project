// Card.js
// Represents a playable card that spawns a certain type of unit.

export default class Card {
    constructor({ name, cost, unitType }) {
        this.name = name;
        this.cost = cost;
        this.unitType = unitType;
    }

    /**
     * createUnit
     * Returns the configuration needed to instantiate a Unit on the battlefield.
     * @param {number} team - The team of the player who played the card (0 or 1).
     * @param {Object} position - The { x, y } coordinates where the unit should spawn.
     * @returns {Object} - Unit configuration object.
     */
    createUnit(team, position) {
        // For simplicity, we'll return a generic unit configuration.
        // In a real implementation, you'd determine health, damage, speed, etc.
        // based on this.unitType. For now, these are hard-coded or could be looked up.
        return {
            id: null, // will be assigned by the caller (e.g., GameEngine)
            team: team,
            x: position.x,
            y: position.y,
            health: 500,
            damage: 50,
            speed: 1,
            unitType: this.unitType
        };
    }
}
