const jwt     = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor  = require('../models/Doctor');

/**
 * Verifies the Bearer token and attaches `req.user` + `req.userModel`
 * Works for both patients and doctors.
 */
async function protect(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token — please log in.' });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }

  try {
    let user = null;
    if (decoded.role === 'doctor') {
      user = await Doctor.findById(decoded.id).lean();
      if (user) user.role = 'doctor';
    } else {
      user = await Patient.findById(decoded.id);
      if (user) user.role = 'patient';
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restrict access to doctors only.
 */
function doctorOnly(req, res, next) {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Doctors only.' });
  }
  next();
}

/**
 * Restrict access to patients only.
 */
function patientOnly(req, res, next) {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Patients only.' });
  }
  next();
}

module.exports = { protect, doctorOnly, patientOnly };
