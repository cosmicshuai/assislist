// repositories/TaskRepository.js — interface contract
// All methods return plain objects with camelCase keys (DB shape normalized
// by the implementation). Throws TaskNotFoundError for missing ids.

export class TaskNotFoundError extends Error {
  constructor(id) {
    super(`Task not found: ${id}`);
    this.name = 'TaskNotFoundError';
    this.status = 404;
  }
}

export class DependencyBlockedError extends Error {
  constructor(taskTitle) {
    super(`Blocked by ${taskTitle}`);
    this.name = 'DependencyBlockedError';
    this.status = 400;
    this.blocker = taskTitle;
  }
}

export class DependencyCycleError extends Error {
  constructor() {
    super('Dependency cycle detected');
    this.name = 'DependencyCycleError';
    this.status = 400;
  }
}

/**
 * @typedef {Object} TaskRecord
 * @property {number} id
 * @property {number} projectId
 * @property {string} title
 * @property {string} context
 * @property {'active'|'completed'} status
 * @property {'low'|'medium'|'high'|'urgent'} priority
 * @property {'low'|'medium'|'high'|'urgent'} urgency
 * @property {Date|null} dueDate
 * @property {number|null} parentId
 * @property {'manual'|'whatsapp'} source
 * @property {Date|null} completedAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

export class TaskRepository {
  // eslint-disable-next-line no-unused-vars
  async create(task) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getById(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async list(filters) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async update(id, patch) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async delete(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async complete(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getChildren(id) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async addDependency(taskId, dependsOnTaskId) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async removeDependency(taskId, dependsOnTaskId) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getBlockedBy(taskId) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async getBlocks(taskId) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async findSimilar(title, limit = 3) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async createTree(parent, children) { throw new Error('not implemented'); }
}
