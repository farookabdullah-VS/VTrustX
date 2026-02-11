const Joi = require('joi');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required()
    .messages({ 'string.min': 'Username must be at least 3 characters' }),
  password: Joi.string().min(10).pattern(passwordPattern).required()
    .messages({
      'string.min': 'Password must be at least 10 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
    }),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(10).pattern(passwordPattern).required()
    .messages({
      'string.min': 'New password must be at least 10 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
    }),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
