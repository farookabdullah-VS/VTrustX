const Joi = require('joi');

const createPersonaSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  title: Joi.string().max(255).allow('', null),
  photo_url: Joi.string().uri().max(500).allow('', null),
  layout_config: Joi.object().allow(null),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
  persona_type: Joi.string().max(100).allow('', null),
  domain: Joi.string().max(255).allow('', null),
  mapping_rules: Joi.object().allow(null),
  description: Joi.string().max(2000).allow('', null),
  demographics: Joi.object().allow(null),
  behaviors: Joi.object().allow(null),
  goals: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null),
  pain_points: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null),
});

module.exports = { createPersonaSchema };
