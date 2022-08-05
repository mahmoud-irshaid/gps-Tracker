const mongoose = require('mongoose');

mongoose.connect(process.env.USERS_DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((res) => console.log('connected'))
    .catch((err) => console.log(err))


mongoose.conversations = mongoose.createConnection(process.env.CONVS_DB_CONNECTION,
    { useNewUrlParser: true, useUnifiedTopology: true })

mongoose.messages = mongoose.createConnection(process.env.MESSAGES_DB_CONNECTION,
    { useNewUrlParser: true, useUnifiedTopology: true })

mongoose.users = mongoose.createConnection(process.env.USERS_DB_CONNECTION,
    { useNewUrlParser: true, useUnifiedTopology: true })


module.exports = mongoose