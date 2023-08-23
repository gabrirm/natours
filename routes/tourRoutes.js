const express = require('express');

const authController = require('../controllers/authController');

const tourController = require('./../controllers/tourController');

const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// nested routes
// whenever we use a route like the following, use the review router
router.use('/:tourId/reviews', reviewRouter);

//router for top 5 best tours
router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

//router for aggregation pipeline
router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

//geospatial queries
//finding tours withing radius
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
//calculating distances
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
