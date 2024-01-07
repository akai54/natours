const fs = require('fs')
const mongoose = require('mongoose')
const Tour = require('./../../models/tourModel')
const User = require('./../../models/userModel')
const Review = require('./../../models/reviewModel')


/* ENV variables */
const dotenv = require('dotenv')
dotenv.config({ path: './config.env' })

/* Connect to the database */
const url = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
mongoose.connect(url, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => console.log('DB connection successful'))

/* Read the json file */
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'))
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'))
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'))

/* Import data into the database */
const importData = async () => {
    try {
        await Tour.create(tours)
        await User.create(users, {validateBeforeSave: false})
        await Review.create(reviews)
        console.log('Data successfully loaded')
    } catch (err) {
        console.log(err)
    }
    process.exit()
}

/* Delete all the data from the database */
const deleteData = async () => {
    try {
        await Tour.deleteMany()
        await User.deleteMany()
        await Review.deleteMany()
        console.log('All the data have been deleted')
    }
    catch (err) {
        console.log(err)
    }
    process.exit()
}

if (process.argv[2] === '--import') {
    importData()
}
if (process.argv[2] === '--delete') {
    deleteData()
}
