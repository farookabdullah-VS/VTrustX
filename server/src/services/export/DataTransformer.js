/**
 * DataTransformer - Transforms raw submission data based on export options
 */

class DataTransformer {
    /**
     * Transform form and submission data
     */
    async transform(formData, submissions, options) {
        const definition = formData.definition;
        const questions = this.extractQuestions(definition);

        const transformedSubmissions = submissions.map(submission => {
            return this.transformSubmission(submission, questions, options);
        });

        return {
            form: {
                id: formData.id,
                title: formData.title,
                createdAt: formData.created_at,
                questions: questions
            },
            submissions: transformedSubmissions,
            metadata: {
                totalResponses: submissions.length,
                exportDate: new Date(),
                options: options
            }
        };
    }

    /**
     * Extract questions from SurveyJS definition
     */
    extractQuestions(definition) {
        const questions = [];

        if (!definition || !definition.pages) {
            return questions;
        }

        definition.pages.forEach(page => {
            if (page.elements) {
                page.elements.forEach(element => {
                    questions.push(this.parseQuestion(element));
                });
            }
        });

        return questions;
    }

    /**
     * Parse individual question
     */
    parseQuestion(element) {
        const question = {
            name: element.name,
            title: element.title || element.name,
            type: element.type,
            isRequired: element.isRequired || false,
            choices: element.choices || [],
            hasOther: element.hasOther || false,
            hasNone: element.hasNone || false,
            hasSelectAll: element.hasSelectAll || false
        };

        // Handle matrix questions
        if (element.type === 'matrix' || element.type === 'matrixdropdown' || element.type === 'matrixdynamic') {
            question.rows = element.rows || [];
            question.columns = element.columns || [];
        }

        // Handle rating questions
        if (element.type === 'rating') {
            question.rateMin = element.rateMin || 1;
            question.rateMax = element.rateMax || 5;
            question.rateStep = element.rateStep || 1;
        }

        return question;
    }

    /**
     * Transform individual submission
     */
    transformSubmission(submission, questions, options) {
        const transformed = {
            id: submission.id,
            submittedAt: submission.created_at,
            status: submission.status,
            respondentEmail: submission.respondent_email,
            metadata: submission.metadata || {},
            responses: {}
        };

        // Transform each response
        questions.forEach(question => {
            const value = submission.data?.[question.name];

            if (value !== undefined && value !== null) {
                transformed.responses[question.name] = this.transformResponse(
                    value,
                    question,
                    options
                );
            } else if (options.showNotDisplayed) {
                transformed.responses[question.name] = this.getEmptyValue(question, options);
            }
        });

        return transformed;
    }

    /**
     * Transform individual response based on question type and options
     */
    transformResponse(value, question, options) {
        // For checkbox questions with unselected options
        if (question.type === 'checkbox' && Array.isArray(value)) {
            if (options.displayAnswerCodes) {
                return this.getCheckboxCodes(value, question, options);
            } else if (options.displayAnswerValues) {
                return this.getCheckboxValues(value, question, options);
            }
        }

        // For single choice questions
        if ((question.type === 'radiogroup' || question.type === 'dropdown') && question.choices) {
            if (options.displayAnswerCodes) {
                return this.getChoiceCode(value, question.choices);
            } else if (options.displayAnswerValues) {
                return this.getChoiceValue(value, question.choices);
            }
        }

        // For matrix questions
        if (question.type === 'matrix' && typeof value === 'object') {
            return this.transformMatrixResponse(value, question, options);
        }

        // For rating questions
        if (question.type === 'rating') {
            return value;
        }

        // For text questions
        return value;
    }

    /**
     * Get checkbox codes with unselected representation
     */
    getCheckboxCodes(selectedValues, question, options) {
        const result = {};

        question.choices.forEach((choice, index) => {
            const choiceValue = typeof choice === 'object' ? choice.value : choice;
            const isSelected = selectedValues.includes(choiceValue);

            if (options.displayAnswerCodes) {
                result[choiceValue] = isSelected ? index + 1 : (options.unselectedCheckboxes || 0);
            } else {
                result[choiceValue] = isSelected ? 1 : (options.unselectedCheckboxes || 0);
            }
        });

        return result;
    }

    /**
     * Get checkbox values
     */
    getCheckboxValues(selectedValues, question, options) {
        const result = {};

        question.choices.forEach(choice => {
            const choiceValue = typeof choice === 'object' ? choice.value : choice;
            const choiceText = typeof choice === 'object' ? choice.text : choice;
            const isSelected = selectedValues.includes(choiceValue);

            result[choiceValue] = isSelected ? choiceText : '';
        });

        return result;
    }

    /**
     * Get choice code
     */
    getChoiceCode(value, choices) {
        const index = choices.findIndex(c => {
            const choiceValue = typeof c === 'object' ? c.value : c;
            return choiceValue === value;
        });
        return index >= 0 ? index + 1 : value;
    }

    /**
     * Get choice value
     */
    getChoiceValue(value, choices) {
        const choice = choices.find(c => {
            const choiceValue = typeof c === 'object' ? c.value : c;
            return choiceValue === value;
        });

        if (choice) {
            return typeof choice === 'object' ? choice.text : choice;
        }
        return value;
    }

    /**
     * Transform matrix response
     */
    transformMatrixResponse(value, question, options) {
        const result = {};

        Object.keys(value).forEach(rowKey => {
            const cellValue = value[rowKey];

            if (options.displayAnswerCodes) {
                const colIndex = question.columns.findIndex(c => {
                    const colValue = typeof c === 'object' ? c.value : c;
                    return colValue === cellValue;
                });
                result[rowKey] = colIndex >= 0 ? colIndex + 1 : cellValue;
            } else {
                result[rowKey] = cellValue;
            }
        });

        return result;
    }

    /**
     * Get empty value based on question type
     */
    getEmptyValue(question, options) {
        if (question.type === 'checkbox') {
            const result = {};
            question.choices.forEach(choice => {
                const choiceValue = typeof choice === 'object' ? choice.value : choice;
                result[choiceValue] = options.unselectedCheckboxes || 0;
            });
            return result;
        }

        return '';
    }

    /**
     * Flatten responses for tabular export
     */
    flattenResponses(transformedData) {
        const flattened = [];

        transformedData.submissions.forEach(submission => {
            const row = {
                submission_id: submission.id,
                submitted_at: submission.submittedAt,
                status: submission.status,
                respondent_email: submission.respondentEmail
            };

            // Add metadata fields
            if (submission.metadata) {
                Object.keys(submission.metadata).forEach(key => {
                    row[`metadata_${key}`] = submission.metadata[key];
                });
            }

            // Add responses
            Object.keys(submission.responses).forEach(questionName => {
                const response = submission.responses[questionName];

                if (typeof response === 'object' && !Array.isArray(response)) {
                    // Flatten nested objects (checkboxes, matrix)
                    Object.keys(response).forEach(subKey => {
                        row[`${questionName}_${subKey}`] = response[subKey];
                    });
                } else if (Array.isArray(response)) {
                    row[questionName] = response.join(', ');
                } else {
                    row[questionName] = response;
                }
            });

            flattened.push(row);
        });

        return flattened;
    }

    /**
     * Get column headers for export
     */
    getColumnHeaders(transformedData, options) {
        const headers = [];

        // Standard columns
        headers.push({ key: 'submission_id', label: 'Submission ID' });
        headers.push({ key: 'submitted_at', label: 'Submitted At' });
        headers.push({ key: 'status', label: 'Status' });
        headers.push({ key: 'respondent_email', label: 'Respondent Email' });

        // Question columns
        transformedData.form.questions.forEach(question => {
            if (question.type === 'checkbox' || question.type === 'matrix') {
                // Expand checkbox/matrix into multiple columns
                if (question.type === 'checkbox') {
                    question.choices.forEach(choice => {
                        const choiceValue = typeof choice === 'object' ? choice.value : choice;
                        const choiceText = typeof choice === 'object' ? choice.text : choice;

                        headers.push({
                            key: `${question.name}_${choiceValue}`,
                            label: options.questionCodes ? `${question.name}_${choiceValue}` : `${question.title} - ${choiceText}`
                        });
                    });
                } else if (question.type === 'matrix') {
                    question.rows.forEach(row => {
                        const rowValue = typeof row === 'object' ? row.value : row;
                        const rowText = typeof row === 'object' ? row.text : row;

                        headers.push({
                            key: `${question.name}_${rowValue}`,
                            label: options.questionCodes ? `${question.name}_${rowValue}` : `${question.title} - ${rowText}`
                        });
                    });
                }
            } else {
                headers.push({
                    key: question.name,
                    label: options.questionCodes ? question.name : question.title
                });
            }
        });

        return headers;
    }
}

module.exports = DataTransformer;
