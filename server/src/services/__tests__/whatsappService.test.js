const whatsappService = require('../whatsappService');
const { query } = require('../../infrastructure/database/db');
const { decrypt } = require('../../infrastructure/security/encryption');
const axios = require('axios');

// Mock dependencies
jest.mock('../../infrastructure/database/db');
jest.mock('../../infrastructure/security/encryption');
jest.mock('axios');

describe('WhatsAppService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset service state
        whatsappService.integration = null;
        whatsappService.accountSid = null;
        whatsappService.authToken = null;
        whatsappService.fromNumber = null;
    });

    describe('loadIntegration', () => {
        it('should load integration successfully', async () => {
            const mockIntegration = {
                id: 1,
                provider: 'Twilio WhatsApp',
                api_key: 'gcm:encrypted_account_sid',
                config: {
                    auth_token: 'gcm:encrypted_auth_token',
                    from: 'whatsapp:+14155238886'
                }
            };

            query.mockResolvedValue({ rows: [mockIntegration] });
            decrypt.mockImplementation((val) => {
                if (val === 'gcm:encrypted_account_sid') return 'AC123456789';
                if (val === 'gcm:encrypted_auth_token') return 'auth_token_123';
                return val;
            });

            const result = await whatsappService.loadIntegration(1);

            expect(result).toBe(true);
            expect(whatsappService.accountSid).toBe('AC123456789');
            expect(whatsappService.authToken).toBe('auth_token_123');
            expect(whatsappService.fromNumber).toBe('whatsapp:+14155238886');
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining("WHERE tenant_id = $1"),
                [1]
            );
        });

        it('should return false if integration not found', async () => {
            query.mockResolvedValue({ rows: [] });

            const result = await whatsappService.loadIntegration(1);

            expect(result).toBe(false);
        });

        it('should return false if credentials are missing', async () => {
            const mockIntegration = {
                id: 1,
                provider: 'Twilio WhatsApp',
                api_key: null,
                config: {}
            };

            query.mockResolvedValue({ rows: [mockIntegration] });
            decrypt.mockReturnValue(null);

            const result = await whatsappService.loadIntegration(1);

            expect(result).toBe(false);
        });

        it('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            const result = await whatsappService.loadIntegration(1);

            expect(result).toBe(false);
        });
    });

    describe('formatPhoneNumber', () => {
        it('should format phone number with + prefix', () => {
            const result = whatsappService.formatPhoneNumber('+966501234567');
            expect(result).toBe('whatsapp:+966501234567');
        });

        it('should add + prefix if missing (Saudi Arabia default)', () => {
            const result = whatsappService.formatPhoneNumber('501234567');
            expect(result).toBe('whatsapp:+966501234567');
        });

        it('should remove spaces and dashes', () => {
            const result = whatsappService.formatPhoneNumber('+966 50-123-4567');
            expect(result).toBe('whatsapp:+966501234567');
        });

        it('should handle phone with leading zeros', () => {
            const result = whatsappService.formatPhoneNumber('0501234567');
            expect(result).toBe('whatsapp:+966501234567');
        });

        it('should return null for empty input', () => {
            const result = whatsappService.formatPhoneNumber('');
            expect(result).toBeNull();
        });

        it('should preserve country code', () => {
            const result = whatsappService.formatPhoneNumber('+14155238886');
            expect(result).toBe('whatsapp:+14155238886');
        });
    });

    describe('validatePhoneNumber', () => {
        it('should validate correct E.164 format', () => {
            expect(whatsappService.validatePhoneNumber('whatsapp:+966501234567')).toBe(true);
            expect(whatsappService.validatePhoneNumber('whatsapp:+14155238886')).toBe(true);
            expect(whatsappService.validatePhoneNumber('whatsapp:+447700900123')).toBe(true);
        });

        it('should reject invalid formats', () => {
            expect(whatsappService.validatePhoneNumber('whatsapp:501234567')).toBe(false); // No +
            expect(whatsappService.validatePhoneNumber('whatsapp:+0501234567')).toBe(false); // Starts with 0
            expect(whatsappService.validatePhoneNumber('whatsapp:+12')).toBe(false); // Too short
            expect(whatsappService.validatePhoneNumber('whatsapp:+1234567890123456')).toBe(false); // Too long
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            // Pre-load integration for tests
            whatsappService.accountSid = 'AC123456789';
            whatsappService.authToken = 'auth_token_123';
            whatsappService.fromNumber = 'whatsapp:+14155238886';
        });

        it('should send message successfully', async () => {
            const mockResponse = {
                data: {
                    sid: 'SM1234567890',
                    status: 'queued',
                    to: 'whatsapp:+966501234567',
                    from: 'whatsapp:+14155238886'
                }
            };

            axios.post.mockResolvedValue(mockResponse);
            query.mockResolvedValue({ rows: [] }); // Mock trackMessage

            const result = await whatsappService.sendMessage(
                '+966501234567',
                'Hello {{name}}! Click here: {{link}}',
                { tenantId: 1, distributionId: 123, recipientName: 'John Doe' }
            );

            expect(result.success).toBe(true);
            expect(result.messageSid).toBe('SM1234567890');
            expect(result.status).toBe('pending');
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/Messages.json'),
                expect.any(URLSearchParams),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Basic')
                    })
                })
            );
        });

        it('should handle invalid phone number', async () => {
            query.mockResolvedValue({ rows: [] }); // Mock trackMessage

            const result = await whatsappService.sendMessage(
                'invalid_phone',
                'Test message',
                { tenantId: 1 }
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid phone number format');
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should handle Twilio API errors', async () => {
            const mockError = {
                response: {
                    data: {
                        code: 63007,
                        message: 'Invalid phone number'
                    }
                }
            };

            axios.post.mockRejectedValue(mockError);
            query.mockResolvedValue({ rows: [] }); // Mock trackMessage

            const result = await whatsappService.sendMessage(
                '+966501234567',
                'Test message',
                { tenantId: 1, distributionId: 123 }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid phone number');
            expect(result.errorCode).toBe(63007);
        });

        it('should track message in database', async () => {
            const mockResponse = {
                data: {
                    sid: 'SM1234567890',
                    status: 'sent'
                }
            };

            axios.post.mockResolvedValue(mockResponse);
            query.mockResolvedValue({ rows: [] });

            await whatsappService.sendMessage(
                '+966501234567',
                'Test message',
                { tenantId: 1, distributionId: 123, recipientName: 'John' }
            );

            // Verify trackMessage was called
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO whatsapp_messages'),
                expect.arrayContaining([
                    1, // tenantId
                    123, // distributionId
                    '+966501234567', // phone
                    'John', // name
                    'SM1234567890', // messageSid
                    'sent', // status
                    null, // errorCode
                    null, // errorMessage
                    expect.any(Date), // sentAt
                    null // failedAt
                ])
            );
        });

        it('should update session after sending', async () => {
            const mockResponse = {
                data: {
                    sid: 'SM1234567890',
                    status: 'sent'
                }
            };

            axios.post.mockResolvedValue(mockResponse);
            query.mockResolvedValue({ rows: [] });

            await whatsappService.sendMessage(
                '+966501234567',
                'Test message',
                { tenantId: 1 }
            );

            // Verify session update was called
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO whatsapp_sessions'),
                expect.arrayContaining([
                    1, // tenantId
                    '+966501234567', // phone
                    expect.any(Date) // sessionExpiresAt (24h from now)
                ])
            );
        });
    });

    describe('processStatusUpdate', () => {
        it('should process delivery status update', async () => {
            const webhookData = {
                MessageSid: 'SM1234567890',
                MessageStatus: 'delivered',
                From: 'whatsapp:+14155238886',
                To: 'whatsapp:+966501234567'
            };

            query.mockResolvedValue({ rowCount: 1 });

            await whatsappService.processStatusUpdate(webhookData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE whatsapp_messages'),
                expect.arrayContaining([
                    'delivered', // status
                    expect.any(Date), // timestamp
                    expect.any(Date), // delivered_at
                    'SM1234567890' // messageSid
                ])
            );
        });

        it('should process failed status with error', async () => {
            const webhookData = {
                MessageSid: 'SM1234567890',
                MessageStatus: 'failed',
                ErrorCode: '63016',
                ErrorMessage: 'Phone not on WhatsApp'
            };

            query.mockResolvedValue({ rowCount: 1 });

            await whatsappService.processStatusUpdate(webhookData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE whatsapp_messages'),
                expect.arrayContaining([
                    'failed', // status
                    expect.any(Date), // timestamp
                    expect.any(Date), // failed_at
                    '63016', // error_code
                    'Phone not on WhatsApp', // error_message
                    'SM1234567890' // messageSid
                ])
            );
        });

        it('should handle read status', async () => {
            const webhookData = {
                MessageSid: 'SM1234567890',
                MessageStatus: 'read'
            };

            query.mockResolvedValue({ rowCount: 1 });

            await whatsappService.processStatusUpdate(webhookData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE whatsapp_messages'),
                expect.arrayContaining([
                    'read', // status
                    expect.any(Date), // timestamp
                    expect.any(Date), // read_at
                    'SM1234567890' // messageSid
                ])
            );
        });

        it('should handle missing MessageSid gracefully', async () => {
            const webhookData = {
                MessageStatus: 'delivered'
            };

            await whatsappService.processStatusUpdate(webhookData);

            expect(query).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            const webhookData = {
                MessageSid: 'SM1234567890',
                MessageStatus: 'delivered'
            };

            query.mockRejectedValue(new Error('Database error'));

            // Should not throw
            await expect(whatsappService.processStatusUpdate(webhookData)).resolves.not.toThrow();
        });
    });

    describe('mapTwilioStatus', () => {
        it('should map Twilio statuses correctly', () => {
            expect(whatsappService.mapTwilioStatus('queued')).toBe('pending');
            expect(whatsappService.mapTwilioStatus('sending')).toBe('pending');
            expect(whatsappService.mapTwilioStatus('sent')).toBe('sent');
            expect(whatsappService.mapTwilioStatus('delivered')).toBe('delivered');
            expect(whatsappService.mapTwilioStatus('read')).toBe('read');
            expect(whatsappService.mapTwilioStatus('failed')).toBe('failed');
            expect(whatsappService.mapTwilioStatus('undelivered')).toBe('failed');
        });

        it('should default to pending for unknown status', () => {
            expect(whatsappService.mapTwilioStatus('unknown_status')).toBe('pending');
        });
    });
});
