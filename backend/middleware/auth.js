/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Authentication & Security Middleware (backend/middleware/auth.js)
 * 
 * Responsibilities:
 * - Cryptographically secure password hashing (PBKDF2 with SHA-512 & random salt)
 * - Self-contained JSON Web Token (JWT) signing & verification via native crypto
 * - Express route protection middleware
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'medshelf_dev_secret_key_change_in_production_2026';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Base64URL Encoding & Decoding Helpers
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generate a Signed JSON Web Token
 * @param {Object} payload - User data to embed in token
 * @returns {string} Signed JWT token string
 */
function generateToken(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and Decode a JSON Web Token
 * @param {string} token - Signed JWT string
 * @returns {Object|null} Decoded payload or null if invalid/expired
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Constant-time buffer comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Securely Hash a Password using PBKDF2 with SHA-512 and Random Salt
 * @param {string} password - Raw user password
 * @returns {string} Salted hash string: "salt:hash"
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a Password against its Salted Hash
 * @param {string} password - Raw user password candidate
 * @param {string} storedHash - Stored "salt:hash" string
 * @returns {boolean} True if matching, false otherwise
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;

  const [salt, originalHash] = storedHash.split(':');
  const candidateHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

  const origBuffer = Buffer.from(originalHash, 'hex');
  const candBuffer = Buffer.from(candidateHash, 'hex');

  if (origBuffer.length !== candBuffer.length) return false;
  return crypto.timingSafeEqual(origBuffer, candBuffer);
}

/**
 * Express Middleware to Protect Authenticated Routes
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in to continue.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }

  // Attach decoded user data to request object
  req.user = decoded;
  next();
}

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword
};
