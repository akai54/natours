/* This is just to not repeate the try catch blocks in each function */
/* It's useful to make the async code cleaner */
module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next)
    }
}
