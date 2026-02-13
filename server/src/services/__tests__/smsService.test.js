const smsService = require('../smsService');
const { query } = require('../../infrastructure/database/db');
const { decrypt } = require('../../infrastructure/security/encryption');
const logger = require('../../infrastructure/logger');
const axios = require('axios');

jest.mock('../../infrastructure/database/db');
jest.mock('../../infrastructure/security/encryption');
jest.mock('../../infrastructure/logger');
jest.mock('axios');

describe('SMSService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        smsService.integration = null;
        smsService.appSid = null;
        smsService.senderID = null;
    });

    describe('loadIntegration', () => {
        it('should load Unifonic integration successfully', async () => {
            query.mockResolvedValue({
                rows: [{
                    id: 1,
                    api_key: 'encrypted_app_sid',
                    config: { sender_id: 'TestSender' }
                }]
            });
            decrypt.mockReturnValue('decrypted_app_sid');

            const result = await smsService.loadIntegration(1);

            expect(result).toBe(true);
            expect(smsService.appSid).toBe('decrypted_app_sid');
            expect(smsService.senderID).toBe('TestSender');
        });

        it('should return false when integration not found', async () => {
            query.mockResolvedValue({ rows: [] });

            const result = await smsService.loadIntegration(1);

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                '[SMSService] Unifonic integration not found or inactive',
                expect.objectContaining({ tenantId: 1 })
            );
        });

        it('should return false when AppSid is missing', async () => {
            query.mockResolvedValue({
                rows: [{
                    id: 1,
                    api_key: 'encrypted_app_sid',
                    config: {}
                }]
            });
            decrypt.mockReturnValue(null);

            const result = await smsService.loadIntegration(1);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                '[SMSService] Missing Unifonic AppSid',
                expect.objectContaining({ tenantId: 1 })
            );
        });
    });

    describe('formatPhoneNumber', () => {
        it('should remove non-digit characters', () => {
            expect(smsService.formatPhoneNumber('+966-50-123-4567')).toBe('966501234567');
            expect(smsService.formatPhoneNumber('(966) 50 123 4567')).toBe('966501234567');
        });

        it('should remove leading 00', () => {
            expect(smsService.formatPhoneNumber('00966501234567')).toBe('966501234567');
        });

        it('should handle already formatted numbers', () => {
            expect(smsService.formatPhoneNumber('966501234567')).toBe('966501234567');
        });

        it('should return null for empty input', () => {
            expect(smsService.formatPhoneNumber('')).toBe(null);
            expect(smsService.formatPhoneNumber(null)).toBe(null);
        });
    });

    describe('validatePhoneNumber', () => {
        it('should validate correct phone numbers', () => {
            expect(smsService.validatePhoneNumber('966501234567')).toBe(true);
            expect(smsService.validatePhoneNumber('+966501234567')).toBe(true);
            expect(smsService.validatePhoneNumber('1234567890')).toBe(true);
        });

        it('should reject too short numbers', () => {
            expect(smsService.validatePhoneNumber('123456789')).toBe(false);
            expect(smsService.validatePhoneNumber('12345')).toBe(false);
        });

        it('should reject too long numbers', () => {
            expect(smsService.validatePhoneNumber('12345678901234567')).toBe(false);
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            smsService.appSid = 'test_app_sid';
            smsService.senderID = 'TestSender';
        });

        it('should send SMS successfully', async () => {
            axios.post.mockResolvedValue({
                data: {
                    MessageID: 'MSG-123',
                    status: 'Sent'
                }
            });
            query.mockResolvedValue({ rows: [] });

            const result = await smsService.sendMessage(
                '966501234567',
                'Test message',
                { tenantId: 1, distributionId: 123, recipientName: 'Test User' }
            );

            expect(result.success).toBe(true);
            expect(result.messageSid).toBe('MSG-123');
            expect(result.status).toBe('sent');
            expect(axios.post).toHaveBeenCalled();
        });

        it('should track message in database', async () => {
            axios.post.mockResolvedValue({
                data: {
                    MessageID: 'MSG-123',
                    status: 'Sent'
                }
            });
            query.mockResolvedValue({ rows: [] });

            await smsService.sendMessage(
                '966501234567',
                'Test message',
                { tenantId: 1, distributionId: 123, recipientName: 'Test User' }
            );

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO sms_messages'),
                expect.arrayContaining([
                    1,
                    123,
                    '966501234567',
                    'Test User',
                    'MSG-123',
                    'sent'
                ])
            );
        });

        it('should handle invalid phone number', async () => {
            query.mockResolvedValue({ rows: [] });

            const result = await smsService.sendMessage(
                '123',
                'Test message',
                { tenantId: 1 }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid phone number format');
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            axios.post.mockRejectedValue({
                response: {
                    data: {
                        errorCode: 'INVALID_APPSID',
                        message: 'Invalid AppSid'
                    }
                }
            });
            query.mockResolvedValue({ rows: [] });

            const result = await smsService.sendMessage(
                '966501234567',
                'Test message',
                { tenantId: 1 }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid AppSid');
            expect(result.errorCode).toBe('INVALID_APPSID');
        });

        it('should load integration if not already loaded', async () => {
            smsService.appSid = null; // Reset
            query.mockResolvedValueOnce({ // For loadIntegration
                rows: [{
                    id: 1,
                    api_key: 'encrypted_app_sid',
                    config: { sender_id: 'TestSender' }
                }]
            }).mockResolvedValue({ rows: [] }); // For trackMessage
            decrypt.mockReturnValue('decrypted_app_sid');
            axios.post.mockResolvedValue({
                data: {
                    MessageID: 'MSG-123',
                    status: 'Sent'
                }
            });

            const result = await smsService.sendMessage(
                '966501234567',
                'Test message',
                { tenantId: 1 }
            );

            expect(result.success).toBe(true);
        });
    });

    describe('processStatusUpdate', () => {
        it('should update message status to delivered', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await smsService.processStatusUpdate({
                MessageID: 'MSG-123',
                Status: 'Delivered',
                DoneDate: '2025-01-01T12:00:00Z'
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE sms_messages'),
                expect.arrayContaining([
                    'delivered',
                    expect.any(Date),
                    expect.any(Date),
                    'MSG-123'
                ])
            );
        });

        it('should update message status to failed', async () => {
            query.mockResolvedValue({ rows: [], rowCount: 1 });

            await smsService.processStatusUpdate({
                MessageID: 'MSG-123',
                Status: 'Failed',
                ErrorCode: 'INVALID_NUMBER',
                ErrorMessage: 'Invalid phone number',
                DoneDate: '2025-01-01T12:00:00Z'
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE sms_messages'),
                expect.arrayContaining([
                    'failed',
                    expect.any(Date),
                    expect.any(Date),
                    'INVALID_NUMBER',
                    'Invalid phone number',
                    'MSG-123'
                ])
            );
        });

        it('should handle webhook with missing MessageID', async () => {
            await smsService.processStatusUpdate({
                Status: 'Delivered'
            });

            expect(query).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith('[SMSService] Webhook missing MessageID');
        });
    });

    describe('mapUnifonicStatus', () => {
        it('should map Unifonic status to internal status', () => {
            expect(smsService.mapUnifonicStatus('Queued')).toBe('pending');
            expect(smsService.mapUnifonicStatus('Sent')).toBe('sent');
            expect(smsService.mapUnifonicStatus('Delivered')).toBe('delivered');
            expect(smsService.mapUnifonicStatus('Failed')).toBe('failed');
            expect(smsService.mapUnifonicStatus('Rejected')).toBe('failed');
            expect(smsService.mapUnifonicStatus('Unknown')).toBe('pending');
        });
    });
});
