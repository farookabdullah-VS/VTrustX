const emailService = require('../emailService');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

jest.mock('../../infrastructure/database/db');
jest.mock('../../infrastructure/logger');

describe('EmailService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('trackMessage', () => {
        it('should insert email message tracking record', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await emailService.trackMessage({
                tenantId: 1,
                distributionId: 123,
                recipientEmail: 'test@example.com',
                recipientName: 'Test User',
                messageId: '<msg-id@example.com>',
                status: 'sent',
                sentAt: new Date()
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO email_messages'),
                expect.arrayContaining([
                    1,
                    123,
                    'test@example.com',
                    'Test User',
                    '<msg-id@example.com>',
                    'sent'
                ])
            );
        });

        it('should handle errors gracefully', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await emailService.trackMessage({
                tenantId: 1,
                recipientEmail: 'test@example.com',
                status: 'sent'
            });

            expect(logger.error).toHaveBeenCalledWith(
                '[EmailService] Failed to track message',
                expect.objectContaining({ error: 'Database error' })
            );
        });
    });

    describe('processStatusUpdate', () => {
        it('should process SendGrid webhook - delivered', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await emailService.processStatusUpdate({
                smtp_id: '<msg-123@sendgrid.net>',
                event: 'delivered',
                timestamp: 1234567890,
                email: 'test@example.com'
            }, 'sendgrid');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE email_messages'),
                expect.arrayContaining([
                    'delivered',
                    expect.any(Date),
                    expect.any(Date),
                    '<msg-123@sendgrid.net>'
                ])
            );
        });

        it('should process SendGrid webhook - bounce', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await emailService.processStatusUpdate({
                smtp_id: '<msg-123@sendgrid.net>',
                event: 'bounce',
                timestamp: 1234567890,
                reason: 'Invalid recipient',
                email: 'invalid@example.com'
            }, 'sendgrid');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE email_messages'),
                expect.arrayContaining([
                    'bounced',
                    expect.any(Date),
                    expect.any(Date),
                    'Invalid recipient',
                    'Invalid recipient',
                    '<msg-123@sendgrid.net>'
                ])
            );
        });

        it('should process SendGrid webhook - opened', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await emailService.processStatusUpdate({
                smtp_id: '<msg-123@sendgrid.net>',
                event: 'open',
                timestamp: 1234567890,
                email: 'test@example.com'
            }, 'sendgrid');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE email_messages'),
                expect.arrayContaining([
                    'opened',
                    expect.any(Date),
                    expect.any(Date),
                    '<msg-123@sendgrid.net>'
                ])
            );
        });

        it('should process SendGrid webhook - clicked', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await emailService.processStatusUpdate({
                smtp_id: '<msg-123@sendgrid.net>',
                event: 'click',
                timestamp: 1234567890,
                url: 'https://example.com',
                email: 'test@example.com'
            }, 'sendgrid');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE email_messages'),
                expect.arrayContaining([
                    'clicked',
                    expect.any(Date),
                    expect.any(Date),
                    '<msg-123@sendgrid.net>'
                ])
            );
        });

        it('should handle webhook with missing message ID', async () => {
            await emailService.processStatusUpdate({
                event: 'delivered',
                timestamp: 1234567890
            }, 'sendgrid');

            expect(query).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                '[EmailService] Webhook missing message ID',
                expect.objectContaining({ provider: 'sendgrid' })
            );
        });

        it('should log warning when message not found', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 0 });

            await emailService.processStatusUpdate({
                smtp_id: '<msg-123@sendgrid.net>',
                event: 'delivered',
                timestamp: 1234567890
            }, 'sendgrid');

            expect(logger.warn).toHaveBeenCalledWith(
                '[EmailService] Message not found for status update',
                expect.objectContaining({ messageId: '<msg-123@sendgrid.net>' })
            );
        });
    });

    describe('mapEmailStatus', () => {
        it('should map email provider events to internal status', () => {
            expect(emailService.mapEmailStatus('delivered')).toBe('delivered');
            expect(emailService.mapEmailStatus('bounce')).toBe('bounced');
            expect(emailService.mapEmailStatus('failed')).toBe('failed');
            expect(emailService.mapEmailStatus('open')).toBe('opened');
            expect(emailService.mapEmailStatus('click')).toBe('clicked');
            expect(emailService.mapEmailStatus('sent')).toBe('sent');
            expect(emailService.mapEmailStatus('dropped')).toBe('failed');
            expect(emailService.mapEmailStatus('unknown')).toBe('pending');
        });

        it('should handle case insensitivity', () => {
            expect(emailService.mapEmailStatus('DELIVERED')).toBe('delivered');
            expect(emailService.mapEmailStatus('Bounce')).toBe('bounced');
            expect(emailService.mapEmailStatus('Open')).toBe('opened');
        });
    });
});
