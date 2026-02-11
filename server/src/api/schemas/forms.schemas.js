const Joi = require('joi');

const createFormSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  definition: Joi.object().allow(null),
  allow_audio: Joi.boolean(),
  allow_camera: Joi.boolean(),
  allow_location: Joi.boolean(),
  ai_enabled: Joi.boolean(),
  folder_id: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null),
  status: Joi.string().valid('draft', 'published', 'archived'),
  password: Joi.string().allow('', null),
  settings: Joi.object().allow(null),
  type: Joi.string().allow('', null),
  language: Joi.string().max(10).allow('', null),
});

const updateFormSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  definition: Joi.object().allow(null),
  allow_audio: Joi.boolean(),
  allow_camera: Joi.boolean(),
  allow_location: Joi.boolean(),
  ai_enabled: Joi.boolean(),
  folder_id: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null),
  status: Joi.string().valid('draft', 'published', 'archived'),
  password: Joi.string().allow('', null),
  settings: Joi.object().allow(null),
  type: Joi.string().allow('', null),
  language: Joi.string().max(10).allow('', null),
}).min(1);

module.exports = { createFormSchema, updateFormSchema };
