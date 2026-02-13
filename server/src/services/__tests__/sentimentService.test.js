const sentimentService = require('../sentimentService');

describe('SentimentService', () => {
    describe('extractTextFields', () => {
        test('should extract text fields longer than 10 characters', () => {
            const data = {
                name: 'John',
                feedback: 'This is a great product that I really enjoy using!',
                rating: 5
            };

            const result = sentimentService.extractTextFields(data);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                fieldName: 'feedback',
                text: 'This is a great product that I really enjoy using!'
            });
        });

        test('should filter out short text fields', () => {
            const data = {
                short: 'Hi',
                long: 'This is a sufficiently long text field for analysis'
            };

            const result = sentimentService.extractTextFields(data);

            expect(result).toHaveLength(1);
            expect(result[0].fieldName).toBe('long');
        });

        test('should unwrap SurveyJS object wrappers', () => {
            const data = {
                feedback: {
                    value: 'This is a wrapped feedback text that is long enough',
                    text: 'This is a wrapped feedback text that is long enough'
                }
            };

            const result = sentimentService.extractTextFields(data);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('This is a wrapped feedback text that is long enough');
        });

        test('should handle nested objects', () => {
            const data = {
                contact: {
                    message: 'This is a nested message that is long enough to be analyzed'
                }
            };

            const result = sentimentService.extractTextFields(data);

            expect(result).toHaveLength(1);
            expect(result[0].fieldName).toBe('contact.message');
        });

        test('should return empty array for empty data', () => {
            expect(sentimentService.extractTextFields({})).toEqual([]);
            expect(sentimentService.extractTextFields(null)).toEqual([]);
            expect(sentimentService.extractTextFields(undefined)).toEqual([]);
        });

        test('should trim whitespace from text', () => {
            const data = {
                feedback: '   Whitespace should be trimmed properly here   '
            };

            const result = sentimentService.extractTextFields(data);

            expect(result[0].text).toBe('Whitespace should be trimmed properly here');
        });
    });

    describe('buildSentimentPrompt', () => {
        test('should build prompt with field information', () => {
            const textFields = [
                { fieldName: 'feedback', label: 'Feedback', text: 'Great service!' }
            ];

            const prompt = sentimentService.buildSentimentPrompt(textFields);

            expect(prompt).toContain('Feedback (feedback)');
            expect(prompt).toContain('Great service!');
            expect(prompt).toContain('Return ONLY the JSON object');
        });

        test('should return empty string for empty fields', () => {
            expect(sentimentService.buildSentimentPrompt([])).toBe('');
            expect(sentimentService.buildSentimentPrompt(null)).toBe('');
        });

        test('should include scoring guidelines', () => {
            const textFields = [
                { fieldName: 'test', label: 'Test', text: 'Test text here' }
            ];

            const prompt = sentimentService.buildSentimentPrompt(textFields);

            expect(prompt).toContain('-1.0 to -0.5');
            expect(prompt).toContain('Scoring guidelines');
        });
    });

    describe('parseSentimentResponse', () => {
        test('should parse valid sentiment JSON', () => {
            const aiResponse = JSON.stringify({
                aggregate: {
                    score: 0.8,
                    emotion: 'happy',
                    confidence: 0.9
                },
                fields: {
                    feedback: {
                        score: 0.8,
                        emotion: 'happy',
                        keywords: ['great', 'excellent'],
                        confidence: 0.9
                    }
                },
                themes: ['service quality'],
                summary: 'Very positive feedback'
            });

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result).toBeDefined();
            expect(result.aggregate.score).toBe(0.8);
            expect(result.aggregate.emotion).toBe('happy');
        });

        test('should clamp scores to [-1, 1] range', () => {
            const aiResponse = JSON.stringify({
                aggregate: {
                    score: 2.5,
                    emotion: 'happy',
                    confidence: 0.9
                },
                fields: {
                    test: {
                        score: -1.8,
                        confidence: 0.8
                    }
                }
            });

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result.aggregate.score).toBe(1); // Clamped to 1
            expect(result.fields.test.score).toBe(-1); // Clamped to -1
        });

        test('should extract JSON from text with extra content', () => {
            const aiResponse = 'Here is the analysis:\n{"aggregate":{"score":0.5,"emotion":"satisfied","confidence":0.8}}\nEnd of response';

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result).toBeDefined();
            expect(result.aggregate.score).toBe(0.5);
        });

        test('should handle invalid JSON gracefully', () => {
            const aiResponse = 'This is not valid JSON';

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result).toBeNull();
        });

        test('should return null for missing aggregate score', () => {
            const aiResponse = JSON.stringify({
                aggregate: {
                    emotion: 'happy'
                }
            });

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result).toBeNull();
        });

        test('should validate emotion values', () => {
            const aiResponse = JSON.stringify({
                aggregate: {
                    score: 0.5,
                    emotion: 'invalid_emotion',
                    confidence: 0.8
                }
            });

            const result = sentimentService.parseSentimentResponse(aiResponse);

            expect(result.aggregate.emotion).toBe('neutral'); // Corrected to valid emotion
        });
    });

    describe('getCTLAlertLevel', () => {
        test('should return critical for very negative sentiment', () => {
            expect(sentimentService.getCTLAlertLevel(-0.8)).toBe('critical');
            expect(sentimentService.getCTLAlertLevel(-1.0)).toBe('critical');
        });

        test('should return high for significantly negative sentiment', () => {
            expect(sentimentService.getCTLAlertLevel(-0.6)).toBe('high');
            expect(sentimentService.getCTLAlertLevel(-0.5)).toBe('high');
        });

        test('should return medium for moderately negative sentiment', () => {
            expect(sentimentService.getCTLAlertLevel(-0.4)).toBe('medium');
            expect(sentimentService.getCTLAlertLevel(-0.3)).toBe('medium');
        });

        test('should return null for neutral or positive sentiment', () => {
            expect(sentimentService.getCTLAlertLevel(-0.2)).toBeNull();
            expect(sentimentService.getCTLAlertLevel(0)).toBeNull();
            expect(sentimentService.getCTLAlertLevel(0.5)).toBeNull();
            expect(sentimentService.getCTLAlertLevel(1.0)).toBeNull();
        });

        test('should handle invalid inputs', () => {
            expect(sentimentService.getCTLAlertLevel(null)).toBeNull();
            expect(sentimentService.getCTLAlertLevel(undefined)).toBeNull();
            expect(sentimentService.getCTLAlertLevel('invalid')).toBeNull();
            expect(sentimentService.getCTLAlertLevel(NaN)).toBeNull();
        });
    });

    describe('getFieldLabel', () => {
        test('should get label from form definition', () => {
            const formDefinition = {
                elements: [
                    { name: 'feedback', title: 'Your Feedback' }
                ]
            };

            const label = sentimentService.getFieldLabel('feedback', formDefinition);

            expect(label).toBe('Your Feedback');
        });

        test('should convert field name to readable format', () => {
            expect(sentimentService.getFieldLabel('customer_feedback')).toBe('Customer Feedback');
            expect(sentimentService.getFieldLabel('npsScore')).toBe('Nps Score');
            expect(sentimentService.getFieldLabel('feedback-text')).toBe('Feedback Text');
        });

        test('should handle empty form definition', () => {
            const label = sentimentService.getFieldLabel('test_field', {});

            expect(label).toBe('Test Field');
        });
    });

    describe('redactPII', () => {
        test('should redact email addresses', () => {
            const text = 'Contact me at john.doe@example.com for more info';

            const redacted = sentimentService.redactPII(text);

            expect(redacted).toBe('Contact me at [EMAIL] for more info');
            expect(redacted).not.toContain('john.doe@example.com');
        });

        test('should redact phone numbers', () => {
            const text = 'Call me at (555) 123-4567 or 5551234567';

            const redacted = sentimentService.redactPII(text);

            expect(redacted).toContain('[PHONE]');
            expect(redacted).not.toContain('555');
        });

        test('should handle text without PII', () => {
            const text = 'This is a normal feedback without any personal information';

            const redacted = sentimentService.redactPII(text);

            expect(redacted).toBe(text);
        });

        test('should handle null or undefined', () => {
            expect(sentimentService.redactPII(null)).toBeNull();
            expect(sentimentService.redactPII(undefined)).toBeUndefined();
        });
    });

    describe('clampScore', () => {
        test('should clamp values outside range', () => {
            expect(sentimentService.clampScore(2.5)).toBe(1);
            expect(sentimentService.clampScore(-2.5)).toBe(-1);
        });

        test('should preserve values within range', () => {
            expect(sentimentService.clampScore(0.5)).toBe(0.5);
            expect(sentimentService.clampScore(-0.5)).toBe(-0.5);
            expect(sentimentService.clampScore(0)).toBe(0);
        });

        test('should handle invalid inputs', () => {
            expect(sentimentService.clampScore(null)).toBe(0);
            expect(sentimentService.clampScore(undefined)).toBe(0);
            expect(sentimentService.clampScore('invalid')).toBe(0);
            expect(sentimentService.clampScore(NaN)).toBe(0);
        });
    });

    describe('clampConfidence', () => {
        test('should clamp values outside range', () => {
            expect(sentimentService.clampConfidence(2.5)).toBe(1);
            expect(sentimentService.clampConfidence(-0.5)).toBe(0);
        });

        test('should preserve values within range', () => {
            expect(sentimentService.clampConfidence(0.8)).toBe(0.8);
            expect(sentimentService.clampConfidence(0)).toBe(0);
            expect(sentimentService.clampConfidence(1)).toBe(1);
        });

        test('should default to 0.5 for invalid inputs', () => {
            expect(sentimentService.clampConfidence(null)).toBe(0.5);
            expect(sentimentService.clampConfidence(undefined)).toBe(0.5);
            expect(sentimentService.clampConfidence('invalid')).toBe(0.5);
            expect(sentimentService.clampConfidence(NaN)).toBe(0.5);
        });
    });

    describe('shouldTriggerAlert', () => {
        test('should trigger alert for negative sentiment', () => {
            const sentimentData = {
                aggregate: { score: -0.5, emotion: 'frustrated' }
            };

            expect(sentimentService.shouldTriggerAlert(sentimentData)).toBe(true);
        });

        test('should not trigger alert for positive sentiment', () => {
            const sentimentData = {
                aggregate: { score: 0.8, emotion: 'happy' }
            };

            expect(sentimentService.shouldTriggerAlert(sentimentData)).toBe(false);
        });

        test('should not trigger alert for neutral sentiment', () => {
            const sentimentData = {
                aggregate: { score: 0.1, emotion: 'neutral' }
            };

            expect(sentimentService.shouldTriggerAlert(sentimentData)).toBe(false);
        });

        test('should handle invalid data', () => {
            expect(sentimentService.shouldTriggerAlert(null)).toBe(false);
            expect(sentimentService.shouldTriggerAlert({})).toBe(false);
        });
    });

    describe('getFlagReason', () => {
        test('should generate flag reason with emotion and score', () => {
            const sentimentData = {
                aggregate: {
                    score: -0.6,
                    emotion: 'frustrated',
                    confidence: 0.85
                }
            };

            const reason = sentimentService.getFlagReason(sentimentData);

            expect(reason).toContain('Frustrated');
            expect(reason).toContain('-0.60');
            expect(reason).toContain('High confidence');
        });

        test('should handle different confidence levels', () => {
            const highConfidence = {
                aggregate: { score: -0.5, emotion: 'angry', confidence: 0.9 }
            };
            const mediumConfidence = {
                aggregate: { score: -0.5, emotion: 'angry', confidence: 0.7 }
            };
            const lowConfidence = {
                aggregate: { score: -0.5, emotion: 'angry', confidence: 0.4 }
            };

            expect(sentimentService.getFlagReason(highConfidence)).toContain('High confidence');
            expect(sentimentService.getFlagReason(mediumConfidence)).toContain('Medium confidence');
            expect(sentimentService.getFlagReason(lowConfidence)).toContain('Low confidence');
        });

        test('should handle missing data', () => {
            const reason = sentimentService.getFlagReason(null);

            expect(reason).toBe('Negative sentiment detected');
        });
    });
});
