class AuditLog {
    constructor({ id, entityType, entityId, action, userId, details, timestamp = new Date() }) {
        this.id = id;
        this.entityType = entityType; // e.g., 'Submission', 'Form'
        this.entityId = entityId;
        this.action = action; // 'CREATE', 'UPDATE', 'DELETE'
        this.userId = userId || 'anonymous';
        this.details = details; // JSON of changes
        this.timestamp = timestamp;
    }
}

module.exports = AuditLog;
