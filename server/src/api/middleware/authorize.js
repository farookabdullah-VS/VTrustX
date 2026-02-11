/**
 * Role-based authorization middleware.
 * Usage: router.get('/admin', authenticate, requireRole('global_admin', 'admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Insufficient privileges' });
};

module.exports = { requireRole };
