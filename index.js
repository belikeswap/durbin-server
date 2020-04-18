const PORT = 8000;

const express = require("express");
const http = require("https");
const fs = require("fs");
const app = express();
const server = http.createServer(
  {
    key: fs.readFileSync(
      "/etc/letsencrypt/live/quipdf.quicloud.co.in/privkey.pem",
    ),
    cert: fs.readFileSync(
      "/etc/letsencrypt/live/quipdf.quicloud.co.in/cert.pem",
    ),
    passphrase: "pass",
  },
  app,
);
const socket = require("socket.io");
const io = socket(server);

const users = {};
const socketToRoom = {};

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });
});

server.listen(PORT, () => console.log("Durbin Server Online"));
