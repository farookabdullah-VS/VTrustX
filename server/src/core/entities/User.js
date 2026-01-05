class User {
    constructor({ id, username, password, role = 'user', createdAt = new Date() }) {
        this.id = id;
        this.username = username;
        this.password = password; // In a real app, this MUST be hashed. For MVP/FileRepo, we might store plain or simple hash.
        this.role = role;
        this.createdAt = createdAt;
    }
}

module.exports = User;
