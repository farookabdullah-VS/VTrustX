const Joi = require('joi');

const createPlanSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('', null),
  price_monthly: Joi.number().min(0).allow('', null),
  price_yearly: Joi.number().min(0).allow('', null),
  features: Joi.array().items(Joi.string()).allow(null),
  max_users: Joi.number().integer().min(0).allow('', null),
  max_responses: Joi.number().integer().min(0).allow('', null),
  max_forms: Joi.number().integer().min(0).allow('', null),
  is_active: Joi.boolean().default(true),
});

const updatePlanSchema = Joi.object().unknown(true);

const createTenantSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  planId: Joi.number().integer().allow(null),
  subscription_status: Joi.string().valid('active', 'trial', 'suspended', 'cancelled'),
});

const updateTenantSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  subscription_status: Joi.string().valid('active', 'trial', 'suspended', 'cancelled'),
  features: Joi.object().allow(null),
}).min(1);

module.exports = { createPlanSchema, updatePlanSchema, createTenantSchema, updateTenantSchema };
