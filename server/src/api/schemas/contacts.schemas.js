const Joi = require('joi');

const createContactSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().allow('', null),
  mobile: Joi.string().max(50).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  address: Joi.string().max(500).allow('', null),
  designation: Joi.string().max(255).allow('', null),
  department: Joi.string().max(255).allow('', null),
  company: Joi.string().max(255).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
});

const updateContactSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  email: Joi.string().email().allow('', null),
  mobile: Joi.string().max(50).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  address: Joi.string().max(500).allow('', null),
  designation: Joi.string().max(255).allow('', null),
  department: Joi.string().max(255).allow('', null),
  company: Joi.string().max(255).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
}).min(1);

module.exports = { createContactSchema, updateContactSchema };
