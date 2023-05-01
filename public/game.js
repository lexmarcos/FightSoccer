// game.js

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

let socket;
let localPlayer;
let remotePlayer;
let ground;

const game = new Phaser.Game(config);

function addPlayer(self, playerInfo, x, y, playerNumber) {
  console.log("Player added", playerInfo);
  const newPlayer = self.physics.add.sprite(x, y, "playerSpritesheet" + playerNumber);
  console.log(newPlayer);
  newPlayer.id = playerInfo[0];
  newPlayer.anims.play("playerWalk" + playerNumber, true);
  self.physics.add.collider(newPlayer, ground);
  return newPlayer;
}

function preload() {
  // Carregar imagens e sprites
  this.load.spritesheet("playerSpritesheet1", "assets/Player Punch/Player Punch 1 64x64.png", {
    frameWidth: 64, // Largura de cada quadro (frame) na spritesheet
    frameHeight: 48, // Altura de cada quadro (frame) na spritesheet
  });
  this.load.spritesheet("playerSpritesheet2", "assets/Player Punch/Player Punch 2 64x64.png", {
    frameWidth: 64, // Largura de cada quadro (frame) na spritesheet
    frameHeight: 48, // Altura de cada quadro (frame) na spritesheet
  });
}

function create() {
  socket = io();
  // Criar e posicionar elementos do jogo

  // Criar um retângulo como chão e habilitar a física do Arcade
  ground = this.add.rectangle(400, 600, 800, 20, 0x00ff00);
  this.physics.add.existing(ground, true); // O segundo argumento 'true' torna o chão estático

  this.anims.create({
    key: "playerWalk1", // Nome da animação
    frames: this.anims.generateFrameNumbers("playerSpritesheet1", {
      start: 0, // Índice do primeiro quadro (frame) da animação
      end: 7, // Índice do último quadro (frame) da animação
    }),
    frameRate: 8, // Quantidade de quadros (frames) por segundo
    repeat: -1, // Quantidade de vezes que a animação deve se repetir (-1 para repetir indefinidamente)
  });

  this.anims.create({
    key: "playerWalk2", // Nome da animação
    frames: this.anims.generateFrameNumbers("playerSpritesheet2", {
      start: 0, // Índice do primeiro quadro (frame) da animação
      end: 7, // Índice do último quadro (frame) da animação
    }),
    frameRate: 8, // Quantidade de quadros (frames) por segundo
    repeat: -1, // Quantidade de vezes que a animação deve se repetir (-1 para repetir indefinidamente)
  });

  socket.on("currentPlayers", (players) => {
    console.log("currentPlayers", players);
    const playerEntries = Object.entries(players);
    localPlayer = addPlayer(this, playerEntries[0], 50, 566, 1);
    if (playerEntries[1]) {
      remotePlayer = addPlayer(this, playerEntries[1], 750, 566, 2);
    }
  });

  socket.on("newPlayer", (playerInfo) => {
    console.log("newPlayer", playerInfo);
    const playerEntries = Object.entries(playerInfo);
    remotePlayer = addPlayer(this, playerEntries[0], 750, 566, 2);
  });

  socket.on("playerDisconnected", (playerId) => {
    console.log("playerDisconnected", playerId, remotePlayer.id);
    if (remotePlayer && remotePlayer.id === playerId) {
      remotePlayer.destroy();
      remotePlayer = null;
    }
  });

  socket.on("playerUpdate", (playerInfo) => {
    console.log(playerInfo.scaleX, playerInfo.scaleY);
    if ((remotePlayer && remotePlayer.x !== playerInfo.x) || remotePlayer.y !== playerInfo.y) {
      remotePlayer.x = playerInfo.x;
      remotePlayer.y = playerInfo.y;
      remotePlayer.scaleX = playerInfo.scaleX;
      remotePlayer.scaleY = playerInfo.scaleY;
    }
  });

  // Adicionar teclas WASD
  this.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  this.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  this.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  this.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
}

function update() {
  if (localPlayer) {
    const speed = 200; // Velocidade de movimentação do jogador

    if (this.A.isDown) {
      // Mover o jogador para a esquerda
      localPlayer.setVelocityX(-speed);
      // Inverter o sprite horizontalmente
      localPlayer.setScale(-1, 1);
    } else if (this.D.isDown) {
      // Mover o jogador para a direita
      localPlayer.setVelocityX(speed);
      // Restaurar a escala original do sprite
      localPlayer.setScale(1, 1);
    } else {
      // Parar o movimento horizontal do jogador
      localPlayer.setVelocityX(0);
    }

    if (this.W.isDown && localPlayer.body.touching.down) {
      // Fazer o jogador pular (apenas se estiver tocando o chão)
      localPlayer.setVelocityY(-330);
    }

    // Atualizar a lógica do jogo
    // Enviar dados do jogador para o servidor
    socket.emit("playerUpdate", {
      x: localPlayer.x,
      y: localPlayer.y,
      score: localPlayer.score,
      scaleY: localPlayer.scaleY,
      scaleX: localPlayer.scaleX,
    });
  }
}
