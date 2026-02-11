const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required()
    .messages({ 'string.min': 'Password must be at least 6 characters' }),
  role: Joi.string().valid('user', 'admin', 'viewer', 'editor').default('user'),
  role_id: Joi.number().integer().allow(null),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  name: Joi.string().max(100).allow(null, ''),
  name_ar: Joi.string().max(100).allow(null, ''),
});

module.exports = { createUserSchema };
