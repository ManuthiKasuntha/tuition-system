export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message message safe to show to the user
   * @param {Record<string, string>} [errors] per-field validation errors
   */
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
