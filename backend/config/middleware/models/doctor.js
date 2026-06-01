const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const doctorSchema = new mongoose.Schema(
  {
    doctorId:       { type: String, unique: true },    // MV-DOC-000001
    firstName:      { type: String, required: true, trim: true },
    lastName:       { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:       { type: String, required: true, minlength: 4 },
    specialization: { type: String, default: '' },

    // which hospital this doctor belongs to
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },

    role: { type: String, default: 'doctor' },
  },
  { timestamps: true }
);

doctorSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Doctor').countDocuments();
    this.doctorId = `MV-DOC-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

doctorSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

doctorSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Doctor', doctorSchema);
