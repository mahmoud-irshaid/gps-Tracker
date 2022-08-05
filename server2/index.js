require('dotenv/config')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
const { createAccToken, createRefToken, validateTokens, logout } = require('./jwt')

const UserModel = require('./models/user')
const ConversationModel = require('./models/conversation')
const MessageModel = require('./models/message')

const multer = require('multer')
const cloudinary = require("./cloud");


const app = express()

// Bodyparser middleware
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);
app.use(bodyParser.json());
app.use(cors())
app.use(express.json())



// multer storage for users

const storage = multer.diskStorage({})
const limits = { fileSize: 1024 * 1024 * 5 }
const upload = multer({ storage: storage, limits: limits })







// sign up

app.post('/newUser', (req, res) => {
    let user = req.body.signUser
    const username = user.username
    const pass = user.pass


    UserModel.findOne({ username })                    //check if username used 
        .then((result) => {
            if (result)
                res.status(403).send('Username is used before')
            else {
                bcrypt.hash(pass, 10).then((hash) => {
                    const newuser = new UserModel({ ...user, pass: hash })
                    newuser.save((err, rez) => {

                        const accessToken = createAccToken(user)
                        const refreshToken = createRefToken(user)

                        rez = Object.assign(rez, { pass: undefined })

                        res.send({ user: rez, accessToken, refreshToken })
                    })

                })
            }
        }).catch(err => console.log(err))
})




// log in 

app.post('/getUser', async (req, res) => {
    let user = req.body.logUser
    const username = user.username
    const pass = user.pass

    UserModel.findOne({ username })                    //check if username is found
        .then((user) => {
            if (!user)
                return res.status(403).send("Username not found");
            else {
                bcrypt.compare(pass, user.pass).then(match => {
                    if (!match)
                        res.status(403).send('Wrong Password')
                    else {
                        const accessToken = createAccToken(user)
                        const refreshToken = createRefToken(user)


                        user = Object.assign(user, { pass: undefined })

                        res.send({ user, accessToken, refreshToken })
                    }
                })
            }
        })
        .catch(err => res.send('something went wrong'))
})







// refresh auth info

app.post('/checkAuth', validateTokens, async (req, res) => {
    const user = req.body.user
    await UserModel.findOne({ username: user.username })
        .then((result) => {
            result = Object.assign(result, { pass: undefined })
            res.send({
                userFresh: result,
                accessToken: req.newAcc,
                refreshToken: req.newRef,
            })
        })
        .catch(err => res.send(err))
})







// search user

app.post('/findUser', (req, res) => {
    const username = req.body.user
    UserModel.aggregate([
        {
            "$search": {
                "autocomplete": {
                    "query": `${username}`,
                    "path": "username",
                    "fuzzy": {
                        "maxEdits": 2
                    }
                }
            }
        }
    ], { username: 1, _id: 1, profileImg: 1, phone: 1 }).limit(10)
        .then(result => res.send(result))
        .catch(err => res.send(err))
})






// send friend request


app.put('/addFriend', validateTokens, async (req, res) => {
    const friend = req.body.friend
    const userId = req.body.userId

    try {
        res.send({
            accessToken: req.newAcc,
            refreshToken: req.newRef,
        })
        await UserModel.findById(userId._id, (error, userToUpdate) => {
            userToUpdate.friendsReqSent.push(friend);
            userToUpdate.save();

            UserModel.findById(friend._id, (error, userToUpdate) => {
                userToUpdate.friendsReq.push(userId);
                userToUpdate.save();
            })
        })

    } catch { err => console.log(err) }
})





// cancel friend request sent

app.post('/cancelReqSent', validateTokens, async (req, res) => {
    const friend = req.body.friend
    const userId = req.body.userId

    try {
        res.send({
            accessToken: req.newAcc,
            refreshToken: req.newRef,
        })
        await UserModel.findById(userId._id, (error, userToUpdate) => {
            const arr = userToUpdate.friendsReqSent.filter(target => (target._id !== friend._id))
            userToUpdate.friendsReqSent = arr
            userToUpdate.save()


            UserModel.findById(friend._id, (error, userToUpdate) => {
                const arr = userToUpdate.friendsReq.filter(target => (target._id !== userId._id))
                userToUpdate.friendsReq = arr
                userToUpdate.save()
            })
        })
    } catch { err => console.log(err) }
})






// accept friend request

app.post('/acceptReq', validateTokens, async (req, res) => {
    const friend = req.body.friend
    const userId = req.body.userId


    try {
        res.send({
            accessToken: req.newAcc,
            refreshToken: req.newRef,
        })
        await UserModel.findById(userId._id, (error, userToUpdate) => {
            const arr = userToUpdate.friendsReq.filter(target => (target._id !== friend._id))
            userToUpdate.friendsReq = arr
            userToUpdate.friends.push(friend)
            userToUpdate.save()

            UserModel.findById(friend._id, (error, userToUpdate) => {
                const arr = userToUpdate.friendsReqSent.filter(target => (target._id !== userId._id))
                userToUpdate.friendsReqSent = arr
                userToUpdate.friends.push(userId)
                userToUpdate.save()
            })
        })
    } catch { err => console.log(err) }
})




// cancel friend request

app.post('/cancelReq', validateTokens, async (req, res) => {
    const friend = req.body.friend
    const userId = req.body.userId

    try {
        res.send({
            accessToken: req.newAcc,
            refreshToken: req.newRef,
        })
        await UserModel.findById(userId._id, (error, userToUpdate) => {
            const arr = userToUpdate.friendsReq.filter(target => (target._id !== friend._id))
            userToUpdate.friendsReq = arr
            userToUpdate.save()


            UserModel.findById(friend._id, (error, userToUpdate) => {
                const arr = userToUpdate.friendsReqSent.filter(target => (target._id !== userId._id))
                userToUpdate.friendsReqSent = arr
                userToUpdate.save()
            })
        })
    } catch { err => console.log(err) }
})





// delete friend

app.put('/deleteFriend', validateTokens, async (req, res) => {
    const friend = req.body.friend
    const userId = req.body.userId

    try {
        res.send({
            accessToken: req.newAcc,
            refreshToken: req.newRef,
        })
        await UserModel.findById(userId._id, (error, userToUpdate) => {
            const arr = userToUpdate.friends.filter(target => (target._id !== friend._id))
            userToUpdate.friends = arr
            userToUpdate.save()

            UserModel.findById(friend._id, (error, userToUpdate) => {
                const arr = userToUpdate.friends.filter(target => (target._id !== userId._id))
                userToUpdate.friends = arr
                userToUpdate.save()
            })
        })

    } catch { err => console.log(err) }
})








// update user's info      

app.put('/updateUser', validateTokens, upload.single('profileImg'), async (req, res) => {

    const profileImg = req.file ? req.file.path : req.body.profileImg

    const _id = req.body._id
    const username = req.body.username
    let pass = '';
    const phone = req.body.phone
    const email = req.body.email
    const prevUsername = req.body.prevUsername
    const friends = JSON.parse(req.body.friends)


    let imgresult


    if (req.body.pass) {
        pass = req.body.pass
        bcrypt.hash(pass, 10).then((hash) => {
            pass = hash
        })
    }

    const updateProfileImg = async (id, profileImg) => {
        return await cloudinary.uploader.upload(profileImg, {
            public_id: `${id}`
        })
    }

    await UserModel.findOne({ username })              //check if username used before
        .then(async (result) => {
            if (result && username != prevUsername)
                res.status(403).send('Username is used before')
            else {
                try {
                    if (req.file)
                        imgresult = await updateProfileImg(_id, profileImg)

                    UserModel.findById(_id, (error, userToUpdate) => {
                        userToUpdate.username = username
                        userToUpdate.phone = phone
                        userToUpdate.email = email
                        userToUpdate.profileImg = imgresult ? imgresult.secure_url : profileImg
                        if (pass) userToUpdate.pass = pass
                        userToUpdate.save()

                        // update friends database    /////


                        friends.map(fri => {

                            UserModel.findById(fri._id, (error, friendToUpdate) => {   //get just friends /////////////////////

                                let newList = friendToUpdate.friends
                                let target = newList.findIndex(target => (target._id === _id))

                                newList[target].username = username
                                newList[target].phone = phone
                                newList[target].profileImg = imgresult ? imgresult.secure_url : profileImg


                                friendToUpdate.friends = newList
                                friendToUpdate.markModified("friends");
                                friendToUpdate.save()

                            })

                        })
                    })

                } catch { err => res.status(400).send('something went wrong') }


                res.send({
                    profileImg: imgresult ?
                        imgresult.secure_url : profileImg,
                    accessToken: req.newAcc,
                    refreshToken: req.newRef,
                })

            }
        })
})








// log out

app.post('/logout', (req, res) => {
    const RefToken = req.headers["x-refresh-token"]
    logout(RefToken)
})

















//----------------------------------------------------------------------------
// chat funcs


//new conv

app.post('/newConv', async (req, res) => {
    const newConversation = new ConversationModel({
        members: [req.body.senderId, req.body.receiverId]
    })

    try {
        const savedConversation = await newConversation.save()
        res.send(savedConversation)
    } catch (err) { res.status(400).send('something went wrong') }
})




//get conv of a user

app.get("/getConv/:userId", async (req, res) => {
    try {
        const conversation = await ConversationModel.find({
            members: { $in: [req.params.userId] },
        });
        res.send(conversation);
    } catch (err) { res.status(400).send('something went wrong') }
});



// get conv includes two userId

app.get("/findConv/:firstUserId/:secondUserId", async (req, res) => {
    try {
        const conversation = await ConversationModel.findOne({
            members: { $all: [req.params.firstUserId, req.params.secondUserId] },
        });
        res.send(conversation)
    } catch (err) { res.status(400).send('chat not found') }
});




//add msg

app.post("/addMsg", async (req, res) => {
    const newMessage = new MessageModel(req.body.message);
    try {
        const savedMessage = await newMessage.save();
        res.send(savedMessage);
    } catch (err) { console.log(err) }
});

//get msg

app.get("/getMsg/:conversationId", async (req, res) => {
    try {
        const messages = await MessageModel.find({
            conversationId: req.params.conversationId,
        });
        res.send(messages);
    } catch (err) { console.log(err) }
});


const handleClick = async (user) => {
    try {
        const res = await axios.get(
            `/conversations/find/${currentId}/${user._id}`
        );
        setCurrentChat(res.data);
    } catch (err) {
        console.log(err);
    }
};


//get a user
app.get("/getUser/:id", async (req, res) => {
    const userId = req.query.userId;
    const username = req.query.username;
    try {
        const user = userId
            ? await User.findById(userId)
            : await User.findOne({ username: username });
        const { password, updatedAt, ...other } = user._doc;
        res.status(200).json(other);
    } catch (err) {
        res.status(500).json(err);
    }
});







app.post('/getConvId', async (req, res) => {
    const user1 = req.body.user1
    const user2 = req.body.user2
    try {
        const conversation = await ConversationModel.findOne({
            members: { $all: [user1, user2] },
        });
        res.send(conversation);
    } catch (err) { res.status(400).send('something went wrong') }
})




// err image more 5mb 
app.use(function (err, req, res, next) {
    if (err.code === 'LIMIT_FILE_SIZE') {
        res.send(res.status(403).send('File Too Big, Maximum size 5mb'))
        return
    }
})





app.get('/', (req, res) => {
    res.send('at Home')
})

app.listen(process.env.PORT || 3002)