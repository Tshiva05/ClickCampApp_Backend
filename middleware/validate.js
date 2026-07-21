// middleware/validate.js
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after an array of express-validator checks; turns the accumulated
// validation errors into a single, consistent 400 ApiError.
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(400, details.map((d) => d.message).join(', '), details));
};
