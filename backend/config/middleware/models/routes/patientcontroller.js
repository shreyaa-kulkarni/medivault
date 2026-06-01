const Patient = require('../models/Patient');
const Doctor  = require('../models/Doctor');

// ════════════════════════════════════════════════════════
//  PATIENT — own profile
// ════════════════════════════════════════════════════════

/**
 * GET /api/patients/me
 * Returns the logged-in patient's profile (with folders, without base64 blobs).
 */
exports.getMe = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user._id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    return res.json({ success: true, data: patient.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════════════════════
//  FOLDERS
// ════════════════════════════════════════════════════════

/**
 * POST /api/patients/folders
 * Body: { name, color? }
 */
exports.createFolder = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Folder name is required.' });

    const patient = await Patient.findById(req.user._id);
    patient.folders.push({ name, color: color || '#3b9eff', documents: [] });
    await patient.save();

    const newFolder = patient.folders[patient.folders.length - 1];
    return res.status(201).json({ success: true, data: newFolder });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/patients/folders/:folderId
 * Body: { name?, color? }
 */
exports.updateFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { name, color } = req.body;

    const patient = await Patient.findById(req.user._id);
    const folder  = patient.folders.id(folderId);
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found.' });

    if (name)  folder.name  = name;
    if (color) folder.color = color;
    await patient.save();

    return res.json({ success: true, data: folder });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/patients/folders/:folderId
 */
exports.deleteFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;

    const patient = await Patient.findById(req.user._id);
    const folder  = patient.folders.id(folderId);
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found.' });

    folder.deleteOne();
    await patient.save();

    return res.json({ success: true, message: 'Folder deleted.' });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════════════════════
//  DOCUMENTS
// ════════════════════════════════════════════════════════

/**
 * Shared helper — resolves (patient, folder) for both patient-self and doctor flows.
 * Doctor flow: req.query.patientId  (the patientId string like "MV-PAT-000001")
 * Patient flow: req.user is the patient
 */
async function resolvePatientFolder(req) {
  let patient;
  if (req.user.role === 'doctor') {
    const { patientId } = req.query;
    if (!patientId) throw Object.assign(new Error('patientId query param required.'), { status: 400 });
    // find patient that belongs to the same hospital as the doctor
    const doctor = await Doctor.findById(req.user._id).lean();
    patient = await Patient.findOne({ patientId, hospitalId: doctor.hospitalId });
    if (!patient) throw Object.assign(new Error('Patient not found or not in your hospital.'), { status: 404 });
  } else {
    patient = await Patient.findById(req.user._id);
    if (!patient) throw Object.assign(new Error('Patient not found.'), { status: 404 });
  }

  const folder = patient.folders.id(req.params.folderId);
  if (!folder) throw Object.assign(new Error('Folder not found.'), { status: 404 });

  return { patient, folder };
}

/**
 * POST /api/patients/folders/:folderId/documents
 * Body: { name, mimeType, size, description?, base64Data }
 * Query (doctor): ?patientId=MV-PAT-000001
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const { patient, folder } = await resolvePatientFolder(req);
    const { name, mimeType, size, description, base64Data } = req.body;

    if (!name || !base64Data)
      return res.status(400).json({ success: false, message: 'name and base64Data are required.' });

    const uploader = req.user.role === 'doctor'
      ? `Dr. ${req.user.firstName} ${req.user.lastName}`
      : `${req.user.firstName} ${req.user.lastName}`;

    folder.documents.push({
      name,
      mimeType: mimeType || 'application/octet-stream',
      size:     size     || 0,
      description: description || '',
      base64Data,
      uploadedBy:  uploader,
      uploadedAt:  new Date(),
    });

    await patient.save();
    const newDoc = folder.documents[folder.documents.length - 1];

    // Return doc without base64 to keep the response lean
    const { base64Data: _b, ...docMeta } = newDoc.toObject();
    return res.status(201).json({ success: true, data: docMeta });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * GET /api/patients/folders/:folderId/documents/:docId
 * Returns full doc including base64Data for viewing.
 * Query (doctor): ?patientId=MV-PAT-000001
 */
exports.getDocument = async (req, res, next) => {
  try {
    const { patient, folder } = await resolvePatientFolder(req);
    const doc = folder.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    return res.json({ success: true, data: doc.toObject() });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * DELETE /api/patients/folders/:folderId/documents/:docId
 * Query (doctor): ?patientId=MV-PAT-000001
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { patient, folder } = await resolvePatientFolder(req);
    const doc = folder.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    doc.deleteOne();
    await patient.save();

    return res.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

// ════════════════════════════════════════════════════════
//  DOCTOR — hospital patient listing
// ════════════════════════════════════════════════════════

/**
 * GET /api/patients/hospital-patients
 * Returns all patients in the same hospital as the logged-in doctor (or patient).
 * Strips base64 blobs from the response.
 */
exports.getHospitalPatients = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.user._id).lean();
    const hospitalId = doctor ? doctor.hospitalId : req.user.hospitalId;

    const patients = await Patient.find({ hospitalId }).lean();
    const safe = patients.map(p => {
      delete p.password;
      p.folders = (p.folders || []).map(f => ({
        ...f,
        documents: (f.documents || []).map(({ base64Data, ...rest }) => rest),
      }));
      return p;
    });

    return res.json({ success: true, data: safe });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patients/:patientId
 * Returns a single patient (identified by patientId string "MV-PAT-xxxxxx").
 * Used by doctors to load a patient's full profile (without base64 blobs).
 */
exports.getPatientById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.user._id).lean();

    const patient = await Patient.findOne({ patientId: req.params.patientId }).lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // Ensure the patient belongs to the same hospital as the doctor
    if (doctor && String(patient.hospitalId) !== String(doctor.hospitalId)) {
      return res.status(403).json({ success: false, message: 'Not authorised to view this patient.' });
    }

    delete patient.password;
    patient.folders = (patient.folders || []).map(f => ({
      ...f,
      documents: (f.documents || []).map(({ base64Data, ...rest }) => rest),
    }));

    return res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
};
