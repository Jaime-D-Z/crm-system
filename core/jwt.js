const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET || 'crm-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'crm-refresh-secret-change-me';
const ACCESS_EXP = '8h';
const REFRESH_EXP = '7d';

function signToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

function verifyToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}

function signRefresh(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function verifyRefresh(token) {
    return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signToken, verifyToken, signRefresh, verifyRefresh };
