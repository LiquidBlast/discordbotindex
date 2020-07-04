let encryptor = require('simple-encryptor')(process.env.ENCKEY);
const work = function handler(type, data) {
    //check for data
    if (!data) return null;
    //and now go ahead
    if (type == 'encrypt' || type == 1 || type == 'enc') {
        //this checks for encrypted data, because it will return null or empty if it is already in the correct format
        let finished = encryptor.encrypt(data)
        if (finished == null) return data
        else return finished
    } else if (type == 'decrypt' || type == 2 || type == 'dec') {
        //this checks for unencrypted data, because it will return null or empty if it is already in the correct format
        let finished = encryptor.decrypt(data)
        if (finished == null) return data
        else return finished
    } else {
        return "Failed to identify function"
    }
}
//export function
module.exports = work;