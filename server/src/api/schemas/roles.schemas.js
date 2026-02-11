const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.object().required(),
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.object(),
}).min(1);

module.exports = { createRoleSchema, updateRoleSchema };
