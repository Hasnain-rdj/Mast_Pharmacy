const jwt = require('jsonwebtoken');
const GlobalSetting = require('../models/GlobalSetting');

let cachedMinWorkerTimestamp = null;
let lastCacheFetch = 0;

const getMinWorkerTimestamp = async () => {
  const now = Date.now();
  if (cachedMinWorkerTimestamp === null || now - lastCacheFetch > 5000) {
    try {
      const setting = await GlobalSetting.findOne({ key: 'minWorkerTokenIssuedAt' });
      cachedMinWorkerTimestamp = setting && setting.value ? Number(setting.value) : 0;
      lastCacheFetch = now;
    } catch (err) {
      console.error('Error fetching minWorkerTokenIssuedAt:', err);
    }
  }
  return cachedMinWorkerTimestamp || 0;
};

const setMinWorkerTimestamp = (ts) => {
  cachedMinWorkerTimestamp = ts;
  lastCacheFetch = Date.now();
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (decoded.role === 'worker') {
      const minTimestamp = await getMinWorkerTimestamp();
      const tokenIssuedAtMs = (decoded.iat || 0) * 1000;
      if (minTimestamp > 0 && tokenIssuedAtMs < minTimestamp) {
        return res.status(401).json({ message: 'Worker session invalidated by Admin. Please log in again.' });
      }
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      clinic: decoded.clinic
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  setMinWorkerTimestamp
};
