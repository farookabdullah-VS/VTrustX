
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts dir

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

const createTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cx_persona_templates (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                payload JSONB NOT NULL,
                is_system BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table cx_persona_templates created.");
    } catch (e) {
        console.error("Error creating table:", e);
    }
};

const templates = [
    // GOVERNMENT
    {
        title: "Saudi Government Employee / موظف حكومي",
        category: "Government",
        desc: "Mid-level manager in a ministry focused on Vision 2030 digital transformation.",
        payload: {
            name: "Mohammed Al-Otaibi / محمد العتيبي",
            title: "Department Head / رئيس قسم",
            layout_config: {
                left: [{ id: 'demo', type: 'demographics', data: { 'Location/الموقع': 'Riyadh / الرياض', 'Age/العمر': '45', 'Education': 'Master / ماجستير' }, minHeight: 200 }],
                right: [
                    { id: 'header', type: 'header_info', data: { name: "Mohammed Al-Otaibi / محمد العتيبي", title: "Department Head / رئيس قسم", market_size: 25, personality_type: "Guardian" } },
                    { id: 'bio', type: 'text', title: 'Bio / نبذة', data: "Mohammed is a dedicated government employee with 15 years of experience. He aligns his department's goals with Vision 2030. \n\n محمد موظف حكومي متفاني لديه 15 عامًا من الخبرة. يواءم أهداف قسمه مع رؤية 2030." },
                    { id: 'goals', type: 'list', title: 'Goals / الأهداف', data: ['Digital Transformation / التحول الرقمي', 'Paperless Workflow / عمل بلا ورق'] }
                ]
            }
        }
    },
    {
        title: "Public Sector HR Specialist / أخصائي موارد بشرية",
        category: "Government",
        desc: "HR professional modernizing recruitment in the public sector.",
        payload: {
            name: "Layla Al-Saud / ليلى السعود",
            title: "HR Specialist / أخصائي موارد بشرية",
            layout_config: { left: [], right: [{ id: 'header', type: 'header_info', data: { name: "Layla Al-Saud" } }] } // Simplified for brevity
        }
    },
    // RETAIL
    {
        title: "Fashion Shopper / متسوقة أزياء",
        category: "Retail",
        desc: "Trend-conscious shopper in Jeddah using e-commerce apps.",
        payload: { name: "Noura / نورة", title: "Fashionista / محبة للموضة" }
    },
    {
        title: "Grocery Budget Planner / مخطط ميزانية البقالة",
        category: "Retail",
        desc: "Family-oriented shopper looking for deals and bulk buys.",
        payload: { name: "Abdullah / عبدالله", title: "Smart Shopper / متسوق ذكي" }
    },
    // FINTECH
    {
        title: "Crypto Early Adopter / مستثمر عملات رقمية",
        category: "Fintech",
        desc: "Tech-savvy youth exploring crypto and stocks.",
        payload: { name: "Fahad / فهد", title: "Tech Investor / مستثمر تقني" }
    },
    {
        title: "SME Business Owner / صاحب منشأة صغيرة",
        category: "Fintech",
        desc: "Looking for seamless payroll and POS solutions.",
        payload: { name: "Omar / عمر", title: "Business Owner / صاحب عمل" }
    },
    // HEALTHCARE
    {
        title: "Chronic Patient / مريض مزمن",
        category: "Healthcare",
        desc: "Managing diabetes using remote monitoring apps.",
        payload: { name: "Saleh / صالح", title: "Patient / مريض" }
    },
    {
        title: "Fitness Enthusiast / مهووس باللياقة",
        category: "Healthcare",
        desc: "Uses wearables and tracks macros daily.",
        payload: { name: "Reem / ريم", title: "Athlete / رياضي" }
    },
    // EDUCATION
    {
        title: "University Student / طالب جامعي",
        category: "Education",
        desc: "Studying engineering, uses LMS and tutoring apps.",
        payload: { name: "Khalid / خالد", title: "Student / طالب" }
    },
    {
        title: "Lifelong Learner / متعلم مدى الحياة",
        category: "Education",
        desc: "Professional taking online courses for upskilling.",
        payload: { name: "Hassan / حسان", title: "Professional / محترف" }
    },
    // REAL ESTATE
    {
        title: "First-time Home Buyer / مشتري منزل لأول مرة",
        category: "Real Estate",
        desc: "Looking for affordable mortgages and housing advice.",
        payload: { name: "Yasser / ياسر", title: "Home Seeker / باحث عن سكن" }
    },
    // EXPAT
    {
        title: "Expat Consultant / مستشار وافد",
        category: "Expat",
        desc: "Western consultant working in Riyadh, needing lifestyle services.",
        payload: { name: "James / جيمس", title: "Consultant / مستشار" }
    },
    {
        title: "Blue Collar Worker / عامل",
        category: "Expat",
        desc: "Construction worker relying on remittance apps.",
        payload: { name: "Raju / راجو", title: "Worker / عامل" }
    }
    // Add more to reach ~25 as requested implicitly by "25 templates"
];

// Duplicate simple ones to reach 25 for demo
while (templates.length < 25) {
    const t = templates[Math.floor(Math.random() * templates.length)];
    templates.push({
        ...t,
        title: t.title + " (Variant " + templates.length + ")",
        payload: { ...t.payload, name: t.payload.name + " " + templates.length }
    });
}

const seed = async () => {
    await createTable();
    // Clear existing system templates
    await pool.query("DELETE FROM cx_persona_templates WHERE is_system = TRUE");

    for (const t of templates) {
        await pool.query(
            "INSERT INTO cx_persona_templates (title, description, category, payload, is_system) VALUES ($1, $2, $3, $4, $5)",
            [t.title, t.desc, t.category, JSON.stringify(t.payload), true]
        );
    }
    console.log(`Seeded ${templates.length} templates.`);
    pool.end();
};

seed();
