const { promisify } = require('util')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('./../utils/appError')
const Email = require('./../utils/email')
const crypto = require('crypto')

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE_TIME
    })
}

const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id)

    res.cookie('jwt', token, {
        expires: new Date(Date.now() + process.env.JWT_EXPIRE_COOKIE_TIME * 24 * 60 * 60 * 1000),
        /* We are sending an http cookie, which we can't manipulate in our browser or change it,
           so the only way to get rid of it in order to logout our users is to send a new empty http cookie */
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    })

    /* Remove the password from the output */
    user.password = undefined

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    /*const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedDate: req.body.passwordChangedDate,
        role: req.body.role
    })*/
    const newUser = await User.create(req.body)
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome()

    createSendToken(newUser, 201, req, res)
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    /* Check if email & password exist */
    if (!email || !password) {
        return next(new AppError('Please provide a valid email and password', 400))
    }

    /* Check if user exist && password is correct*/
    const user = await User.findOne({ email }).select('+password')

    if (!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorrect email or password', 401))
    }

    /* If everything is ok, send token to the client */
    createSendToken(user, 200, req, res)
})

exports.logout = async (req,res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000), 
        httpOnly: true
    })

    res.status(200).json({ status: 'success'})
}

exports.protect = catchAsync(async (req, res, next) => {
    /* Get token and check if it's there */
    let token
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt
    }

    if (!token) {
        return (next(new AppError('Please login to access the requested page', 401)))
    }

    /* Verify token */
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    /* Check if user still exists */
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) return (next(new AppError('The user does not exist anymore', 401)))

    /* Check if user changed password after the token was issued */
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return (next(new AppError('Please login again', 401)))
    }

    /* Grant access to protected route */
    req.user = currentUser
    res.locals.user = currentUser
    next()
})

/* Only for rendered pages, no errors */
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
    
            /* Verify token */
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)

            /* Check if user still exists */
            const currentUser = await User.findById(decoded.id)
            if (!currentUser) return next()

            /* Check if user changed password after the token was issued */
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next()
            }

            /* There is a logged in USER */
            res.locals.user = currentUser
            return next()
        } catch (err) {
            return next()
        }
    }
    next()
}

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        /* roles: [admin, lead-guide] */
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    /* 1. Get user based on sent email */
    const user = await User.findOne({ email: req.body.email })

    if (!user) return (new AppError('There is no user with that email', 404))

    /* 2. Generate the random reset token */
    const resetToken = user.createPasswordResetToken()
    /* disable all the validators in the user's schema */
    await user.save({ validateBeforeSave: false })

    /* 3. Send it to the user's email */
    
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
        await new Email(user, resetURL).sendPasswordReset()

        res.status(200).json({
            status: 'success',
            message: 'token sent to email'
        })
    }

    catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save({ validateBeforeSave: false })

        return next(new AppError('There was an error sending password reset token, please try again later.', 500))
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    /* Get user basod on the token */
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })

    /* If token didn't expire and user still exists then reset the password */
    if (!user) return (next(new AppError('Token is invalid or expired', 400)))

    /* Set the new password sent from the user */
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm

    /* Reset the passwords reset token and it's expiration date */
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()

    /* Update PasswordChangeDate property */

    /* Log the user in, send the JWT */
    /* If everything is ok, send token to the client */
    createSendToken(user, 200, req, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    /* Get user from collection */
    const user = await User.findById(req.user.id).select('+password')

    /* check if current password is correct */
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return (next(new AppError('Current password is wrong', 401)))
    }

    /* If so, update password */
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save()

    /* Log user in, send JWT */
    createSendToken(user, 200, req, res)
})
