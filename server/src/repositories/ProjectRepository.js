// repositories/ProjectRepository.js — interface contract
// All methods return plain objects with camelCase keys (DB shape normalized
// by the implementation). Throws ProjectNotFoundError for missing ids.

export class ProjectNotFoundError extends Error {
  constructor(id) {
    super(`Project not found: ${id}`);
    this.name = 'ProjectNotFoundError';
    this.status = 404;
  }
}

/**
 * @typedef {Object} ProjectRecord
 * @property {number} id
 * @property {string} title
 * @property {string} context
 * @property {'active'|'completed'|'abandoned'|'archived'} status
 * @property {'low'|'medium'|'high'|'urgent'} priority
 * @property {'low'|'medium'|'high'|'urgent'} urgency
 * @property {Date|null} dueDate
 * @property {'manual'|'whatsapp'} source
 * @property {Date|null} completedAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {number} [rootTaskCount]
 * @property {number} [openTaskCount]
 */

export class ProjectRepository {
  // eslint-disable-next-line no-unused-vars
  async create(project) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getById(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async list(filters) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async update(id, patch) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async delete(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async archive(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async restore(id) { throw new Error('not implemented'); }
}
