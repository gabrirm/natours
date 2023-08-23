const mongoose = require('mongoose');

const Tour = require('../models/tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review cant not be empty']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'a review must have a rating']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'a review must belong to a tour']
      }
    ],
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'a review must belong to an user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//indexes
//this makes it so an user cant post 2 reviews on the same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//middleware to populate users and tours
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

//static method
reviewSchema.statics.calcAverageRating = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  if (stats.length > 0) {
    //now we need to find the tour and update it
    await Tour.findByIdAndUpdate(tourId, {
      //the aggregate method saves the values on an array so we need to access it
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    //default
    await Tour.findByIdAndUpdate(tourId, {
      //the aggregate method saves the values on an array so we need to access it
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

//save
reviewSchema.post('save', function() {
  //this.constructor points to the Review model
  //same as doing Review.calcAverageRating
  //this points to the current review
  this.constructor.calcAverageRating(this.tour);
});

//update and delete
/*we need a way to get access to the review when using update and delete
so we need to build a pre find middleware(findOneAndUpdate), create 
a variable on the this keyword, which we will get access to on a post middleware,
which will point to the model, allowing us to call the calcavg function*/
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.revw = await this.findOne(); // this stores the current review
  next();
});
reviewSchema.post(/^findOneAnd/, async function() {
  await this.revw.constructor.calcAverageRating(this.revw.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
