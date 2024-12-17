import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Upsert (create if not exist) a couple of players
    const alice = await prisma.player.upsert({
        where: { username: 'alice' },
        update: {},
        create: {
            username: 'alice',
            trophies: 1200,
        },
    });

    const bob = await prisma.player.upsert({
        where: { username: 'bob' },
        update: {},
        create: {
            username: 'bob',
            trophies: 900,
        },
    });

    // Create decks for Alice
    await prisma.deck.create({
        data: {
            playerId: alice.id,
            cards: JSON.stringify([
                { unitType: 'knight', cost: 3 },
                { unitType: 'archer', cost: 2 },
            ]),
        },
    });

    // Create decks for Bob
    await prisma.deck.create({
        data: {
            playerId: bob.id,
            cards: JSON.stringify([
                { unitType: 'goblin', cost: 2 },
                { unitType: 'wizard', cost: 5 },
            ]),
        },
    });

    // Create a sample match with no winner yet
    await prisma.match.create({
        data: {
            player1Id: alice.id,
            player2Id: bob.id,
            winnerId: null,
        },
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
