const Joi = require('joi');

const createTicketSchema = Joi.object({
  subject: Joi.string().min(1).max(500).required(),
  description: Joi.string().max(5000).allow('', null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  channel: Joi.string().valid('web', 'email', 'phone', 'chat', 'social', 'api').default('web'),
  contact_id: Joi.number().integer().allow(null),
  account_id: Joi.number().integer().allow(null),
  status: Joi.string().valid('new', 'open').default('new'),
});

const bulkUpdateSchema = Joi.object({
  ticketIds: Joi.array().items(Joi.number().integer()).min(1).max(100).required(),
  updates: Joi.object({
    status: Joi.string().valid('new', 'open', 'pending', 'resolved', 'closed'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    assigned_user_id: Joi.number().integer().allow(null),
    assigned_team_id: Joi.number().integer().allow(null),
  }).min(1).required(),
});

module.exports = { createTicketSchema, bulkUpdateSchema };
