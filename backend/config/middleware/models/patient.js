const mongoose    = require('mongoose');
const bcrypt      = require('bcryptjs');
const documentSchema = require('./Document');

// ── Folder (embedded array inside Patient) ──────────────
const folderSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true, maxlength: 60 },
    color:     { type: String, default: '#3b9eff' },
    documents: [documentSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ── Patient ──────────────────────────────────────────────
const patientSchema = new mongoose.Schema(
  {
    // identity
    patientId:  { type: String, unique: true },        // MV-PAT-000001
    firstName:  { type: String, required: true, trim: true },
    lastName:   { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 4 },
    phone:      { type: String, default: '' },
    bloodGroup: { type: String, default: '' },

    // which hospital this patient belongs to
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },

    // all medical folders + docs live here
    folders:    [folderSchema],

    role: { type: String, default: 'patient' },
  },
  { timestamps: true }
);

patientSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Patient').countDocuments();
    this.patientId = `MV-PAT-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

patientSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

patientSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  // strip base64 blobs from listing responses to keep payload small
  if (obj.folders) {
    obj.folders = obj.folders.map(f => ({
      ...f,
      documents: (f.documents || []).map(d => {
        const { base64Data, ...rest } = d;
        return rest;
      }),
    }));
  }
  return obj;
};

module.exports = mongoose.model('Patient', patientSchema);
