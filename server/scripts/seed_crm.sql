-- Seed Teams
INSERT INTO teams (name, description) VALUES 
('General Support', 'First line of defense'),
('Billing', 'Invoices and payments'),
('Technical', 'Level 2 technical support')
ON CONFLICT DO NOTHING;

-- Seed Users (optional mock for assignment)
-- Ideally we'd have real users linked to these teams.
