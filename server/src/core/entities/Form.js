const crypto = require('crypto');

class Form {
    constructor({ id, formKey, title, definition, version = 1, isPublished = false, createdAt = new Date(), updatedAt = new Date() }) {
        this.id = id;
        this.formKey = formKey || crypto.randomUUID(); // Unique ID shared across all versions of this form
        this.title = title;
        this.definition = definition; // SurveyJS JSON
        this.version = version;
        this.isPublished = isPublished;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    publish() {
        this.isPublished = true;
        this.updatedAt = new Date();
    }

    createNewVersion() {
        return new Form({
            formKey: this.formKey,
            title: this.title,
            definition: this.definition,
            version: this.version + 1,
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

module.exports = Form;
