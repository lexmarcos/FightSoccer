const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: true,
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
let ball;

const game = new Phaser.Game(config);

function getDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function sendBallData() {
  console.log("txhama");
  // Enviar informações da bola atualizadas para o servidor
  socket.emit("ballUpdate", {
    x: ball.x,
    y: ball.y,
    velocityX: ball.body.velocity.x,
    velocityY: ball.body.velocity.y,
  });
}

function applyForceToBall(ball, player) {
  const force = 500;
  const direction = player.flipX ? -1 : 1;
  ball.setVelocityX(direction * force);
  ball.setVelocityY(-force);
  sendBallData();
}
// Funções auxiliares
function addPlayer(self, playerInfo, x, y, playerNumber) {
  const newPlayer = self.physics.add.sprite(x, y, "playerSpritesheet" + playerNumber);
  newPlayer.id = playerInfo[0];
  newPlayer.targetX = x;
  newPlayer.targetY = y;
  newPlayer.body.setSize(22, 30);
  newPlayer.body.setOffset(13, 10);
  newPlayer.setImmovable(true);
  if (playerNumber === 1) {
    newPlayer.anims.play("idleAnimationBlue", true);
  } else {
    newPlayer.anims.play("idleAnimationRed", true);
  }
  self.physics.add.collider(newPlayer, ground);
  return newPlayer;
}

function isPlayerMoving(player) {
  return player.body.velocity.x !== 0 || player.body.velocity.y !== 0;
}

function jumpAnimation(player, type) {
  if (!player.body.touching.down) return;
  player.action = "jump";
  player.anims.play("jumpAnimation" + type, true);
}

function walkAnimation(player, type) {
  if (!player.body.touching.down) return;
  player.action = "walk";
  player.anims.play("walkAnimation" + type, true);
}

function idleAnimation(player, type, ignoreIfPunching = true) {
  if (isPlayerMoving(player) && !ignoreIfPunching) return;
  player.action = "idle";
  player.anims.play("idleAnimation" + type, true);
}

function isPlayerMovingY(player) {
  return player.body.velocity.y !== 0;
}

function runAnimation(player, type) {
  if (!player.body.touching.down) return;
  player.action = "run";
  player.anims.play("runAnimation" + type, true);
}

function handlePlayerInput(player, keys, input) {
  const isRunning = keys.Shift.isDown;
  const speed = isRunning && player.body.touching.down ? 150 : 50;

  if (player.action === "punch") {
    if (player.body.touching.down) {
      player.setVelocityX(0);
    }
    return;
  }

  if (!isPlayerMoving(player)) {
    idleAnimation(player, "Blue");
  }

  if (keys.A.isDown) {
    if (isRunning) {
      runAnimation(player, "Blue");
    } else {
      walkAnimation(player, "Blue");
    }
    player.setVelocityX(-speed);
    player.setFlipX(true);
  } else if (keys.D.isDown) {
    if (isRunning) {
      runAnimation(player, "Blue");
    } else {
      walkAnimation(player, "Blue");
    }
    player.setVelocityX(speed);
    player.setFlipX(false);
  } else {
    player.setVelocityX(0);
  }

  input.on("pointerdown", (pointer) => {
    if (pointer.leftButtonDown()) {
      punchAnimation(localPlayer, "Blue");
    }
  });

  if (keys.W.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
    jumpAnimation(player, "Blue");
  }
}
function createPlayerAnimations(scene, spritesheetKey, animKey, start, end, frameRate, repeat) {
  scene.anims.create({
    key: animKey,
    frames: scene.anims.generateFrameNumbers(spritesheetKey, {
      start: start,
      end: end,
    }),
    frameRate: frameRate,
    repeat: repeat,
  });
}

function loadSpritesheet(
  scene,
  spritesheetKey,
  spritesheetPath,
  frameWidth = 48,
  frameHeight = 48
) {
  scene.load.spritesheet(spritesheetKey, spritesheetPath, {
    frameWidth: frameWidth, // Largura de cada quadro (frame) na spritesheet
    frameHeight: frameHeight, // Altura de cada quadro (frame) na spritesheet
  });
}

// Funções do Phaser
function preload() {
  // Carregar imagens e sprites
  loadSpritesheet(this, "idleSpriteSheetBlue", "assets/Player Idle/Character Idle blue.png");
  loadSpritesheet(this, "idleSpriteSheetRed", "assets/Player Idle/Character Idle red.png");
  loadSpritesheet(this, "walkSpriteSheetBlue", "assets/PlayerWalk/PlayerWalk blue.png");
  loadSpritesheet(this, "walkSpriteSheetRed", "assets/PlayerWalk/PlayerWalk red.png");
  loadSpritesheet(this, "jumpSpriteSheetBlue", "assets/Player Jump/player jump blue.png");
  loadSpritesheet(this, "jumpSpriteSheetRed", "assets/Player Jump/player jump red.png");
  loadSpritesheet(this, "runSpriteSheetBlue", "assets/Player Run/run cycle blue.png");
  loadSpritesheet(this, "runSpriteSheetRed", "assets/Player Run/run cycle red.png");
  loadSpritesheet(
    this,
    "punchSpriteSheetBlue",
    "assets/Player Punch/Player Punch blue.png",
    64,
    48
  );
  loadSpritesheet(this, "punchSpriteSheetRed", "assets/Player Punch/Player Punch red.png", 64, 48);
  loadSpritesheet(this, "ball", "assets/Ball/Ball.png", 32, 32);
}

const animationByAction = {
  idle: idleAnimation,
  walk: walkAnimation,
  jump: jumpAnimation,
  run: runAnimation,
  punch: punchAnimation,
};

function punchAnimation(player, type) {
  if (player.action === "punch") return;

  player.action = "punch";
  player.anims.stop();
  if (player.flipX) {
    player.body.setOffset(10, 9);
  } else {
    player.body.setOffset(30, 9);
  }

  player.anims.play("punchAnimation" + type, true);
  player.once("animationcomplete", () => {
    player.body.setOffset(13, 9);
    idleAnimation(player, type, true);
  });

  // Verificar se a bola está próxima do personagem
  const distance = getDistance(player.x, player.y, ball.x, ball.y);
  const maxDistance = 40; // Ajuste este valor de acordo com o tamanho e a posição do soco

  if (distance <= maxDistance) {
    setTimeout(() => {
      applyForceToBall(ball, player);
    }, 400);
  }
}

function create() {
  socket = io();
  const playersGroup = this.physics.add.group({ collideWorldBounds: true });
  // Criar um retângulo como chão e habilitar a física do Arcade
  ground = this.add.rectangle(400, 600, 800, 1, 0x000000);
  this.physics.add.existing(ground, true); // O segundo argumento 'true' torna o chão estático

  createPlayerAnimations(this, "idleSpriteSheetBlue", "idleAnimationBlue", 0, 9, 10, -1);
  createPlayerAnimations(this, "idleSpriteSheetRed", "idleAnimationRed", 0, 9, 10, -1);
  createPlayerAnimations(this, "jumpSpriteSheetBlue", "jumpAnimationBlue", 0, 2, 3);
  createPlayerAnimations(this, "jumpSpriteSheetRed", "jumpAnimationRed", 0, 2, 3);
  createPlayerAnimations(this, "walkSpriteSheetBlue", "walkAnimationBlue", 0, 7, 8);
  createPlayerAnimations(this, "walkSpriteSheetRed", "walkAnimationRed", 0, 7, 8);
  createPlayerAnimations(this, "runSpriteSheetBlue", "runAnimationBlue", 0, 7, 8);
  createPlayerAnimations(this, "runSpriteSheetRed", "runAnimationRed", 0, 7, 8);
  createPlayerAnimations(this, "punchSpriteSheetBlue", "punchAnimationBlue", 0, 7, 8);
  createPlayerAnimations(this, "punchSpriteSheetRed", "punchAnimationRed", 0, 7, 8);

  // Configurar eventos de socket
  socket.on("currentPlayers", (players) => {
    console.log("currentPlayers", players);
    const playerEntries = Object.entries(players);
    localPlayer = addPlayer(this, playerEntries[0], 50, 566, 1);
    playersGroup.add(localPlayer);
    this.physics.add.collider(ball, localPlayer);
    // showHitbox(localPlayer, this);
    if (playerEntries[1]) {
      remotePlayer = addPlayer(this, playerEntries[1], 750, 566, 2);
      playersGroup.add(remotePlayer);
      this.physics.add.collider(ball, remotePlayer);
      // showHitbox(remotePlayer, this);
    }
  });

  socket.on("newPlayer", (playerInfo) => {
    console.log("newPlayer", playerInfo);
    const playerEntries = Object.entries(playerInfo);
    remotePlayer = addPlayer(this, playerEntries[0], 750, 566, 2);
    playersGroup.add(remotePlayer);
    this.physics.add.collider(ball, remotePlayer);
    // showHitbox(remotePlayer, this);
  });

  socket.on("playerDisconnected", (playerId) => {
    console.log("playerDisconnected", playerId, remotePlayer.id);
    if (remotePlayer && remotePlayer.id === playerId) {
      remotePlayer.destroy();
      remotePlayer = null;
    }
  });

  socket.on("playerUpdate", (playerInfo) => {
    if (playerInfo.action) {
      animationByAction[playerInfo.action](remotePlayer, "Red");
    }
    if (
      (remotePlayer && remotePlayer.x !== playerInfo.x) ||
      (remotePlayer.y !== playerInfo.y && remotePlayer.action !== playerInfo.action)
    ) {
      remotePlayer.x = playerInfo.x;
      remotePlayer.y = playerInfo.y;
      remotePlayer.scaleX = playerInfo.scaleX;
      remotePlayer.scaleY = playerInfo.scaleY;
      remotePlayer.action = playerInfo.action;
    }
  });

  // Dentro da função `create` do lado do cliente
  socket.on("ballUpdate", (ballData) => {
    if (ballData.id === socket.id) return;
    ball.setPosition(ballData.x, ballData.y);
    ball.setVelocity(ballData.velocityX, ballData.velocityY);
  });

  ball = this.physics.add.sprite(400, 566, "ball");
  ball.setBounce(0.6);
  ball.setCollideWorldBounds(true);
  playersGroup.children.iterate(function (player) {
    console.log(player);
    player.setCollideWorldBounds(true);
  });
  this.physics.add.collider(ball, ground);
  this.physics.add.collider(ball, playersGroup, sendBallData, null, this);

  // Adicionar teclas WASD
  this.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  this.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  this.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  this.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  this.Shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
}

function showHitbox(player, scene) {
  console.log(player.body.width, player.body.height);
  const hitbox = scene.add.rectangle(0, 0, player.body.width, player.body.height, 0xff0000, 0.5);
  hitbox.setStrokeStyle(2, 0xffffff);
  hitbox.setOrigin(0, 0);
  player.hitbox = hitbox;
}
let isColliding = false;
function update() {
  if (localPlayer) {
    handlePlayerInput(
      localPlayer,
      {
        W: this.W,
        A: this.A,
        S: this.S,
        D: this.D,
        Shift: this.Shift,
      },
      this.input
    );
    const playerChanged =
      localPlayer.oldX !== localPlayer.x ||
      localPlayer.oldY !== localPlayer.y ||
      localPlayer.oldScaleX !== localPlayer.scaleX ||
      localPlayer.oldScaleY !== localPlayer.scaleY ||
      localPlayer.oldAction !== localPlayer.action;
    if (playerChanged) {
      socket.emit("playerUpdate", {
        x: localPlayer.x,
        y: localPlayer.y,
        score: localPlayer.score,
        scaleX: localPlayer.scaleX,
        scaleY: localPlayer.scaleY,
        action: localPlayer.action,
      });

      localPlayer.oldX = localPlayer.x;
      localPlayer.oldY = localPlayer.y;
      localPlayer.oldScaleX = localPlayer.scaleX;
      localPlayer.oldScaleY = localPlayer.scaleY;
      localPlayer.oldAction = localPlayer.action;
    }
  }
}
