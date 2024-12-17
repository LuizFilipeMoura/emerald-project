class Unit {
    constructor({ id, x, y, team, health, damage, speed }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.team = team;
        this.health = health;
        this.damage = damage;
        this.speed = speed;
    }

    update() {
        // Additional logic if needed
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            team: this.team,
            health: this.health
        };
    }
}

export default Unit;
