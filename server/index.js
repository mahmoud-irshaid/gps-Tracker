require('dotenv/config')
const express = require('express')
const app = express()
app.get('/', (req, res) => {
  res.send('home');
})

const server = app.listen(process.env.PORT || 3001);
const io = require("socket.io")(server, {
  cors: {
    origin: `${process.env.CLIENT}`,
  },
});

let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  //when connect
  console.log("a user connected.");

  //take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  //send and get message
  socket.on("sendMessage", ({ user, rec, lat, lon }) => {
    const userd = getUser(rec);
    if (userd) {
      io.to(userd.socketId).emit("getMessage", {
        lat, lon
      });
    }
  });


  //send and get message
  socket.on("sendReq", ({ user, rec }) => {
    const userd = getUser(rec);
    if (userd) {
      io.to(userd.socketId).emit("getReq", {
        user
      });
    }
  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });

});

