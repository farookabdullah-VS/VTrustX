const Joi = require('joi');

const createChannelSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().max(255).allow('', null),
  smtp_host: Joi.string().max(255).allow('', null),
  smtp_port: Joi.number().integer().allow(null),
  smtp_user: Joi.string().max(255).allow('', null),
  smtp_pass: Joi.string().max(500).allow('', null),
  imap_host: Joi.string().max(255).allow('', null),
  imap_port: Joi.number().integer().allow(null),
  imap_user: Joi.string().max(255).allow('', null),
  imap_pass: Joi.string().max(500).allow('', null),
});

const updateThemeSchema = Joi.object({
  primaryColor: Joi.string().max(50).allow('', null),
  secondaryColor: Joi.string().max(50).allow('', null),
  logoUrl: Joi.string().uri().max(500).allow('', null),
  fontFamily: Joi.string().max(100).allow('', null),
  borderRadius: Joi.string().max(50).allow('', null),
  customCss: Joi.string().max(10000).allow('', null),
}).min(1);

const slaSchema = Joi.array().items(Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
  response_time_minutes: Joi.number().integer().min(1).required(),
  resolution_time_minutes: Joi.number().integer().min(1).required(),
})).min(1);

module.exports = { createChannelSchema, updateThemeSchema, slaSchema };
