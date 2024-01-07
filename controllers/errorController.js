const AppError = require('./../utils/appError')

const handleJWTError = () => new AppError('Invalid Token. Please log in using a valid token.', 401)
const handleJWTExpiredError = () => new AppError('Your token has expired, please login again', 401)

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
    const value = err.keyValue.name
    const message = `Duplicate fields value: ${value}. Please use a different field name`
    return new AppError(message, 400)
}

const handleValidatorErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message)
    const msg = `Invalid input data: ${errors.join(', ')}`
    return new AppError(msg, 400)
}

const sendErrorDev = (req, err, res) => {
    /* API */
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
        })
    }
    /* Rendered website */
    console.error('ERROR', err)
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message
    })
}

const sendErrorProd = (err, req, res) => {
    console.log(err)
    /* API */
    if (req.originalUrl.startsWith('/api')) {
        /* Only send operational errors to the client, never the programming errors */
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
        } 
        console.error('ERROR', err)

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        })
    }

    /* Rendered website */
    if (err.isOperational) {
        return  res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message
        })
    }
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: 'try again later'
    })
}

module.exports = (err, req, res, next) => {
    /* Setting default status values if they weren't passed */
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'

    /* The output error message dependes on the node environment */
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(req, err, res)
    } else if (process.env.NODE_ENV === 'production') {
        /* Making a hard copy of the err so we can add things to it */
        /* Without changing anything to the original error */
        /* Using the spread oeprator */
        // let error = { ...err }
        /* To make sure all properties are copied we can use Object.assign() instead of the spread operator */
        // let error = Object.assign({}, err)
        /* But we need the name property which is defined in the prototype chain */
        /* That's why we need the Object.create() method */
        let error = Object.create(Object.getPrototypeOf(err))
        Object.assign(error, err)
        error.message = err.message

        if (error.name === 'CastError') error = handleCastErrorDB(error)
        if (error.name === 'ValidationError') error = handleValidatorErrorDB(error)
        if (error.name === 'JsonWebTokenError') error = handleJWTError(error)
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
        if (error.code === 11000) error = handleDuplicateFieldsDB()

        sendErrorProd(error, req, res)
    }
}