const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const hospitalSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:       { type: String, required: true, minlength: 4 },
    phone:          { type: String, trim: true, default: '' },
    registrationNo: { type: String, trim: true, default: '' },
    address:        { type: String, trim: true, default: '' },
    hospitalId:     { type: String, unique: true },   // e.g. MV-HOSP-000001
  },
  { timestamps: true }
);

// Auto-generate a friendly hospitalId before save
hospitalSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Hospital').countDocuments();
    this.hospitalId = `MV-HOSP-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

hospitalSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never expose the password hash
hospitalSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Hospital', hospitalSchema);
