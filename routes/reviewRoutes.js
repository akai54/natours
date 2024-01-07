const express = require('express')

const reviewController = require('./../controllers/reviewController')
const authController = require('./../controllers/authController')
const router = express.Router({ mergeParams: true})

/* By using the authController.protect middleware, we make sure that only authenticated users can use the following methods. */
router.use(authController.protect)

router.route('/').get(reviewController.getAllReviews).post(authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.createReview)
router.route('/:id').get(reviewController.getReview).patch(authController.restrictTo('user', 'admin'), reviewController.updateReview).delete(authController.restrictTo('user', 'admin'), reviewController.deleteReview)
module.exports = router
