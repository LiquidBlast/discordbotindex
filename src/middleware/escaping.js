const connection = require('../middleware/mariadb.js')
let clean =  function(input) {
   let results = connection.escape(input)
   return results;
}
module.exports = clean;