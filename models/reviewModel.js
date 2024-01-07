const mongoose = require('mongoose')
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'A review must have a text'],
        minlength: [4, 'A review must be at least 4 chars']
    },
    slug: String,
    rating: {
        type: Number,
        min: [1, 'The rating must be at least 1'],
        max: [5, 'The rating must be less or equal than 5'],
        required: [true, 'A review must have a rating']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    user: [{
        type:
            mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'A review must belong to a user']
    }],
    tour: [{
        type:
            mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'A review must belong to a tour']
    }],
},
    {
        toJSON: { virtuals: true },
        toObject: { virtual: true }
    }
)

reviewSchema.index({tour: 1, user:1}, {unique: true})

/* Populate basically means what fields to show,
like when we call the get method to get all the reviews 
we will only see the name of the tour and the name and the photo of the user 
who made the review. */
/*
reviewSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'tour',
        select: 'name'
    }).populate({
        path: 'user',
        select: 'name photo'
    })
    next()
})
*/

reviewSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next()
})

/* This function calculates the Average rating and the ratings quantity of each tour,
based on their reviews. when they are CREATED, this doesn't calculate the review once they got UPDATED or DELETED. */
reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
      {
        $match: { tour: tourId }
      },
      {
        $group: {
          _id: '$tour',
          nRating: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);
    console.log(stats);
  
    if (stats.length > 0) {
      await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: stats[0].nRating,
        ratingsAverage: stats[0].avgRating
      });
    } else {
      await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: 0,
        ratingsAverage: 4.5
      });
    }
  };

reviewSchema.post('save', function() {
    /* This points to current review */
    this.constructor.calcAverageRatings(this.tour)
})

reviewSchema.pre(/^findOneAnd/, async function(next) {
    this.rev = await this.findOne();
    console.log(this.rev);
    next();
  });
  
  reviewSchema.post(/^findOneAnd/, async function() {
    // await this.findOne(); does NOT work here, query has already been executed
    await this.rev.constructor.calcAverageRatings(this.rev.tour);
  });

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review
