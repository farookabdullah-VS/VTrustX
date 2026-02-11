const Joi = require('joi');

const createWorkflowSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  trigger_event: Joi.string().required(),
  conditions: Joi.array().items(Joi.object()).allow(null),
  actions: Joi.array().items(Joi.object()).min(1).required(),
  formId: Joi.number().integer().allow(null),
  description: Joi.string().max(1000).allow('', null),
  is_active: Joi.boolean().default(true),
});

const updateWorkflowSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  trigger_event: Joi.string(),
  conditions: Joi.array().items(Joi.object()).allow(null),
  actions: Joi.array().items(Joi.object()).min(1),
  formId: Joi.number().integer().allow(null),
  description: Joi.string().max(1000).allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createWorkflowSchema, updateWorkflowSchema };
