require('dotenv/config')
const { sign, verify } = require('jsonwebtoken')

// refreshTokens
let refreshTokens = []
let newAcc, newRef


const createAccToken = (user) => {
    const accessToken = sign(
        { username: user.username },  //id: user._id
        process.env.JWT_KEY1,
        { expiresIn: '5m' }
    )
    return accessToken
}

const createRefToken = (user) => {
    const refreshToken = sign(
        { username: user.username }, // id: user._id
        process.env.JWT_KEY2,
        { expiresIn: '7d' }
    )
    refreshTokens.push(refreshToken)
    return refreshToken
}


const logout = (token) => {
    refreshTokens = refreshTokens.filter((c) => c != token)
    //remove the old refreshToken from the refreshTokens list
}



const validateTokens = (req, res, next) => {
    const AccToken = req.headers["x-access-token"]
    const RefToken = req.headers["x-refresh-token"]
    const user = req.headers["user"]


    if (!refreshTokens.includes(RefToken) || !RefToken) return res.send('not Authenticated')
    // add if not res.redirect
    else {
        verify(RefToken, process.env.JWT_KEY2, (err, decoded) => {
            if (err)
                res.send('not Authenticated')
            else if (AccToken) {

                verify(AccToken, process.env.JWT_KEY1, (err, decoded) => {
                    if (err) {
                        newAcc = createAccToken(user)
                        newRef = createRefToken(user)
                    }
                })
                req.userId = decoded.id
                req.newAcc = newAcc
                req.newRef = newRef

                next()
            }
        })
    }

}




module.exports = { createAccToken, createRefToken, validateTokens, logout }