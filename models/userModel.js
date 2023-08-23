/* eslint-disable node/no-unsupported-features/es-syntax */
const mongoose = require('mongoose');

const validator = require('validator');

const bcrypt = require('bcryptjs');

const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});
// MIDDLEWARE FOR PASSWORD ENCRYPTION
userSchema.pre('save', async function(next) {
  //only run this function is password is modified
  if (!this.isModified('password')) return next();
  // hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  //delete password confirmation field
  this.passwordConfirm = undefined;
  next();
});

//MIDDLEWARE FOR CHANGING THE passwordChangedAt after resetting the password
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  /* we have to substract 1 second because sometimes the field passwordchangedat
  // will update a bit later in time than the JWT, and when accesing protected routes,
  // we check if the user changed his password after the JTW was issued */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//MIDDLEWARE FUNCTION PRE FIND TO CHECK THE VALUE OF THE ACTIVE FIELD
userSchema.pre(/^find/, function(next) {
  //this keyword points to the current query
  this.find({ active: { $ne: false } });
  next();
});

//instance method for dehashing the password
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//instance method to check if user changed password after JWT token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    // passwordChangedAt is a date, and we have to convert it to seconds
    //in order to compare it with JWT iat
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // return true if changed time is higher than the issued token date
    return JWTTimestamp < changedTimeStamp;
  }
  // False means password wasn't changed
  return false;
};

//instance method to handle password reset

userSchema.methods.createPasswordResetToken = function() {
  //reset token doesn't have to be cryptographically strong so we can use
  //the built in module crypto instead of bcrypt
  const resetToken = crypto.randomBytes(32).toString('hex');
  //now we need to encrypt it because we are saving it into our DB
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);
  //user has 10 minutes before token expires
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
