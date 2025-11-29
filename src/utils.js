/**
 * n8n-clone - Core Utility Functions (Bogus/Mock Implementation)
 *
 * This module contains various helper functions used throughout the application
 * for data manipulation, validation, security, and logging.
 */

const crypto = require('crypto');

// --- Time and Formatting Utilities ---

/**
 * Formats a Unix timestamp into a human-readable, consistent ISO-8601 string.
 * @param {number} timestamp - Unix timestamp in milliseconds.
 * @returns {string} The formatted date string (e.g., "2025-11-29T10:30:00.000Z").
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    // In a real application, we would handle timezones carefully
    return date.toISOString();
}

/**
 * Generates a universally unique identifier (UUID v4).
 * @returns {string} A new UUID string.
 */
function generateUUID() {
    // Basic implementation using the built-in Node.js crypto module
    return crypto.randomUUID();
}

// --- Data & JSON Utilities ---

/**
 * Deep clones an object or array. This is CRITICAL for workflow execution
 * to ensure that node execution does not mutate shared input data.
 * @param {object | array} object - The object or array to clone.
 * @returns {object | array} A completely separate, deep copy of the input.
 */
function deepClone(object) {
    if (object === null || typeof object !== 'object') {
        return object;
    }

    // A fast, robust method for simple data structures (avoids issues with classes/functions)
    try {
        return JSON.parse(JSON.stringify(object));
    } catch (e) {
        console.error("Failed to deep clone object via JSON serialization.", e);
        // Fallback to a simpler, less safe method in a real app
        return Object.assign({}, object);
    }
}

/**
 * Attempts to safely parse a JSON string, returning null if parsing fails.
 * @param {string} jsonString - The string to parse.
 * @returns {object | null} The parsed object, or null on failure.
 */
function safeParseJSON(jsonString) {
    if (typeof jsonString !== 'string') {
        return null;
    }
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        // Log the failure but prevent application crash
        console.warn(`[Utility] Failed to parse JSON string: ${jsonString.substring(0, 50)}...`);
        return null;
    }
}

// --- Security and Hashing ---

const HASH_SALT_ROUNDS = 10;

/**
 * Hashes a secret string (like an API key or password) using a secure algorithm.
 * @param {string} secret - The plain text secret.
 * @returns {string} The securely hashed secret.
 */
function hashSecret(secret) {
    // In a real n8n-clone, this would use a library like 'bcrypt' or 'scrypt'.
    // Mocking a simple SHA-256 hash for demonstration purposes.
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    console.debug('Hashed secret generated (Mocked).');
    return `sha256_mock:${hash}`;
}

/**
 * Checks if a plain text secret matches a stored hashed secret.
 * @param {string} plainSecret - The plain text secret provided by the user.
 * @param {string} hashedSecret - The stored hash.
 * @returns {boolean} True if they match, false otherwise.
 */
function compareSecrets(plainSecret, hashedSecret) {
    // Mock implementation of comparison
    const mockHash = hashSecret(plainSecret);
    return mockHash === hashedSecret;
}


// --- Error and Logging Utilities ---

/**
 * Creates a standardized error response object for API consumption.
 * @param {string} message - The main error message.
 * @param {number} statusCode - The HTTP status code (e.g., 400, 500).
 * @param {string} [errorCode='GENERIC_ERROR'] - A machine-readable error code.
 * @returns {object} Standardized error object.
 */
function createErrorResponse(message, statusCode, errorCode = 'GENERIC_ERROR') {
    return {
        success: false,
        status: statusCode,
        code: errorCode,
        message: message,
        timestamp: formatTimestamp(Date.now())
    };
}


// --- Exports ---
module.exports = {
    formatTimestamp,
    generateUUID,
    deepClone,
    safeParseJSON,
    hashSecret,
    compareSecrets,
    createErrorResponse
};
