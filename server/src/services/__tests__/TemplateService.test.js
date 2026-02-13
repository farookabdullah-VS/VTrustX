const TemplateService = require('../TemplateService');
const StorageService = require('../../infrastructure/storage/StorageService');

// Mock StorageService
jest.mock('../../infrastructure/storage/StorageService');

describe('TemplateService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('replaceTextPlaceholders', () => {
        it('should replace text placeholders with context values', () => {
            const template = 'Hello {{name}}, click {{link}} to continue.';
            const context = {
                name: 'John Doe',
                link: 'https://example.com/survey'
            };

            const result = TemplateService.replaceTextPlaceholders(template, context);

            expect(result).toBe('Hello John Doe, click https://example.com/survey to continue.');
        });

        it('should replace multiple occurrences of same placeholder', () => {
            const template = '{{name}}, {{name}}, {{name}}!';
            const context = { name: 'Alice' };

            const result = TemplateService.replaceTextPlaceholders(template, context);

            expect(result).toBe('Alice, Alice, Alice!');
        });

        it('should remove unmatched placeholders', () => {
            const template = 'Hello {{name}}, {{missing}}';
            const context = { name: 'John' };

            const result = TemplateService.replaceTextPlaceholders(template, context);

            expect(result).toBe('Hello John, ');
        });

        it('should remove placeholders when context is empty', () => {
            const template = 'Hello {{name}}';
            const context = {};

            const result = TemplateService.replaceTextPlaceholders(template, context);

            expect(result).toBe('Hello ');
        });

        it('should handle all standard placeholders', () => {
            const template = '{{name}} - {{email}} - {{phone}} - {{link}} - {{company}}';
            const context = {
                name: 'John',
                email: 'john@example.com',
                phone: '+123456789',
                link: 'https://example.com',
                company: 'Acme Corp'
            };

            const result = TemplateService.replaceTextPlaceholders(template, context);

            expect(result).toBe('John - john@example.com - +123456789 - https://example.com - Acme Corp');
        });
    });

    describe('extractMediaIds', () => {
        it('should extract media IDs from template', () => {
            const template = 'Hello {{name}}, check out {{image:123}} and {{video:456}}.';

            const ids = TemplateService.extractMediaIds(template);

            expect(ids).toEqual([123, 456]);
        });

        it('should extract all media types', () => {
            const template = '{{image:1}} {{video:2}} {{document:3}} {{audio:4}}';

            const ids = TemplateService.extractMediaIds(template);

            expect(ids).toEqual([1, 2, 3, 4]);
        });

        it('should return empty array when no media placeholders', () => {
            const template = 'Hello {{name}}, {{link}}';

            const ids = TemplateService.extractMediaIds(template);

            expect(ids).toEqual([]);
        });

        it('should remove duplicate media IDs', () => {
            const template = '{{image:123}} {{image:123}} {{video:456}}';

            const ids = TemplateService.extractMediaIds(template);

            expect(ids).toEqual([123, 456]); // Duplicates removed
        });
    });

    describe('processMediaPlaceholders - Email', () => {
        it('should convert images to CID format for email', async () => {
            const text = 'Check out this image: {{image:123}}';
            const html = '<p>Check out this image: {{image:123}}</p>';
            const mediaAssets = [
                { id: 123, media_type: 'image', original_name: 'photo.jpg', storage_path: 'uploads/photo.jpg', mimetype: 'image/jpeg' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, html, mediaAssets, 'email');

            expect(result.text).toContain('[Image: photo.jpg]');
            expect(result.html).toContain('<img src="cid:image123@rayix.com"');
            expect(result.attachments).toHaveLength(1);
            expect(result.attachments[0].cid).toBe('image123@rayix.com');
            expect(result.attachments[0].filename).toBe('photo.jpg');
        });

        it('should attach videos as files for email', async () => {
            const text = 'Watch this: {{video:456}}';
            const mediaAssets = [
                { id: 456, media_type: 'video', original_name: 'video.mp4', storage_path: 'uploads/video.mp4', mimetype: 'video/mp4' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, '', mediaAssets, 'email');

            expect(result.text).toContain('[Attachment: video.mp4]');
            expect(result.attachments).toHaveLength(1);
            expect(result.attachments[0].filename).toBe('video.mp4');
        });

        it('should attach documents as files for email', async () => {
            const text = 'Download {{document:789}}';
            const mediaAssets = [
                { id: 789, media_type: 'document', original_name: 'report.pdf', storage_path: 'uploads/report.pdf', mimetype: 'application/pdf' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, '', mediaAssets, 'email');

            expect(result.text).toContain('[Attachment: report.pdf]');
            expect(result.attachments).toHaveLength(1);
            expect(result.attachments[0].filename).toBe('report.pdf');
        });

        it('should handle multiple media assets in email', async () => {
            const text = 'Image: {{image:1}} Video: {{video:2}}';
            const html = '<p>Image: {{image:1}} Video: {{video:2}}</p>';
            const mediaAssets = [
                { id: 1, media_type: 'image', original_name: 'img.jpg', storage_path: 'uploads/img.jpg', mimetype: 'image/jpeg' },
                { id: 2, media_type: 'video', original_name: 'vid.mp4', storage_path: 'uploads/vid.mp4', mimetype: 'video/mp4' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, html, mediaAssets, 'email');

            expect(result.attachments).toHaveLength(2);
            expect(result.html).toContain('cid:image1@rayix.com');
            expect(result.text).toContain('[Image: img.jpg]');
            expect(result.text).toContain('[Attachment: vid.mp4]');
        });
    });

    describe('processMediaPlaceholders - WhatsApp', () => {
        it('should replace media placeholders and return mediaUrls for WhatsApp', async () => {
            const text = 'Check this out: {{image:123}}';
            const mediaAssets = [
                { id: 123, media_type: 'image', original_name: 'photo.jpg', storage_path: 'uploads/photo.jpg', mimetype: 'image/jpeg' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, '', mediaAssets, 'whatsapp');

            expect(result.text).toBe('Check this out: [Image: photo.jpg]');
            expect(result.mediaUrls).toHaveLength(1);
            expect(result.mediaUrls[0]).toEqual({
                type: 'image',
                url: 'uploads/photo.jpg',
                filename: 'photo.jpg',
                mimetype: 'image/jpeg'
            });
        });

        it('should support multiple media in WhatsApp', async () => {
            const text = '{{image:1}} {{video:2}}';
            const mediaAssets = [
                { id: 1, media_type: 'image', original_name: 'img.jpg', storage_path: 'uploads/img.jpg', mimetype: 'image/jpeg' },
                { id: 2, media_type: 'video', original_name: 'vid.mp4', storage_path: 'uploads/vid.mp4', mimetype: 'video/mp4' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, '', mediaAssets, 'whatsapp');

            expect(result.mediaUrls).toHaveLength(2);
            expect(result.mediaUrls[0].type).toBe('image');
            expect(result.mediaUrls[1].type).toBe('video');
        });
    });

    describe('processMediaPlaceholders - SMS', () => {
        it('should replace media with URLs for SMS', async () => {
            const text = 'Check this: {{image:123}}';
            const mediaAssets = [
                { id: 123, media_type: 'image', original_name: 'photo.jpg', storage_path: 'uploads/photo.jpg', cdn_url: 'https://cdn.example.com/photo.jpg' }
            ];

            const result = await TemplateService.processMediaPlaceholders(text, '', mediaAssets, 'sms');

            expect(result.text).toBe('Check this: https://cdn.example.com/photo.jpg');
            expect(result.mediaUrls).toEqual([]);
            expect(result.attachments).toEqual([]);
        });
    });

    describe('renderTemplate', () => {
        it('should render complete template for email with text and media', async () => {
            const template = 'Hello {{name}}, check {{image:123}} and visit {{link}}';
            const context = { name: 'Alice', link: 'https://example.com' };
            const htmlTemplate = '<p>Hello {{name}}, check {{image:123}} and visit {{link}}</p>';
            const mediaAssets = [
                { id: 123, media_type: 'image', original_name: 'photo.jpg', storage_path: 'uploads/photo.jpg', mimetype: 'image/jpeg' }
            ];

            const result = await TemplateService.renderTemplate(template, context, mediaAssets, 'email', { htmlTemplate });

            expect(result.text).toContain('Hello Alice');
            expect(result.text).toContain('https://example.com');
            expect(result.text).toContain('[Image: photo.jpg]');
            expect(result.html).toContain('Alice');
            expect(result.html).toContain('cid:image123@rayix.com');
            expect(result.attachments).toHaveLength(1);
            expect(result.channel).toBe('email');
        });

        it('should render template for SMS without media support', async () => {
            const template = 'Hi {{name}}, visit {{link}}';
            const context = { name: 'Bob', link: 'https://example.com' };

            const result = await TemplateService.renderTemplate(template, context, [], 'sms');

            expect(result.text).toBe('Hi Bob, visit https://example.com');
            expect(result.html).toBeNull();
            expect(result.attachments).toEqual([]);
            expect(result.mediaUrls).toEqual([]);
            expect(result.channel).toBe('sms');
        });

        it('should render template for WhatsApp with media', async () => {
            const template = 'Hello {{name}} {{image:1}}';
            const context = { name: 'Charlie' };
            const mediaAssets = [
                { id: 1, media_type: 'image', original_name: 'img.jpg', storage_path: 'uploads/img.jpg', mimetype: 'image/jpeg' }
            ];

            const result = await TemplateService.renderTemplate(template, context, mediaAssets, 'whatsapp');

            expect(result.text).toContain('Hello Charlie');
            expect(result.text).toContain('[Image: img.jpg]');
            expect(result.mediaUrls).toHaveLength(1);
            expect(result.channel).toBe('whatsapp');
        });

        it('should handle template with no placeholders', async () => {
            const template = 'Plain text message';
            const context = {};

            const result = await TemplateService.renderTemplate(template, context, [], 'email');

            expect(result.text).toBe('Plain text message');
            expect(result.html).toBeNull();
        });

        it('should handle empty media assets', async () => {
            const template = 'Hello {{name}}';
            const context = { name: 'Dave' };

            const result = await TemplateService.renderTemplate(template, context, [], 'email');

            expect(result.text).toBe('Hello Dave');
            expect(result.attachments).toEqual([]);
        });
    });

    describe('validateTemplate', () => {
        it('should validate template with valid placeholders', () => {
            const template = 'Hello {{name}}, visit {{link}}';

            const result = TemplateService.validateTemplate(template);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should detect unclosed placeholders', () => {
            const template = 'Hello {{name}, visit {{link}}';

            const result = TemplateService.validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('{{ and }} count mismatch');
        });

        it('should accept all valid placeholder formats', () => {
            const template = '{{image:1}} {{video:2}} {{document:3}} {{audio:4}} {{name}} {{link}}';

            const result = TemplateService.validateTemplate(template);

            expect(result.valid).toBe(true);
        });

        it('should detect invalid syntax', () => {
            const template = '{{name';

            const result = TemplateService.validateTemplate(template);

            expect(result.valid).toBe(false);
        });
    });

    describe('getAvailablePlaceholders', () => {
        it('should return all available text placeholders', () => {
            const placeholders = TemplateService.getAvailablePlaceholders();

            expect(placeholders.text).toBeInstanceOf(Array);
            expect(placeholders.text.length).toBeGreaterThan(0);
            expect(placeholders.text.find(p => p.name === 'name')).toBeDefined();
            expect(placeholders.text.find(p => p.name === 'email')).toBeDefined();
            expect(placeholders.text.find(p => p.name === 'phone')).toBeDefined();
            expect(placeholders.text.find(p => p.name === 'link')).toBeDefined();
            expect(placeholders.text.find(p => p.name === 'company')).toBeDefined();
        });

        it('should return media placeholder examples', () => {
            const placeholders = TemplateService.getAvailablePlaceholders();

            expect(placeholders.media).toBeInstanceOf(Array);
            expect(placeholders.media.length).toBe(4);
            expect(placeholders.media.find(p => p.name === 'image:ID')).toBeDefined();
            expect(placeholders.media.find(p => p.name === 'video:ID')).toBeDefined();
            expect(placeholders.media.find(p => p.name === 'document:ID')).toBeDefined();
            expect(placeholders.media.find(p => p.name === 'audio:ID')).toBeDefined();
        });
    });
});
