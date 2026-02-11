const Joi = require('joi');

const createIntegrationSchema = Joi.object({
    provider: Joi.string().min(1).max(100).required(),
    api_key: Joi.string().max(1000).allow('', null),
    webhook_url: Joi.string().uri().max(2000).allow('', null),
    is_active: Joi.boolean().default(false),
    config: Joi.object().default({}),
});

const updateIntegrationSchema = Joi.object({
    api_key: Joi.string().max(1000).allow('', null),
    webhook_url: Joi.string().uri().max(2000).allow('', null),
    is_active: Joi.boolean(),
    config: Joi.object(),
}).min(1);

module.exports = { createIntegrationSchema, updateIntegrationSchema };
