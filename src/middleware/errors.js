var display = function(req, res, code, info) {
    return res.render('404.ejs', {code: code, info: info})
}
module.exports = display;