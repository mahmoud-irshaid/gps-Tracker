const mongoose = require('mongoose')
const con = require('../db')


const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    pass: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
    },
    profileImg: {
        type: String,
    },
    friends: {
        type: Array,
    },
    friendsReq: {
        type: Array,
    },
    friendsReqSent: {
        type: Array,
    }

})

const UserModel = con.users.model('user', UserSchema)
module.exports = UserModel