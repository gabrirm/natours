const express = require('express');

const reviewController = require('../controllers/reviewController');

const authController = require('../controllers/authController');
// in order to get access to the route params of tours, we need to specify the following
// option. This allows nested routes
const router = express.Router({ mergeParams: true });

//protecting the following routes
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .get(reviewController.getReview);

module.exports = router;
