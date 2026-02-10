const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || 'localhost',
};

const pool = new Pool(dbConfig);

const tableName = process.argv[2];
const columnName = process.argv[3];
const columnType = process.argv[4] || 'TEXT';

if (!tableName || !columnName) {
    console.error('Usage: node scripts/add-column.js <table_name> <column_name> [column_type]');
    process.exit(1);
}

async function addColumn() {
    try {
        console.log(`Attempting to add column '${columnName}' (${columnType}) to table '${tableName}'...`);
        const query = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`;
        await pool.query(query);
        console.log(`✅ Successfully added column '${columnName}' to table '${tableName}'`);
    } catch (err) {
        console.error('❌ Error adding column:', err.message);
    } finally {
        await pool.end();
    }
}

addColumn();
