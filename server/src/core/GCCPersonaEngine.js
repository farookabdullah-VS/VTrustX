/**
 * GCCPersonaEngine.js
 * 
 * Logic to assign GCC-specific personas based on demographic data.
 * Based on Version 1.0 Specification (Jan 13, 2026).
 */

const INCOME_THRESHOLDS = {
    "SA": 12000, // SAR
    "AE": 10000, // AED
    "QA": 11000, // QAR
    "KW": 9000,  // KWD
    "OM": 8000,  // OMR
    "BH": 8000   // BHD
};

class GCCPersonaEngine {

    /**
     * Evaluates a profile against GCC Persona rules.
     * @param {Object} profile - Customer demographic profile
     * @returns {Object} { personaId, name, reason }
     */
    assignPersona(profile) {
        const {
            country,
            isCitizen,
            age,
            cityTier,
            income,
            gender,
            employmentSector,
            familyStatus
        } = profile;

        const threshold = INCOME_THRESHOLDS[country] || 10000;
        const personas = [];

        // 1. GCC National Millennial
        if (isCitizen && age >= 25 && age <= 39 && cityTier === 'Tier1' && income >= threshold) {
            personas.push({
                id: 'GCC_NAT_MILL_01',
                name: 'GCC National Millennial (Urban & Digital)',
                score: 100
            });
        }

        // 2. Affluent GCC Family Decision-Maker
        if (isCitizen && age >= 35 && age <= 55 && familyStatus === 'Head of Household' && income >= (threshold * 1.5)) {
            personas.push({
                id: 'GCC_FAM_HH_03',
                name: 'Affluent GCC Family Decision-Maker',
                score: 95
            });
        }

        // 3. High-Income Expat Professional
        if (!isCitizen && age >= 30 && age <= 50 && employmentSector === 'Private Corporate' && income >= threshold) {
            personas.push({
                id: 'GCC_EXP_PRO_02',
                name: 'High-Income Expat Professional',
                score: 90
            });
        }

        // 4. Value-Conscious Expat Worker
        if (!isCitizen && age >= 25 && age <= 45 && (employmentSector === 'Labor' || employmentSector === 'Service') && income < 8000) {
            personas.push({
                id: 'GCC_EXP_VAL_04',
                name: 'Value-Conscious Expat Worker',
                score: 85
            });
        }

        // 5. GCC Female Empowerment Leader
        if (isCitizen && gender === 'Female' && age >= 28 && age <= 45 && (employmentSector === 'Government' || employmentSector === 'SME/Entrepreneur')) {
            personas.push({
                id: 'GCC_FEM_EMP_05',
                name: 'GCC Female Empowerment Leader',
                score: 80
            });
        }

        // 6. Vision-Driven GCC Entrepreneur
        if (age >= 25 && age <= 45 && employmentSector === 'SME/Entrepreneur') {
            personas.push({
                id: 'GCC_ENT_VIS_06',
                name: 'Vision-Driven GCC Entrepreneur',
                score: 75
            });
        }

        // 7. GCC Senior Traditionalist
        if (isCitizen && age >= 55 && (employmentSector === 'Retired' || employmentSector === 'Government')) {
            personas.push({
                id: 'GCC_SEN_TRAD_07',
                name: 'GCC Senior Traditionalist',
                score: 70
            });
        }

        // Return best match (highest score)
        if (personas.length === 0) {
            return {
                id: 'GCC_GEN_CONSUMER',
                name: 'General GCC Consumer',
                reason: 'No specific persona rules matched.'
            };
        }

        // Sort by score descending
        personas.sort((a, b) => b.score - a.score);

        return {
            id: personas[0].id,
            name: personas[0].name,
            matches: personas.map(p => p.id),
            details: personas
        };
    }
}

module.exports = new GCCPersonaEngine();
