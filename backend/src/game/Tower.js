class Tower {
    constructor({ x, y, health, team }) {
        this.x = x;
        this.y = y;
        this.health = health;
        this.team = team;
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            health: this.health,
            team: this.team
        };
    }
}

export default Tower;
