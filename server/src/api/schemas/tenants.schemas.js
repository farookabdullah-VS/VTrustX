const Joi = require('joi');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;

const registerTenantSchema = Joi.object({
  companyName: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(10).pattern(passwordPattern).required()
    .messages({
      'string.min': 'Password must be at least 10 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
    }),
  phone: Joi.string().max(50).allow('', null),
  name: Joi.string().max(255).allow('', null),
  planId: Joi.number().integer().allow(null),
});

module.exports = { registerTenantSchema };
