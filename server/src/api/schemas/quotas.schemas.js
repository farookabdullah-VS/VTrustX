const Joi = require('joi');

const createQuotaSchema = Joi.object({
  form_id: Joi.number().integer().required(),
  label: Joi.string().min(1).max(255).required(),
  limit_count: Joi.number().integer().min(0).required(),
  criteria: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),
  action: Joi.string().max(100).allow('', null),
  action_data: Joi.object().allow(null),
  reset_period: Joi.string().valid('never', 'daily', 'weekly', 'monthly').default('never'),
  is_active: Joi.boolean().default(true),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
});

const updateQuotaSchema = Joi.object({
  label: Joi.string().min(1).max(255),
  limit_count: Joi.number().integer().min(0).required(),
  criteria: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),
  action: Joi.string().max(100).allow('', null),
  action_data: Joi.object().allow(null),
  reset_period: Joi.string().valid('never', 'daily', 'weekly', 'monthly'),
  is_active: Joi.boolean(),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
});

module.exports = { createQuotaSchema, updateQuotaSchema };
