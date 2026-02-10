-- SQL Export for Customer Satisfaction Survey
-- Generated: 2026-01-23T03:35:54.892Z
-- Total Responses: 3

-- Create tables

CREATE TABLE IF NOT EXISTS exported_forms (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    definition TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exported_submissions (
    id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(36) NOT NULL,
    status VARCHAR(20),
    respondent_email VARCHAR(255),
    metadata TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES exported_forms(id)
);

CREATE TABLE IF NOT EXISTS exported_responses (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(36) NOT NULL,
    question_name VARCHAR(255) NOT NULL,
    question_title TEXT,
    question_type VARCHAR(50),
    response_value TEXT,
    response_score DECIMAL(10,2),
    created_at TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES exported_submissions(id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_form ON exported_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_submission ON exported_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON exported_responses(question_name);


-- Insert form

INSERT INTO exported_forms (id, title, definition, created_at) VALUES (
    'test-form-123',
    'Customer Satisfaction Survey',
    '[{\"name\":\"satisfaction\",\"title\":\"How satisfied are you with our service?\",\"type\":\"radiogroup\",\"isRequired\":false,\"choices\":[{\"value\":\"very_satisfied\",\"text\":\"Very Satisfied\"},{\"value\":\"satisfied\",\"text\":\"Satisfied\"},{\"value\":\"neutral\",\"text\":\"Neutral\"},{\"value\":\"dissatisfied\",\"text\":\"Dissatisfied\"},{\"value\":\"very_dissatisfied\",\"text\":\"Very Dissatisfied\"}],\"hasOther\":false,\"hasNone\":false,\"hasSelectAll\":false},{\"name\":\"likelihood\",\"title\":\"How likely are you to recommend us?\",\"type\":\"rating\",\"isRequired\":false,\"choices\":[],\"hasOther\":false,\"hasNone\":false,\"hasSelectAll\":false,\"rateMin\":1,\"rateMax\":10,\"rateStep\":1},{\"name\":\"features\",\"title\":\"Which features do you use?\",\"type\":\"checkbox\",\"isRequired\":false,\"choices\":[{\"value\":\"surveys\",\"text\":\"Surveys\"},{\"value\":\"analytics\",\"text\":\"Analytics\"},{\"value\":\"exports\",\"text\":\"Exports\"},{\"value\":\"integrations\",\"text\":\"Integrations\"}],\"hasOther\":false,\"hasNone\":false,\"hasSelectAll\":false},{\"name\":\"feedback\",\"title\":\"Additional feedback\",\"type\":\"comment\",\"isRequired\":false,\"choices\":[],\"hasOther\":false,\"hasNone\":false,\"hasSelectAll\":false}]',
    CURRENT_TIMESTAMP
);

-- Insert submissions

INSERT INTO exported_submissions (id, form_id, status, respondent_email, metadata, created_at) VALUES (
    'sub-1',
    'test-form-123',
    'completed',
    'user1@example.com',
    '{\"source\":\"web\",\"duration\":120}',
    '2026-01-15 00:00:00.000'
);

INSERT INTO exported_submissions (id, form_id, status, respondent_email, metadata, created_at) VALUES (
    'sub-2',
    'test-form-123',
    'completed',
    'user2@example.com',
    '{\"source\":\"email\",\"duration\":180}',
    '2026-01-16 00:00:00.000'
);

INSERT INTO exported_submissions (id, form_id, status, respondent_email, metadata, created_at) VALUES (
    'sub-3',
    'test-form-123',
    'completed',
    'user3@example.com',
    '{\"source\":\"web\",\"duration\":90}',
    '2026-01-17 00:00:00.000'
);

-- Insert responses

INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-1',
    'satisfaction',
    'How satisfied are you with our service?',
    'radiogroup',
    'very_satisfied',
    1,
    '2026-01-15 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-1',
    'likelihood',
    'How likely are you to recommend us?',
    'rating',
    '9',
    9,
    '2026-01-15 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-1',
    'features',
    'Which features do you use?',
    'checkbox',
    '[\"surveys\",\"analytics\",\"exports\"]',
    0,
    '2026-01-15 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-1',
    'feedback',
    'Additional feedback',
    'comment',
    'Great product! Very easy to use.',
    NULL,
    '2026-01-15 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-2',
    'satisfaction',
    'How satisfied are you with our service?',
    'radiogroup',
    'satisfied',
    2,
    '2026-01-16 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-2',
    'likelihood',
    'How likely are you to recommend us?',
    'rating',
    '8',
    8,
    '2026-01-16 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-2',
    'features',
    'Which features do you use?',
    'checkbox',
    '[\"surveys\",\"analytics\"]',
    0,
    '2026-01-16 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-2',
    'feedback',
    'Additional feedback',
    'comment',
    'Good features, would like more integrations.',
    NULL,
    '2026-01-16 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-3',
    'satisfaction',
    'How satisfied are you with our service?',
    'radiogroup',
    'neutral',
    3,
    '2026-01-17 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-3',
    'likelihood',
    'How likely are you to recommend us?',
    'rating',
    '6',
    6,
    '2026-01-17 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-3',
    'features',
    'Which features do you use?',
    'checkbox',
    '[\"surveys\"]',
    0,
    '2026-01-17 00:00:00.000'
);
INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (
    'sub-3',
    'feedback',
    'Additional feedback',
    'comment',
    'It works but could be better.',
    NULL,
    '2026-01-17 00:00:00.000'
);

