const validate = require('../validate');
const Joi = require('joi');

describe('validate middleware', () => {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('should call next() for valid input', () => {
    const req = { body: { name: 'John', email: 'john@test.com' }, id: '123' };
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid input', () => {
    const req = { body: { name: 'Jo', email: 'not-email' }, id: '123' };
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'email' }),
          ]),
        }),
      })
    );
  });

  it('should return 400 for missing required fields', () => {
    const req = { body: {}, id: '123' };
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should allow unknown fields by default', () => {
    const req = { body: { name: 'John', email: 'john@test.com', extra: 'field' }, id: '123' };
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should validate query params when source is query', () => {
    const querySchema = Joi.object({ page: Joi.number().min(1) });
    const req = { query: { page: '0' }, id: '123' };
    const res = mockRes();
    const next = jest.fn();

    validate(querySchema, 'query')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
