const { createTicketSchema, bulkUpdateSchema } = require('../../schemas/crm.schemas');

describe('CRM Schemas', () => {
  describe('createTicketSchema', () => {
    it('should accept valid ticket data', () => {
      const { error, value } = createTicketSchema.validate({
        subject: 'Bug report',
        description: 'Something is broken',
        priority: 'high',
        channel: 'email',
      });
      expect(error).toBeUndefined();
      expect(value.subject).toBe('Bug report');
    });

    it('should apply defaults for priority and channel', () => {
      const { error, value } = createTicketSchema.validate({
        subject: 'Test ticket',
      });
      expect(error).toBeUndefined();
      expect(value.priority).toBe('medium');
      expect(value.channel).toBe('web');
      expect(value.status).toBe('new');
    });

    it('should reject empty subject', () => {
      const { error } = createTicketSchema.validate({
        subject: '',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing subject', () => {
      const { error } = createTicketSchema.validate({
        description: 'No subject here',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid priority', () => {
      const { error } = createTicketSchema.validate({
        subject: 'Test',
        priority: 'super-duper',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid channel', () => {
      const { error } = createTicketSchema.validate({
        subject: 'Test',
        channel: 'pigeon',
      });
      expect(error).toBeDefined();
    });

    it('should accept optional contact and account IDs', () => {
      const { error } = createTicketSchema.validate({
        subject: 'Test',
        contact_id: 42,
        account_id: 7,
      });
      expect(error).toBeUndefined();
    });
  });

  describe('bulkUpdateSchema', () => {
    it('should accept valid bulk update', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [1, 2, 3],
        updates: { status: 'closed' },
      });
      expect(error).toBeUndefined();
    });

    it('should reject empty ticketIds', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [],
        updates: { status: 'closed' },
      });
      expect(error).toBeDefined();
    });

    it('should reject missing updates', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [1, 2],
      });
      expect(error).toBeDefined();
    });

    it('should reject empty updates object', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [1],
        updates: {},
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid status in updates', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [1],
        updates: { status: 'invalid-status' },
      });
      expect(error).toBeDefined();
    });

    it('should accept multiple update fields', () => {
      const { error } = bulkUpdateSchema.validate({
        ticketIds: [1, 2],
        updates: {
          status: 'open',
          priority: 'high',
          assigned_user_id: 5,
        },
      });
      expect(error).toBeUndefined();
    });

    it('should reject too many tickets (>100)', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      const { error } = bulkUpdateSchema.validate({
        ticketIds: ids,
        updates: { status: 'closed' },
      });
      expect(error).toBeDefined();
    });
  });
});
