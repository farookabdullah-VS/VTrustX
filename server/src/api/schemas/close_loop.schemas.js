const Joi = require('joi');

const alertsQuerySchema = Joi.object({
    formId: Joi.number().integer().required(),
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'dismissed').allow('', null),
    alertLevel: Joi.string().valid('critical', 'high', 'medium', 'low').allow('', null),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

const createTicketFromAlertSchema = Joi.object({
    subject: Joi.string().min(1).max(255).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    assignee_id: Joi.number().integer().allow(null),
});

const updateAlertSchema = Joi.object({
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'dismissed').required(),
    notes: Joi.string().max(2000).allow('', null),
});

const scanFormSchema = Joi.object({
    formId: Joi.number().integer().required(),
});

const statsQuerySchema = Joi.object({
    formId: Joi.number().integer().required(),
});

module.exports = {
    alertsQuerySchema,
    createTicketFromAlertSchema,
    updateAlertSchema,
    scanFormSchema,
    statsQuerySchema,
};
