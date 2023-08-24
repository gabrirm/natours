const express = require('express');
const authController = require('../controllers/authController');
const viewController = require('../controllers/viewsController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewController.alerts)

//views routes
router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLogin);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);
router.get('/signup', viewController.getSignup);

// route used to update user data via form PATCH, instead of client side
// router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewController.updateUserData
// );
module.exports = router;
