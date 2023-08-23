/* eslint-disable node/no-unsupported-features/es-syntax */
const multer = require('multer');

const sharp = require('sharp');

const User = require('../models/userModel');

// const APIFeatures = require('../utils/apiFeatures');

const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const factory = require('../controllers/handlerFactory');

// multer configuration
// to configure where the file is uploaded and its name
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // cb => callback function
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-id-timestamp
//     const extension = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//   }
// });

const multerStorage = multer.memoryStorage();

// to filter the file type (only images)
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

//middleware to resize user photos
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  // we set the filename property, updateMe makes use of it
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  // as we saved the file on the buffer (multer.memoryStorage()),
  // we can access it on the request

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

//function to filter req body when updating
const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  //we loop for the fields on our obj, and if the current field is
  //the same as one of the allowed ones, we add it into our newObject
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObject[el] = obj[el];
  });
  return newObject;
};

// this will work as a middleware to get the id of the current user
// when calling for factory.getOne
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error if user posts password data
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('This route is not for password updates', 400));

  // 2) Filter out our unwanted field names
  //create variable to avoid user from changing protected fields like role
  const filteredBody = filterObj(req.body, 'name', 'email');
  // we check if user uploaded a photo
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) update user
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined. Please use /signup instead'
  });
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);
