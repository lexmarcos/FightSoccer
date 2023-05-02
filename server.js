const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(__dirname + "/public"));

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

let players = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  players[socket.id] = {
    x: 0,
    y: 0,
    score: 0,
    scaleX: 1,
    scaleY: 1,
  };

  // Enviar dados dos jogadores para o novo cliente
  socket.emit("currentPlayers", players);

  // Informar aos outros clientes que um novo jogador se conectou
  socket.broadcast.emit("newPlayer", { [socket.id]: players[socket.id] });

  // No lado do servidor (Node.js)
  socket.on("ballUpdate", (ballData) => {
    socket.broadcast.emit("ballUpdate", { ...ballData, id: socket.id });
  });

  // Atualizar os dados dos jogadores quando um cliente enviar novas informações
  socket.on("playerUpdate", (playerData) => {
    players[socket.id].x = playerData.x;
    players[socket.id].y = playerData.y;
    players[socket.id].score = playerData.score;
    players[socket.id].scaleX = playerData.scaleX;
    players[socket.id].scaleY = playerData.scaleY;
    players[socket.id].action = playerData.action;
    // Enviar a atualização para todos os outros clientes
    socket.broadcast.emit("playerUpdate", players[socket.id]);
  });

  // Lidar com a desconexão de um jogador
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remover o jogador desconectado do objeto players
    delete players[socket.id];

    // Informar aos outros clientes que um jogador se desconectou
    socket.broadcast.emit("playerDisconnected", socket.id);
  });
});
