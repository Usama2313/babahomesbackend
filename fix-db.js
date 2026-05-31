require('dotenv').config();
const sequelize = require('./config/database');

async function fixDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Running manual ALTER TABLE queries...');

        // Users table
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE;');
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "propertyLimit" INTEGER DEFAULT 1;');
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR(255) DEFAULT \'Free\';');
        console.log('Users table updated.');

        // Properties table
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT true;');
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0;');
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "trialExpiresAt" TIMESTAMP WITH TIME ZONE;');
        await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;');
        console.log('Properties table updated.');

        // Property Views table
        // We will create the property_views table manually if it doesn't exist to ensure it's there
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "property_views" (
                "id" SERIAL PRIMARY KEY,
                "propertyId" INTEGER NOT NULL,
                "userId" INTEGER,
                "ipAddress" VARCHAR(255),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);
        console.log('PropertyViews table ensured.');

        console.log('Database fix complete!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to fix database:', error);
        process.exit(1);
    }
}

fixDatabase();
