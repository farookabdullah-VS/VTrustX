const Joi = require('joi');

const createDiscountSchema = Joi.object({
  code: Joi.string().min(1).max(50).required(),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().min(0).required(),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
  applies_to_plan_id: Joi.number().integer().allow(null),
  max_redemptions: Joi.number().integer().min(0).allow(null),
  partner_id: Joi.string().max(255).allow('', null),
  recurrence_rule: Joi.string().max(255).allow('', null),
  is_active: Joi.boolean().default(true),
});

const updateDiscountSchema = Joi.object({
  code: Joi.string().min(1).max(50),
  type: Joi.string().valid('percentage', 'fixed'),
  value: Joi.number().min(0),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
  applies_to_plan_id: Joi.number().integer().allow(null),
  max_redemptions: Joi.number().integer().min(0).allow(null),
  partner_id: Joi.string().max(255).allow('', null),
  recurrence_rule: Joi.string().max(255).allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createDiscountSchema, updateDiscountSchema };
