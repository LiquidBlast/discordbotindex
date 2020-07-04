let rand = function() {
    return Math.random().toString(36).substr(2);
};

let tokengen = function() {
    return rand() + rand() + rand() + rand()+ rand()+ rand()+ rand();
};

module.exports = tokengen;