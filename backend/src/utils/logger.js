/**
 * Logger Utility
 * Structured console logging with timestamps and levels
 */
const dayjs = require("dayjs");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const timestamp = () => dayjs().format("YYYY-MM-DD HH:mm:ss");

const logger = {
  info: (message, data = null) => {
    console.log(`${COLORS.cyan}[INFO]${COLORS.reset} ${timestamp()} - ${message}`);
    if (data) console.log(data);
  },

  success: (message, data = null) => {
    console.log(`${COLORS.green}[SUCCESS]${COLORS.reset} ${timestamp()} - ${message}`);
    if (data) console.log(data);
  },

  warn: (message, data = null) => {
    console.warn(`${COLORS.yellow}[WARN]${COLORS.reset} ${timestamp()} - ${message}`);
    if (data) console.warn(data);
  },

  error: (message, error = null) => {
    console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${timestamp()} - ${message}`);
    if (error) console.error(error);
  },

  agent: (agentName, message, data = null) => {
    console.log(`${COLORS.magenta}[AGENT:${agentName}]${COLORS.reset} ${timestamp()} - ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  },

  debug: (message, data = null) => {
    console.log(`${COLORS.blue}[DEBUG]${COLORS.reset} ${timestamp()} - ${message}`);
    if (data) console.log(data);
  },
};

module.exports = logger;
