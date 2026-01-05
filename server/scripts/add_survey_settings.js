const { pool } = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log('Starting migration to add survey settings...');

        // 1. is_published (if not exists)
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN is_published BOOLEAN DEFAULT FALSE;`);
            console.log('Added is_published column.');
        } catch (e) {
            if (e.code === '42701') console.log('is_published already exists.');
            else console.error('Error adding is_published:', e.message);
        }

        // 2. is_active
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN is_active BOOLEAN DEFAULT TRUE;`);
            console.log('Added is_active column.');
        } catch (e) {
            if (e.code === '42701') console.log('is_active already exists.');
            else console.error('Error adding is_active:', e.message);
        }

        // 3. allow_audio_recording
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN allow_audio_recording BOOLEAN DEFAULT FALSE;`);
            console.log('Added allow_audio_recording column.');
        } catch (e) {
            if (e.code === '42701') console.log('allow_audio_recording already exists.');
            else console.error('Error adding allow_audio_recording:', e.message);
        }

        // 4. allow_camera
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN allow_camera BOOLEAN DEFAULT FALSE;`);
            console.log('Added allow_camera column.');
        } catch (e) {
            if (e.code === '42701') console.log('allow_camera already exists.');
            else console.error('Error adding allow_camera:', e.message);
        }

        // 5. allow_geolocation
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN allow_geolocation BOOLEAN DEFAULT FALSE;`);
            console.log('Added allow_geolocation column.');
        } catch (e) {
            if (e.code === '42701') console.log('allow_geolocation already exists.');
            else console.error('Error adding allow_geolocation:', e.message);
        }

        // 6. start_date
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN start_date TIMESTAMP;`);
            console.log('Added start_date column.');
        } catch (e) {
            if (e.code === '42701') console.log('start_date already exists.');
            else console.error('Error adding start_date:', e.message);
        }

        // 7. end_date
        try {
            await pool.query(`ALTER TABLE forms ADD COLUMN end_date TIMESTAMP;`);
            console.log('Added end_date column.');
        } catch (e) {
            if (e.code === '42701') console.log('end_date already exists.');
            else console.error('Error adding end_date:', e.message);
        }

        console.log('Migration completed.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
