const db = require('../src/infrastructure/database/db');
async function run() {
    try {
        const res = await db.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'forms'");
        console.log("Forms Columns Constraints:");
        res.rows.forEach(r => console.log(`- ${r.column_name}: Nullable=${r.is_nullable}, Default=${r.column_default}`));
    } catch (e) { console.error(e); }
}
run();
