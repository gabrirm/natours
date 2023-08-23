/* eslint-disable node/no-unsupported-features/node-builtins */
/* eslint-disable node/no-unsupported-features/es-syntax */
const jwt = require('jsonwebtoken');

const crypto = require('crypto');

const { promisify } = require('util');

const AppError = require('../utils/appError');

const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');

const Email = require('../utils/email');

//function to provide token to client
const signToken = id => {
  //{ id: id} = {id}
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

//cookie options

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //the cookie can not be accessed or modified by the browser
    httpOnly: true
  };
  // the secure options will only send the cookie if there is an https connection
  // and we dont want that on development
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  //remove password from output, not from database
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // 2) check if user and password is correct
  //we need to select the password because we prevented the password
  //from showing when using the find() method
  const user = await User.findOne({ email: email }).select('+password');

  // 3) if everything ok, send token
  //we implement this lane of code in the if statement because if the user
  //doesn't exist, this line can't be executed
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect credentials', 401));
  }
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  // this overwrites the current cookie, which is the same as deleting it
  res.cookie('jwt', 'null', {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

//middleware function to give access to authorized users
exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting the token and check it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) return next(new AppError('Please log in to get access', 401));

  // 2) verify token
  //the line below returns an object with the id of the user and token issued and expiring date
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError(
        'The user belonging to this token does not longer exist',
        401
      )
    );

  // 4) check if user changed password after the jwt was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password. Please log in again!',
        401
      )
    );
  }
  // grants access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//we use the rest operator to set an arbitrary number of roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //we can use req.user.role bc the prev middleware function protect
    //creates an object "user", which will have the role field
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) verify token
    //the line below returns an object with the id of the user and token issued and expiring date
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    // 3) check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next();

    // 4) check if user changed password after the jwt was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }
    // grants access to templates
    // every template has access to local variables, and here we create the user,
    // so we can access it on our templates
    res.locals.user = currentUser;
    return next();
  }
  next();
});

//we use the rest operator to set an arbitrary number of roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //we can use req.user.role bc the prev middleware function protect
    //creates an object "user", which will have the role field
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with that email address', 404));
  // 2) generate random reset token
  const resetToken = user.createPasswordResetToken();
  //now we have to save it and pass this option, otherwise it'll ask for our email and password
  //as they are mandatory when saving a document
  await user.save({ validateBeforeSave: false });
  // 3) send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}. If you didn't forget your password, please ignore this email`;
  try {
 
    await new Email(user, resetURL).sendPasswordReset()
    res.status(200).json({
      status: 'success',
      message: message
    });
    //we must use a try catch block because we want to reset these fields
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //find the user by hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  // 2) if token has not expired, and there is user, set the new password
  if (!user) return next(new AppError('Token is invalid or has expired', 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) update changedpasswordAt property for the user
  // we update it using a pre save middleware on userModel.js
  // 4) log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from collection
  const user = await User.findById(req.user.id).select('+password');
  console.log(user);
  // 2) check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('Incorrect password! Please try again!', 401));
  // 3) if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
