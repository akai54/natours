const mongoose = require('mongoose')

const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email address'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'guide', 'lead-guide', 'admin'],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        /* This only works on CREATE & SAVE */
        validate: {
            validator: function(pwd) {
                return (pwd === this.password)
            },
            message: 'The inserted passwords does not match'
        }
    },
    passwordChangeDate: {
        type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

/* middleware to encrypt the password */
userSchema.pre('save', async function(next) {
    /* Only run if the password has changed */
    if (!this.isModified('password')) return next()

    /* Hash the password with a cost of 12 */
    this.password = await bcrypt.hash(this.password, 12)

    /* Delete the confirmed password from the database after encryption */
    this.passwordConfirm = undefined
   next()
})

userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next()

    this.passwordChangeDate = Date.now() - 1000
    next()
})

userSchema.pre(/^find/, function(next) {
    this.find({ active: { $ne: false } })
    next()
})

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangeDate) {
        const changedTimeStamp = parseInt(this.passwordChangeDate.getTime() / 1000, 10)
        return JWTTimestamp < changedTimeStamp
    }

    /* False means not changed */
    return false
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    /* Expires after 10 minutes */
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}


const User = mongoose.model('User', userSchema)
module.exports = User
