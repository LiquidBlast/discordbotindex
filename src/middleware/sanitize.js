const xss = require('xss')
const clean = function(clean, arraywhitelist) {
let source = clean
let html = xss(source, {
    whiteList: arraywhitelist, // empty, means filter out all tags
    stripIgnoreTag: true, // filter out all HTML not in the whilelist
    stripIgnoreTagBody: ["script", "style"] // the script and style tag is a special case, we need
    // to filter out its content
});
    return html;
}
module.exports = clean;