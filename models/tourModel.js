const mongoose = require('mongoose')
const slugify = require('slugify')

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must be less or equal than 40 chrars'],
        minlength: [10, 'A tour name must be at least 10 chars']
        // validate: [validator.isAlpha, 'Tour name must only contain chars']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a groupe size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        difficulty: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficulty is either: easy, medium or difficult'
        },
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val) {
                /* Only works when creating new documents, won't work with updating existing documents */
                return val < this.price
            },
            /* val and VALUE are the same which is the priceDiscount */
            message: 'Discount price ({VALUE}) should be below regular price'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a summary']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        /* GeoJSON */
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [{
        type:
            mongoose.Schema.ObjectId,
        ref: 'User'
    }]
},
    {
        toJSON: { virtuals: true },
        toObject: { virtual: true }
    }
)

/* Add a Price index */
// tourSchema.index({price: 1})
tourSchema.index({price: 1, ratingsAverage: -1})

/* Add a GeoSpatial index */
tourSchema.index({startLocation: '2dsphere'})

/* This is a virtual property, this one calculates the duration for each tour in weeks */
/* It creates it and add it to the JSON, but it doesn't get added to the DB. */
tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7
})

/* Virtual populate ( Virtually connect reviews to the tours) */
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
})

/* A document middleware which will run before saving a document to the database */
/* runs before save() and create() */
/* Note: this points to the current document */
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true })
    next()
})

/* tourSchema.pre('save', async function(next) {
    const guidesPromises = this.guides.map(async id => await User.findById(id))
    this.guides = await Promise.all(guidesPromises)
    next()
}) */

/* Query middleware */
/* We're using a regex to match the hook on all the methods that start with find */
/* For example: find(), findOne() etc etc */
/* Note: this points to the current query */
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: { $ne: true } })
    this.start = Date.now()
    next()
})

/* Note: Should always send the docs arguemnt else it won't work */
tourSchema.post(/^find/, function(docs, next) {
    console.log(`Query took: ${Date.now() - this.start} ms`)
    next()
})

tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    })
    next()
})

/* Aggregation middleware */
/*tourSchema.pre('aggregate', function(next) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })
    next()
}) */

const Tour = mongoose.model('Tour', tourSchema)
module.exports = Tour
