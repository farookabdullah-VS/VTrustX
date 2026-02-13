const Joi = require('joi');

const createDistributionSchema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    surveyId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    type: Joi.string().valid('email', 'sms', 'whatsapp', 'qr').required(),
    subject: Joi.string().max(500).when('type', { is: 'email', then: Joi.required() }),
    body: Joi.string().max(10000).allow('', null),
    contacts: Joi.array().items(
        Joi.object({
            name: Joi.string().max(200).allow('', null),
            email: Joi.string().email().allow('', null),
            phone: Joi.string().max(20).allow('', null),
        })
    ).min(1).required(),
    experimentId: Joi.number().integer().positive().optional(),
    mediaAttachments: Joi.array().items(
        Joi.object({
            id: Joi.number().integer().positive().required()
        })
    ).optional()
});

module.exports = { createDistributionSchema };
