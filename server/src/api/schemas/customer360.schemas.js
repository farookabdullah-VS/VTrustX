const Joi = require('joi');

const createProfileSchema = Joi.object({
  source: Joi.string().max(100).required(),
  external_id: Joi.string().max(255).allow('', null),
  email: Joi.string().email().allow('', null),
  mobile: Joi.string().max(50).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  full_name: Joi.string().max(255).allow('', null),
  date_of_birth: Joi.date().iso().allow(null),
  nationality: Joi.string().max(100).allow('', null),
  primary_language: Joi.string().max(50).allow('', null),
  gender: Joi.string().max(20).allow('', null),
  metadata: Joi.object().allow(null),
});

module.exports = { createProfileSchema };
