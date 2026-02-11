const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  plan_id: Joi.number().integer().required(),
  discount_code: Joi.string().max(50).allow('', null),
  payment_method: Joi.string().max(50).allow('', null),
  billing_cycle: Joi.string().valid('monthly', 'yearly').default('monthly'),
});

module.exports = { createSubscriptionSchema };
