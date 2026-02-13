const fs = require('fs');
const path = require('path');
const logger = require('../logger');

class FileRepository {
    constructor(entityName) {
        this.entityName = entityName;
        // Adjust path to point to a 'data' folder at root of server
        this.paramsPath = path.join(__dirname, '../../../data');
        this.filePath = path.join(this.paramsPath, `${entityName}.json`);
        this.items = new Map();
        this.currentId = 1;

        if (!fs.existsSync(this.paramsPath)) {
            fs.mkdirSync(this.paramsPath, { recursive: true });
        }
        this._load(); // Load sync on init
    }

    _load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const parsed = JSON.parse(data);
                this.items = new Map(parsed.map(i => [i.id, i]));
                this.currentId = parsed.length > 0 ? Math.max(...parsed.map(i => i.id)) + 1 : 1;
            }
        } catch (err) {
            logger.error(`Error loading ${this.entityName}`, { error: err.message });
        }
    }

    async _save() {
        try {
            const data = Array.from(this.items.values());
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            logger.error(`Error saving ${this.entityName}`, { error: err.message });
        }
    }

    async findAll() {
        return Array.from(this.items.values());
    }

    async findById(id) {
        return this.items.get(Number(id));
    }

    async create(item) {
        const id = this.currentId++;
        const newItem = { ...item, id };
        this.items.set(id, newItem);
        await this._save();
        return newItem;
    }

    async update(id, item) {
        if (!this.items.has(Number(id))) return null;
        const updatedItem = { ...this.items.get(Number(id)), ...item, id: Number(id) };
        this.items.set(Number(id), updatedItem);
        await this._save();
        return updatedItem;
    }

    async delete(id) {
        const deleted = this.items.delete(Number(id));
        if (deleted) await this._save();
        return deleted;
    }
}

module.exports = FileRepository;
