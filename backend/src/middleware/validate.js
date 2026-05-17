/**
 * Joi Validation Middleware
 * Generic wrapper — pass any Joi schema and it validates req.body
 * Returns 400 with detailed error messages on validation failure
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,       // Return ALL errors, not just the first
      stripUnknown: true,      // Remove unknown fields
      allowUnknown: false,     // Don't allow unknown fields
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);

      return res.status(400).json({
        success: false,
        error: {
          message: "Validation failed",
          details: errorMessages,
        },
        statusCode: 400,
      });
    }

    // Replace req.body with validated & sanitized value
    req.body = value;
    next();
  };
};

module.exports = validate;
