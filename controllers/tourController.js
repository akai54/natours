const AppError = require('../utils/appError')
const Tour = require('./../models/tourModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const multer = require('multer')
const sharp = require('sharp')

const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new AppError('Not an image! Please upload only images.', 404), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([
    {name: 'imageCover', maxCount: 1},
    {name: 'images', maxCount: 3}
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next()

    /* Cover Image */
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
    await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat('jpeg').jpeg({quality: 90}).toFile(`public/img/tours/${req.body.imageCover}`)

    /* Images */
    req.body.images = []

    await Promise.all(req.files.images.map(async (file, i) => {
        const fileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`
        await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({quality: 90}).toFile(`public/img/tours/${fileName}`)
        req.body.images.push(fileName)
    }));

    next()
})

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = 5
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
    next()
}

/* Send all the tours */
exports.getAllTours = factory.getAll(Tour)

/* Send just one tour */
exports.getTour = factory.getOne(Tour, {path: 'reviews'})

/* handle POST requests */
exports.createTour = factory.createOne(Tour)

/* Handle Patch requests */
exports.updateTour = factory.updateOne(Tour)

/* Handle Delete requests */
exports.deleteTour = factory.deleteOne(Tour)

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: '$difficulty',
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        {
            $sort: { avgPrice: 1 }
        }
        /* {
            $match: { _id: { $ne: 'easy' } }
        } */
    ])

    res.status(200).json({
        status: 'success',
        data: {
            status: 'success',
            message: stats
        }
    })
})

exports.getMonthlyplan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1
    const plan = await Tour.aggregate([{
        /* output a document for each element */
        $unwind: '$startDates'
    },
    {
        /* Show only the tours for the year requested by the user */
        $match: { startDates: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`), } }
    },
    {
        /* Show the number of tours per month, and the name of each tour */
        $group: {
            _id: { $month: '$startDates' },
            numTours: { $sum: 1 },
            tours: { $push: '$name' }
        }
    },
    {
        /* Create a new field called month, which has the same value as the field _id */
        $addFields: { month: '$_id' }
    },
    {
        /* If you give a field a val of 0, it won't show up, give 1 to make it show up */
        $project: {
            _id: 0,
        }
    },
    {
        /* Sort results per month in the ascending order */
        $sort: { month: 1 }
    },
    {
        $limit: 12
    }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            plan
        }
    })
})

exports.getToursWithin = catchAsync(async(req,res,next) => {
    const {distance, latlng, unit} = req.params
    const [lat, lng] = latlng.split(',')

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400))
    }

    const tours = await Tour.find({startLocation: {$geoWithin: {$centerSphere: [[lng,lat], radius]}}})

    console.log(distance, lat, lng, unit)

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getDistances = catchAsync(async(req,res,next) => {
    const {latlng, unit} = req.params
    const [lat, lng] = latlng.split(',')

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400))
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [ lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
})