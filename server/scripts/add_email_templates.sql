-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(50) UNIQUE NOT NULL, -- 'creation', 'inprogress', 'resolution', 'closure'
    subject_template VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Templates for the 4 Stages
INSERT INTO email_templates (stage_name, subject_template, body_html, body_text)
VALUES
(
    'creation',
    'Ticket Received: #{{ticket_code}} - {{subject}}',
    '<h1>We received your request</h1><p>Hi {{customer_name}},</p><p>Thank you for contacting support. A ticket has been created with ID <strong>#{{ticket_code}}</strong>.</p><p>We will get back to you shortly.</p>',
    'Hi {{customer_name}},\n\nThank you for contacting support. A ticket has been created with ID #{{ticket_code}}.\n\nWe will get back to you shortly.'
),
(
    'inprogress',
    'Update: Ticket #{{ticket_code}} is now In Progress',
    '<h1>Your ticket is being reviewed</h1><p>Hi {{customer_name}},</p><p>An agent has picked up your ticket <strong>#{{ticket_code}}</strong> and is currently working on it.</p><p>We will notify you once we have an update.</p>',
    'Hi {{customer_name}},\n\nAn agent has picked up your ticket #{{ticket_code}} and is currently working on it.\n\nWe will notify you once we have an update.'
),
(
    'resolution',
    'Ticket #{{ticket_code}} has been Resolved',
    '<h1>Good news!</h1><p>Hi {{customer_name}},</p><p>Your ticket <strong>#{{ticket_code}}</strong> has been marked as resolved.</p><p><strong>Resolution:</strong><br/>{{resolution_notes}}</p><p>If you disagree, please reply to this email.</p>',
    'Hi {{customer_name}},\n\nYour ticket #{{ticket_code}} has been marked as resolved.\n\nResolution:\n{{resolution_notes}}\n\nIf you disagree, please reply to this email.'
),
(
    'closure',
    'Ticket Closed: #{{ticket_code}}',
    '<h1>Ticket Closed</h1><p>Hi {{customer_name}},</p><p>Your ticket <strong>#{{ticket_code}}</strong> is now closed. We hope we were able to help!</p><p>How did we do? <a href="{{survey_link}}">Take a quick survey</a></p>',
    'Hi {{customer_name}},\n\nYour ticket #{{ticket_code}} is now closed.\n\nHow did we do? Take our survey: {{survey_link}}'
)
ON CONFLICT (stage_name) DO UPDATE 
SET subject_template = EXCLUDED.subject_template,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text;
