class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
        /* oeprational errors are */
        this.isOperational = true

        /* Save the stack trace to show where the error occurred */
        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError
