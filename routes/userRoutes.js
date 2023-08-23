const express = require('express');

const userController = require('./../controllers/userController');

const authController = require('./../controllers/authController');

const router = express.Router();

//we dont set the route() property because we only want to use this function
//when a post request is made
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

//password handling routes
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
);

// we create a middleware to protect all the following routes
router.use(authController.protect);

//getting current user data
router.get('/me', userController.getMe, userController.getUser);
//updating current user data
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
//deleting current user (setting active property to false)
router.delete('/deleteMe', userController.deleteMe);

// restricting all the following routes to admins
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
