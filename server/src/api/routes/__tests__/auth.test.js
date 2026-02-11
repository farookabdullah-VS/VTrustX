const { registerSchema, loginSchema, changePasswordSchema } = require('../../schemas/auth.schemas');

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
        password: 'Password123',
      });
      expect(error).toBeUndefined();
    });

    it('should reject username shorter than 3 chars', () => {
      const { error } = registerSchema.validate({
        username: 'ab',
        password: 'Password123',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('username');
    });

    it('should reject password shorter than 10 chars', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
        password: 'Pass1',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('password');
    });

    it('should reject password without uppercase', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
        password: 'password123',
      });
      expect(error).toBeDefined();
    });

    it('should reject password without lowercase', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
        password: 'PASSWORD123',
      });
      expect(error).toBeDefined();
    });

    it('should reject password without number', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
        password: 'PasswordOnly',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing username', () => {
      const { error } = registerSchema.validate({
        password: 'Password123',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = registerSchema.validate({
        username: 'testuser',
      });
      expect(error).toBeDefined();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const { error } = loginSchema.validate({
        username: 'testuser',
        password: 'anypassword',
      });
      expect(error).toBeUndefined();
    });

    it('should reject missing username', () => {
      const { error } = loginSchema.validate({ password: 'pass' });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({ username: 'user' });
      expect(error).toBeDefined();
    });

    it('should reject empty body', () => {
      const { error } = loginSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid change password data', () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword1',
      });
      expect(error).toBeUndefined();
    });

    it('should reject weak new password', () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: 'OldPassword1',
        newPassword: 'weak',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing current password', () => {
      const { error } = changePasswordSchema.validate({
        newPassword: 'NewPassword1',
      });
      expect(error).toBeDefined();
    });
  });
});
