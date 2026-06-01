const jwt      = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const Patient  = require('../models/Patient');
const Doctor   = require('../models/Doctor');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Helper: verify hospital credentials ─────────────────
async function verifyHospital(email, password) {
  const hospital = await Hospital.findOne({ email: email.toLowerCase() });
  if (!hospital) throw Object.assign(new Error('Hospital not found with that email.'), { status: 400 });
  const ok = await hospital.comparePassword(password);
  if (!ok) throw Object.assign(new Error('Incorrect hospital password.'), { status: 400 });
  return hospital;
}

// ════════════════════════════════════════════════════════
//  HOSPITAL
// ════════════════════════════════════════════════════════

/**
 * POST /api/auth/register-hospital
 * Body: { name, email, password, phone?, registrationNo?, address? }
 */
exports.registerHospital = async (req, res, next) => {
  try {
    const { name, email, password, phone, registrationNo, address } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Hospital name, email and password are required.' });

    const exists = await Hospital.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'A hospital with this email already exists.' });

    const hospital = await Hospital.create({ name, email, password, phone, registrationNo, address });

    return res.status(201).json({
      success: true,
      data: {
        hospitalId: hospital.hospitalId,
        name:       hospital.name,
        email:      hospital.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════════════════════
//  PATIENT
// ════════════════════════════════════════════════════════

/**
 * POST /api/auth/register-patient
 * Body: { hospitalEmail, hospitalPassword, firstName, lastName, email, password, phone?, bloodGroup? }
 */
exports.registerPatient = async (req, res, next) => {
  try {
    const { hospitalEmail, hospitalPassword, firstName, lastName, email, password, phone, bloodGroup } = req.body;

    if (!hospitalEmail || !hospitalPassword || !firstName || !lastName || !email || !password)
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });

    const hospital = await verifyHospital(hospitalEmail, hospitalPassword);

    const exists = await Patient.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'A patient with this email already exists.' });

    const patient = await Patient.create({
      firstName, lastName, email, password, phone, bloodGroup,
      hospitalId: hospital._id,
    });

    const token = sign({ id: patient._id, role: 'patient' });
    const user  = patient.toSafeJSON();

    return res.status(201).json({ success: true, data: { token, user } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * POST /api/auth/login-patient
 * Body: { email, password }
 */
exports.loginPatient = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const patient = await Patient.findOne({ email: email.toLowerCase() });
    if (!patient)
      return res.status(401).json({ success: false, message: 'No patient found with that email.' });

    const ok = await patient.comparePassword(password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    const token = sign({ id: patient._id, role: 'patient' });
    const user  = patient.toSafeJSON();

    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════════════════════
//  DOCTOR
// ════════════════════════════════════════════════════════

/**
 * POST /api/auth/register-doctor
 * Body: { hospitalEmail, hospitalPassword, firstName, lastName, email, password, specialization? }
 */
exports.registerDoctor = async (req, res, next) => {
  try {
    const { hospitalEmail, hospitalPassword, firstName, lastName, email, password, specialization } = req.body;

    if (!hospitalEmail || !hospitalPassword || !firstName || !lastName || !email || !password)
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });

    const hospital = await verifyHospital(hospitalEmail, hospitalPassword);

    const exists = await Doctor.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'A doctor with this email already exists.' });

    const doctor = await Doctor.create({
      firstName, lastName, email, password, specialization,
      hospitalId: hospital._id,
    });

    const token = sign({ id: doctor._id, role: 'doctor' });
    const user  = doctor.toSafeJSON();

    return res.status(201).json({ success: true, data: { token, user } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * POST /api/auth/login-doctor
 * Body: { email, password }
 */
exports.loginDoctor = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor)
      return res.status(401).json({ success: false, message: 'No doctor found with that email.' });

    const ok = await doctor.comparePassword(password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    const token = sign({ id: doctor._id, role: 'doctor' });
    const user  = doctor.toSafeJSON();

    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
};
