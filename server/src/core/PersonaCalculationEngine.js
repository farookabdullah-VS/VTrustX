/**
 * PersonaCalculationEngine.js
 * 
 * Implements the core logic for the Persona Calculation Engine.
 * Follows the INPUT -> VALIDATION -> CONTEXT -> CALCULATION -> DECISION -> FEEDBACK flow.
 */

class PersonaCalculationEngine {

    constructor() {
        this.pool = require('../infrastructure/database/db').pool;
    }

    /**
     * Main entry point for deciding an action.
     * @param {Object} request - The decision request payload
     * @param {Object} securityContext - { tenantId, userId }
     */
    async decide(request, securityContext) {
        const startTime = Date.now();
        const requestId = request.request_id || `REQ-${startTime}`;

        // 1) Ingest
        const inputs = this.ingest(request.inputs, request.sources);

        // 2) Validate + Normalize
        const validated = this.validateAndNormalize(inputs);
        const dataQuality = this.scoreDataQuality(validated.qualityFlags);

        // 3) Build Context
        const context = await this.buildContext({
            personaId: request.persona_id,
            personaProfile: request.persona_profile,
            objectives: request.objectives,
            constraints: request.constraints,
            riskAppetite: request.risk_appetite,
            timeHorizon: request.time_horizon,
            options: request.options,
            securityContext
        });

        // 4) Compute Candidates
        const candidates = [];
        const actionSpace = request.action_space || [];

        for (const action of actionSpace) {
            // Featurize: Combine data, context, and potential action into a feature vector
            const features = this.featurize(validated.data, context, action);

            // Sub-calculations
            const ruleResult = this.applyRules(features, context.rules);
            const statsResult = this.computeStatistics(features, context.statsConfig);

            let mlResult = null;
            if (context.options.ml_enabled) {
                mlResult = await this.mlPredict(features, context.modelId);
            }

            let optResult = null;
            if (context.options.optimization_enabled) {
                optResult = this.optimize(action, features, context.constraints);
            }

            // 5) Aggregate Scoring
            const score = this.weightedScore({
                ruleMetrics: ruleResult.metrics,
                statsMetrics: statsResult.metrics,
                mlMetrics: mlResult ? mlResult.metrics : {},
                optMetrics: optResult ? optResult.metrics : {},
                weights: context.weights
            });

            // Compute auxiliary metrics
            const risk = this.computeRisk(features, context.riskModel);
            const latencyEstimate = this.estimateLatency(action, context);

            candidates.push({
                action: action,
                score: score,
                risk: risk, // Enum: LOW, MEDIUM, HIGH, CRITICAL
                latency_ms: latencyEstimate,
                evidence: this.collectEvidence(ruleResult, statsResult, mlResult, optResult)
            });
        }

        // 6) Decide (Rank & Filter)
        // Sort by Score DESC, then Risk ASC, then Latency ASC
        const ranked = candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // Map risk to numeric for comparison
            const riskScore = r => ({ 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 }[r] || 4);
            if (riskScore(a.risk) !== riskScore(b.risk)) return riskScore(a.risk) - riskScore(b.risk);
            return a.latency_ms - b.latency_ms;
        });

        const best = ranked[0];
        let decision = {};

        // Default thresholds if not provided
        const minScore = context.thresholds?.min_score || 0;
        const maxRisk = context.thresholds?.max_risk || 'HIGH'; // Allow high if not specified? Better safe.

        if (best && best.score >= minScore && this.isRiskAcceptable(best.risk, maxRisk)) {
            decision = {
                type: 'RECOMMEND',
                action: best.action
            };
        } else {
            decision = {
                type: 'ESCALATE',
                action: best ? best.action : null,
                reason: best ? 'Below thresholds' : 'No valid candidates'
            };
        }

        // 7) Confidence & Explainability
        const modelConf = context.options.ml_enabled ? (await this.getModelConfidence(context.modelId)) : 1.0;
        const contextStability = this.scoreContextStability(context);
        const confidence = Math.max(0, Math.min(1, dataQuality * modelConf * contextStability));

        const explanation = this.generateExplanation(
            best ? best.evidence : {},
            context.weights,
            decision,
            confidence
        );

        // 8) Output
        const response = {
            request_id: requestId,
            decision: decision,
            confidence: Number(confidence.toFixed(2)),
            top_candidates: ranked.slice(0, context.topK || 3),
            explanation: explanation,
            telemetry: {
                data_quality: Number(dataQuality.toFixed(2)),
                processing_time_ms: Date.now() - startTime
            }
        };

        // 9) Feedback / Logging (Async in real world)
        this.logDecision(response);

        return response;
    }

    validate(inputs) {
        // 2) Validate + Normalize logic exposed directly
        const validated = this.validateAndNormalize(this.ingest(inputs, []));
        return {
            valid: validated.qualityFlags.length === 0,
            quality_flags: validated.qualityFlags,
            normalized_data: validated.data
        };
    }

    async feedback(payload) {
        // 9) Feedback Learning Loop
        // In a real system, this would update weights, retrain models, or log for analysis.
        console.log('[PersonaEngine] Feedback received:', payload);
        // DB update logic here...
        return { status: 'acknowledged' };
    }

    // --- Internal Helpers ---

    ingest(rawInputs, sources) {
        // Flatten inputs if needed or just pass through
        // Here we assume inputs is already a clean object map
        return { raw: rawInputs, sources: sources };
    }

    validateAndNormalize(inputs) {
        const data = { ...inputs.raw }; // Copy
        const flags = [];

        // Example simple validation logic
        // In real app, check constraints, types, ranges
        for (const [key, val] of Object.entries(data)) {
            if (val === null || val === undefined) {
                flags.push({ field: key, issue: 'missing' });
            }
            // Normalize: e.g. string numbers to floats
            if (typeof val === 'string' && !isNaN(parseFloat(val))) {
                // Check if it looks like a number
                data[key] = parseFloat(val);
            }
        }

        return { data, qualityFlags: flags };
    }

    scoreDataQuality(flags) {
        if (!flags || flags.length === 0) return 1.0;
        // Simple decay: each issue reduces score
        return Math.max(0, 1.0 - (flags.length * 0.1));
    }

    async buildContext({ personaId, personaProfile, objectives, constraints, riskAppetite, timeHorizon, options, securityContext }) {
        let dbPersona = null;
        let mergedAttributes = {};

        // 3a) Try to load persona from DB if security context is present
        if (securityContext && securityContext.tenantId) {
            try {
                // Determine lookup value: prefer ID, fallback to Profile Name
                const lookupValue = personaId || personaProfile;

                if (lookupValue) {
                    // Try exact match on ID or Name
                    // Handle UUID check safely or just use text comparison
                    const result = await this.pool.query(
                        `SELECT * FROM cx_personas 
                         WHERE tenant_id = $1 
                         AND (id::text = $2 OR name = $2)
                         LIMIT 1`,
                        [securityContext.tenantId, lookupValue]
                    );

                    if (result.rows.length > 0) {
                        dbPersona = result.rows[0];
                        // Assume attributes column stores: { priorities: {}, risk_tolerance: '...', thresholds: {} }
                        mergedAttributes = dbPersona.attributes || {};
                        console.log(`[PersonaEngine] Loaded Persona: ${dbPersona.name}`);
                    }
                }
            } catch (err) {
                console.warn('[PersonaEngine] Failed to load persona from DB:', err.message);
            }
        }

        // 3b) Merge DB attributes with Request Overrides
        // Order: Defaults -> DB Persona -> Request Overrides

        // Risk Appetite
        const effectiveRiskAppetite = riskAppetite || mergedAttributes.risk_tolerance || 'MEDIUM';

        // Weights/Objectives
        const weights = {};
        // 1. From DB
        if (mergedAttributes.priorities) {
            for (const [key, val] of Object.entries(mergedAttributes.priorities)) {
                weights[key] = val;
            }
        }
        // 2. From Request (Overwrites DB)
        if (objectives && Array.isArray(objectives)) {
            objectives.forEach(obj => {
                weights[obj.name] = obj.weight || 1.0;
            });
        }

        // Thresholds
        const defaultThresholds = { min_score: 50, max_risk: 'HIGH' };
        const dbThresholds = mergedAttributes.thresholds || {};
        const reqConstraints = constraints || {};

        const thresholds = {
            ...defaultThresholds,
            ...dbThresholds,
            min_score: reqConstraints.min_score !== undefined ? reqConstraints.min_score : (dbThresholds.min_score || 50),
            max_risk: reqConstraints.max_risk || dbThresholds.max_risk || 'HIGH'
        };

        return {
            personaProfile: dbPersona ? dbPersona.name : personaProfile,
            personaData: dbPersona, // Keep ref for explanation
            weights,
            constraints: reqConstraints,
            riskAppetite: effectiveRiskAppetite,
            timeHorizon: timeHorizon || 'REALTIME',
            options: options || { ml_enabled: false, optimization_enabled: false },
            thresholds,
            modelId: mergedAttributes.model_id || 'default_model',
            rules: mergedAttributes.rules || [], // Load rules from DB attributes!
            statsConfig: {},
            topK: options?.top_k || 3
        };
    }

    featurize(data, context, action) {
        // Flatten data + context + action attributes into a vector/map for computation
        // We accept 'action.properties' as the primary source of feature data for the action
        return {
            ...data,
            ...action.properties, // Spread action properties (price, duration, etc.)
            action_id: action.id,
            action_name: action.name,
            risk_tolerance: context.riskAppetite
        };
    }

    applyRules(features, rules) {
        // Deterministic logic based on configured rules
        const metrics = {};

        // Base score for rules can be neutral (0.5) or additive
        let rule_score_modifier = 0;
        const triggered = [];

        if (rules && Array.isArray(rules)) {
            for (const rule of rules) {
                try {
                    // Simple condition evaluator
                    // Supported format: "key operator value" e.g. "duration_minutes > 10"
                    const matches = this._evaluateCondition(rule.condition, features);

                    if (matches) {
                        triggered.push(rule.reason || rule.condition);
                        if (rule.score_adjustment) {
                            rule_score_modifier += rule.score_adjustment; // e.g. -20
                        }
                        if (rule.set_metric) {
                            metrics[rule.set_metric] = rule.value;
                        }
                    }
                } catch (e) {
                    console.warn(`[PersonaEngine] Rule evaluation failed: ${rule.condition}`, e);
                }
            }
        }

        // Return metrics mainly for "evidence" or direct score influence
        // For simplicity, we also return the modifier to be added at the end or treated as a specific metric
        metrics['rule_adjustment'] = rule_score_modifier;

        return { metrics, triggered };
    }

    _evaluateCondition(condition, features) {
        // Very basic safe evaluator
        // Splits by content
        const operators = ['>', '<', '>=', '<=', '==', '!='];
        let op = null;
        for (const o of operators) {
            if (condition.includes(` ${o} `)) {
                op = o;
                break;
            }
        }

        if (!op) return false;

        const [key, valStr] = condition.split(` ${op} `).map(show => show.trim());
        const featureVal = features[key];
        const compareVal = isNaN(Number(valStr)) ? valStr.replace(/"/g, '') : Number(valStr);

        // Handle missing feature
        if (featureVal === undefined) return false;

        switch (op) {
            case '>': return featureVal > compareVal;
            case '<': return featureVal < compareVal;
            case '>=': return featureVal >= compareVal;
            case '<=': return featureVal <= compareVal;
            case '==': return featureVal == compareVal;
            case '!=': return featureVal != compareVal;
            default: return false;
        }
    }

    computeStatistics(features, config) {
        // Here we map raw features to normalized scores (0-1) for the weighted sum
        // In a full system, this would use distribution stats. 
        // For now, we use standard heuristic normalizers for Retail context.

        const metrics = {};

        // 1. Price Normalization (Inverse: 0 is best (1.0), 100 is worst (0.0))
        if (features.price !== undefined) {
            // Assume strict budget around 100? Or just linear decay
            // Score = 1 / (1 + price/50)
            metrics['price'] = 1 / (1 + (features.price / 50));
            // Also map to specific objectives if needed
            metrics['cost_efficiency'] = metrics['price'];
        }

        // 2. Duration/Speed Normalization (Inverse: 0 min is best)
        if (features.duration_minutes !== undefined) {
            // Score = 1 / (1 + minutes/15) - 15 mins is "half satisfied"
            metrics['speed'] = 1 / (1 + (features.duration_minutes / 30));
        }

        // 3. Convenience (Direct: 0-1)
        if (features.convenience !== undefined) {
            metrics['convenience'] = features.convenience;
        }

        // 4. Quality (Direct)
        if (features.quality !== undefined) {
            metrics['quality'] = features.quality;
        }

        return { metrics };
    }

    async mlPredict(features, modelId) {
        // Mock ML call
        return {
            metrics: {
                predicted_satisfaction: 0.8
            }
        };
    }

    optimize(action, features, constraints) {
        // Linear optimization mock
        return {
            metrics: {
                cost_optimization_score: 0.85
            }
        };
    }

    weightedScore(components) {
        const { ruleMetrics, statsMetrics, mlMetrics, optMetrics, weights } = components;

        // Combine all metrics into one map
        const allMetrics = { ...statsMetrics, ...mlMetrics, ...optMetrics, ...ruleMetrics };

        let totalScore = 0;
        let totalWeight = 0;

        // Iterate over objectives/weights to calculate score
        for (const [key, weight] of Object.entries(weights)) {
            // Heuristic: If metric exists, use it.
            let val = allMetrics[key];

            // If undefined, try to find a close match? Or just ignore?
            // For now, if missing, we treat as neutral 0.5
            if (val === undefined) {
                // Check for aliases?
                // For simplicity, default to 0.5
                val = 0.5;
            }

            totalScore += (val * weight);
            totalWeight += weight;
        }

        // Apply Rule Adjustments (Hard Penalties/Boosts)
        // These are outside the weighted average 0-1 logic, they are direct score modifiers
        if (ruleMetrics['rule_adjustment']) {
            // This allows rules to simply subtract 20 points regardless of weights
            // totalScore is currently weighted sum. To make adjustment scale, we might apply it at the end?
            // Let's normalize score first.
        }

        let finalScore = 0;
        if (totalWeight > 0) {
            finalScore = (totalScore / totalWeight) * 100;
        } else {
            finalScore = 50; // Neutral default
        }

        // Apply hard adjustments after normalization
        if (ruleMetrics['rule_adjustment']) {
            finalScore += ruleMetrics['rule_adjustment'];
        }

        // Clamp
        return Math.max(0, Math.min(100, finalScore));
    }

    computeRisk(features, riskModel) {
        // Simple logic
        // If action is aggressive -> HIGH
        // If data outlier -> MEDIUM
        if (features.action_id && features.action_id.includes('maintenance')) return 'LOW';
        if (features.temp_c && features.temp_c > 90) return 'CRITICAL';
        return 'MEDIUM';
    }

    estimateLatency(action, context) {
        // Mock ms
        return Math.floor(Math.random() * 200) + 50;
    }

    collectEvidence(rule, stats, ml, opt) {
        // Summarize why we got this score
        return {
            rules_triggered: rule.triggered || [],
            stats_used: Object.keys(stats.metrics),
        };
    }

    isRiskAcceptable(currentRisk, maxRisk) {
        const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const currentIdx = levels.indexOf(currentRisk);
        const maxIdx = levels.indexOf(maxRisk);

        if (currentIdx === -1) return false; // Unknown risk
        if (maxIdx === -1) return true; // checking disabled?

        return currentIdx <= maxIdx;
    }

    async getModelConfidence(modelId) {
        return 0.95; // Mock
    }

    scoreContextStability(context) {
        // If context has high uncertainty (e.g. wide time horizon), lower stability
        return 0.9;
    }

    generateExplanation(evidence, weights, decision, confidence) {
        // Construct human readable string
        return {
            summary: `Decision to ${decision.type} ${decision.action ? decision.action.name : 'action'} based on weighted scoring.`,
            top_factors: Object.entries(weights).map(([k, v]) => ({ factor: k, weight: v })),
            confidence_level: confidence > 0.8 ? 'High' : 'Moderate'
        };
    }

    logDecision(response) {
        // Fire and forget log
        // console.log(JSON.stringify(response, null, 2));
    }
}

module.exports = new PersonaCalculationEngine();
