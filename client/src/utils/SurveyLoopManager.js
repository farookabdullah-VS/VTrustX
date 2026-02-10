/**
 * SurveyLoopManager.js
 * 
 * Production-grade utility to handle robust Loop Logic synchronization in SurveyJS.
 * Ensures data preservation, unique key matching, and performance optimization.
 */

export class SurveyLoopManager {
    constructor(survey) {
        this.survey = survey;
        this.configs = [];

        // Subscribe to changes with safety check
        if (this.survey && this.survey.onValueChanged && typeof this.survey.onValueChanged.add === 'function') {
            this.survey.onValueChanged.add(this.handleValueChanged.bind(this));
        }
    }

    /**
     * Register a loop relationship.
     * @param {Object} config Configuration object
     * @param {string} config.sourceQuestion Name of the source question (e.g., checkbox/dropdown)
     * @param {string} config.targetPanel Name of the target Dynamic Panel
     * @param {string} config.keyProperty Property name to store the unique ID in the panel item (default: 'tag_id')
     * @param {string} config.textProperty Property name to store the display text in the panel item (default: 'tag_name')
     */
    addLoop(config) {
        this.configs.push({
            sourceQuestion: config.sourceQuestion,
            targetPanel: config.targetPanel,
            keyProperty: config.keyProperty || 'tag_id',
            textProperty: config.textProperty || 'tag_name'
        });

        // Initial Sync
        this.syncPanel(this.configs[this.configs.length - 1]);
    }

    handleValueChanged(sender, options) {
        // Find if the changed question triggers any loop logic
        const config = this.configs.find(c => c.sourceQuestion === options.name);
        if (config) {
            this.syncPanel(config);
        }
    }

    syncPanel(config) {
        const sourceQ = this.survey.getQuestionByName(config.sourceQuestion);
        const targetPanel = this.survey.getQuestionByName(config.targetPanel);

        if (!sourceQ || !targetPanel) return;

        // 1. Normalize Source Data into Array of {id, text}
        // distinct behaviors for checkbox (array), dropdown (single), text (split?), etc.
        let sourceItems = [];
        const rawValue = sourceQ.value;

        if (Array.isArray(rawValue)) {
            // Checkbox, Tagbox, Multi-select
            // We need to match values to choice text if possible
            sourceItems = rawValue.map(val => {
                // Try to find choice object for text
                const choice = sourceQ.choices.find(c => c.value == val);
                return {
                    id: val,
                    text: choice ? choice.text : val
                };
            });
        } else if (rawValue) {
            // Single value (Dropdown, etc)
            const choice = sourceQ.choices ? sourceQ.choices.find(c => c.value == rawValue) : null;
            sourceItems = [{
                id: rawValue,
                text: choice ? choice.text : rawValue
            }];
        }

        // 2. Get Current Panel Data (Target)
        // Ensure it's an array
        const currentPanelData = Array.isArray(targetPanel.value) ? targetPanel.value : [];

        // 3. Merge Strategy (Preserve Data)
        // We construct a NEW array that matches the order of sourceItems
        // specific matching by KEY property
        const newPanelData = sourceItems.map(sourceItem => {
            // Check if this item already exists in the panel data
            const existingItem = currentPanelData.find(pItem => pItem[config.keyProperty] == sourceItem.id);

            if (existingItem) {
                // UPDATE: Keep existing data, but update text if it changed (dynamic source?)
                return {
                    ...existingItem,
                    [config.textProperty]: sourceItem.text
                };
            } else {
                // CREATE: New item
                return {
                    [config.keyProperty]: sourceItem.id,
                    [config.textProperty]: sourceItem.text
                };
            }
        });

        // 4. Update Target Panel
        // Only trigger update if length changed or IDs mismatch (Deep check expensive, length + simple ID map check usually enough)
        // For absolute safety we just set it, SurveyJS is smart enough not to re-render if deep equal (usually)
        // but strictly setting value works best.

        // Optimization: Check for equality to avoid re-renders
        if (JSON.stringify(newPanelData) !== JSON.stringify(currentPanelData)) {
            targetPanel.value = newPanelData;
        }
    }
}
