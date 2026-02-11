const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: false,
      allowUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          requestId: req.id,
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        },
      });
    }

    // Replace with validated values
    if (source === 'query') {
      req.query = { ...req.query, ...value };
    } else {
      req.body = { ...req.body, ...value };
    }

    next();
  };
};

module.exports = validate;
