const Joi = require('joi');

const createSubmissionSchema = Joi.object({
  formId: Joi.number().integer().required(),
  data: Joi.object().required(),
  formVersion: Joi.number().integer().allow(null),
  metadata: Joi.object().allow(null),
  userId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null),
});

module.exports = { createSubmissionSchema };
