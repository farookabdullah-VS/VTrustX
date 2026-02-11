const Joi = require('joi');

const createMapSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('draft', 'published', 'archived'),
  persona_id: Joi.string().uuid().allow(null),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
  data: Joi.object().allow(null),
  template_id: Joi.number().integer().allow(null),
});

const updateMapSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('draft', 'published', 'archived'),
  persona_id: Joi.string().uuid().allow(null),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
  data: Joi.object().allow(null),
  thumbnail_data: Joi.string().allow('', null),
}).min(1);

const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
  section_id: Joi.string().allow('', null),
  stage_id: Joi.string().allow('', null),
});

const shareMapSchema = Joi.object({
  user_id: Joi.number().integer(),
  permission: Joi.string().valid('view', 'edit').default('view'),
  email: Joi.string().email(),
}).or('user_id', 'email');

module.exports = { createMapSchema, updateMapSchema, createCommentSchema, shareMapSchema };
