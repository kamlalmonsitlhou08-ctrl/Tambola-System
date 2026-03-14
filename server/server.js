const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("../client"));

const DATA_FILE = "../data/gameState.json";

let gameState = {
  status: "NOT_STARTED",
  maxTickets: 30,
  tickets: [],
  calledNumbers: [],
  prizes: [],
  currentNumber: null
};

// Load saved state if exists
if (fs.existsSync(DATA_FILE)) {
  const data = fs.readFileSync(DATA_FILE);
  gameState = JSON.parse(data);
}

function saveState() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(gameState, null, 2));
}

function generateNumbers() {
  const numbers = [];
  for (let i = 1; i <= 90; i++) {
    numbers.push(i);
  }
  return numbers.sort(() => Math.random() - 0.5);
}

let numberPool = generateNumbers();
let interval = null;

function startCalling() {
  interval = setInterval(() => {
    if (numberPool.length === 0) {
      clearInterval(interval);
      return;
    }

    const next = numberPool.pop();
    gameState.calledNumbers.push(next);
    gameState.currentNumber = next;

    // Auto mark tickets
    gameState.tickets.forEach(ticket => {
      if (ticket.numbers.includes(next)) {
        ticket.marked.push(next);
      }
    });

    saveState();
    io.emit("update", gameState);

  }, 3000);
}

io.on("connection", (socket) => {
  socket.emit("update", gameState);

  socket.on("startGame", () => {
    if (gameState.status === "NOT_STARTED") {
      gameState.status = "RUNNING";
      numberPool = generateNumbers();
      startCalling();
      saveState();
      io.emit("update", gameState);
    }
  });

  socket.on("endGame", () => {
    gameState.status = "ENDED";
    clearInterval(interval);
    saveState();
    io.emit("update", gameState);
  });
});

server.listen(3000, () => {
  console.log("Tambola server running on port 3000");
});


