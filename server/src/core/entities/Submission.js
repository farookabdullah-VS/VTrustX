class Submission {
    constructor({ id, formId, formVersion, data, metadata, createdAt = new Date(), updatedAt = new Date() }) {
        this.id = id;
        this.formId = formId;
        this.formVersion = formVersion;
        this.data = data; // SurveyJS Result Data
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

module.exports = Submission;
