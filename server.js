const mongoose = require('mongoose')

/* ENV variables */
const dotenv = require('dotenv')
dotenv.config({ path: './config.env' })
const app = require('./app')

/* Handle uncaught exceptions */
process.on('uncaughtException', err => {
    console.log(err.name, err.message)
    console.log('Uncaught Exception')
    process.exit(1)
})

/* Connect to the database */
const url = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
mongoose.connect(url, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => console.log('DB connection successful'))

/* Start the server */
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
    console.log(`App is running on port ${port}`)
    console.log(process.env.NODE_ENV)
})

/* Handle unhandled rejections */
process.on('unhandledRejection', err => {
    console.log(err.name, err.message)
    console.log('Unhandled rejection')
    server.close(() => {
        process.exit(1)
    })
})

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED. Shutting down')
    server.close(() => {
        console.log('Process terminated.')
    })
})