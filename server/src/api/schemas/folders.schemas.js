const Joi = require('joi');

const createFolderSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('private', 'shared').default('private'),
});

const updateFolderSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
});

module.exports = { createFolderSchema, updateFolderSchema };
