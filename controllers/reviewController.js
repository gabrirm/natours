/* eslint-disable node/no-unsupported-features/es-syntax */
const Review = require('../models/reviewModel');

// const catchAsync = require('../utils/catchAsync');

const factory = require('../controllers/handlerFactory');

// allow nested routes, this function will work as a middleware
exports.setTourUserIds = (req, res, next) => {
  // allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
