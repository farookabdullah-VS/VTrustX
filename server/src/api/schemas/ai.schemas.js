const Joi = require('joi');

const generateSchema = Joi.object({
    prompt: Joi.string().min(1).max(10000).required(),
});

const agentInteractSchema = Joi.object({
    prompt: Joi.string().min(1).max(10000).required(),
    systemContext: Joi.string().max(10000).allow('', null),
});

const analyzeSurveySchema = Joi.object({
    formId: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
    surveyTitle: Joi.string().max(500).required(),
    questions: Joi.array().items(Joi.object()).min(1).required(),
    submissions: Joi.array().items(Joi.object()).min(1).required(),
});

module.exports = { generateSchema, agentInteractSchema, analyzeSurveySchema };
