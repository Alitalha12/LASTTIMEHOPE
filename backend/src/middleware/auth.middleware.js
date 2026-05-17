const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    logger.warn("Unauthorized access attempt (No token provided)");
    return res.status(401).json({
      success: false,
      error: { message: "Not authorized to access this route. Please login." },
      statusCode: 401,
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_for_dev_only");

    // We can also fetch the user from Firestore here if we want strict DB validation,
    // but verifying the JWT signature is sufficient for standard stateless auth.
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.warn("Unauthorized access attempt (Invalid token)");
    return res.status(401).json({
      success: false,
      error: { message: "Not authorized to access this route. Token is invalid or expired." },
      statusCode: 401,
    });
  }
};

module.exports = { protect };
