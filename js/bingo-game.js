// Bingo game logic
class BingoGame {
  constructor(roomId, playerId) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.roomManager = new RoomManager();
    this.roomManager.currentRoomId = roomId;
    this.roomManager.currentPlayerId = playerId;
    this.roomManager.roomRef = window.firebaseDatabase.ref(`rooms/${roomId}`);
    
    this.gameData = null;
    this.playerData = null;
    this.boardElement = document.getElementById('bingo-board');
    this.playersListElement = document.getElementById('players-list');
    this.gameLogElement = document.getElementById('game-log-content');
    this.turnStatusElement = document.getElementById('turn-status');
    this.currentPlayerElement = document.getElementById('current-player');
    this.currentRoomIdElement = document.getElementById('current-room-id');
    
    this.init();
  }

  async init() {
    try {
      // Set room ID in header
      this.currentRoomIdElement.textContent = this.roomId;
      
      // Listen for room updates
      this.roomManager.onRoomUpdate(this.handleRoomUpdate.bind(this));
      
      // Load initial data
      const snapshot = await this.roomManager.roomRef.once('value');
      const room = snapshot.val();
      
      if (!room) {
        window.location.href = 'not-found.html';
        return;
      }
      
      this.handleRoomUpdate(snapshot);
      
    } catch (error) {
      console.error('Error initializing game:', error);
      alert('Failed to load game. Redirecting to main menu.');
      window.location.href = 'index.html';
    }
  }

  handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
      alert('Game has been deleted.');
      window.location.href = 'index.html';
      return;
    }
    
    this.gameData = room;
    this.playerData = room.players[this.playerId];
    
    if (!this.playerData) {
      alert('You are no longer in this game.');
      window.location.href = 'index.html';
      return;
    }
    
    // Update UI
    this.updateBoard();
    this.updatePlayersList();
    this.updateGameStatus();
    this.updateBingoProgress();
    
    // Check for winner
    if (room.gameState.winner) {
      this.handleGameEnd();
    }
  }

  updateBoard() {
    if (!this.playerData) return;
    
    // Clear existing board
    this.boardElement.innerHTML = '';
    
    // Create board cells
    for (let i = 0; i < 25; i++) {
      const cell = document.createElement('div');
      cell.className = 'bingo-cell';
      cell.textContent = this.playerData.board[i];
      cell.dataset.index = i;
      cell.dataset.value = this.playerData.board[i];
      
      // Check if cell is marked
      if (this.playerData.markedCells && this.playerData.markedCells.includes(i)) {
        cell.classList.add('marked');
      }
      
      // Add click handler
      cell.addEventListener('click', () => this.handleCellClick(i, this.playerData.board[i]));
      
      this.boardElement.appendChild(cell);
    }
    
    // Update player name
    this.currentPlayerElement.textContent = this.playerData.name;
  }

  updatePlayersList() {
    if (!this.gameData.players) return;
    
    this.playersListElement.innerHTML = '';
    
    Object.values(this.gameData.players).forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-item';
      
      const isCurrentTurn = this.gameData.gameState.currentTurn === player.id;
      const isWinner = this.gameData.gameState.winner === player.id;
      
      playerDiv.innerHTML = `
        <div class="player-info">
          <span class="player-name ${isCurrentTurn ? 'current-turn' : ''} ${isWinner ? 'winner' : ''}">${player.name}</span>
          ${player.isHost ? '<span class="host-badge">Host</span>' : ''}
          ${isCurrentTurn ? '<span class="turn-indicator">🎯</span>' : ''}
          ${isWinner ? '<span class="winner-badge">👑</span>' : ''}
        </div>
        <div class="bingo-letters">
          <span class="${player.bingoProgress.B ? 'earned' : ''}">B</span>
          <span class="${player.bingoProgress.I ? 'earned' : ''}">I</span>
          <span class="${player.bingoProgress.N ? 'earned' : ''}">N</span>
          <span class="${player.bingoProgress.G ? 'earned' : ''}">G</span>
          <span class="${player.bingoProgress.O ? 'earned' : ''}">O</span>
        </div>
      `;
      
      this.playersListElement.appendChild(playerDiv);
    });
  }

  updateGameStatus() {
    if (!this.gameData.gameState) return;
    
    const currentPlayerData = this.gameData.players[this.gameData.gameState.currentTurn];
    const isMyTurn = this.gameData.gameState.currentTurn === this.playerId;
    
    if (this.gameData.gameState.winner) {
      const winner = this.gameData.players[this.gameData.gameState.winner];
      this.turnStatusElement.textContent = `🎉 ${winner.name} wins!`;
    } else if (isMyTurn) {
      this.turnStatusElement.textContent = "🎯 Your turn! Select a cell.";
    } else {
      this.turnStatusElement.textContent = `Waiting for ${currentPlayerData.name}...`;
    }
  }

  updateBingoProgress() {
    if (!this.playerData) return;
    
    const letters = ['B', 'I', 'N', 'G', 'O'];
    letters.forEach(letter => {
      const letterElement = document.querySelector(`.letter[data-letter="${letter}"]`);
      if (letterElement) {
        if (this.playerData.bingoProgress[letter]) {
          letterElement.classList.add('earned');
        } else {
          letterElement.classList.remove('earned');
        }
      }
    });
  }

  async handleCellClick(cellIndex, cellValue) {
    // Check if it's the player's turn
    if (this.gameData.gameState.currentTurn !== this.playerId) {
      alert("It's not your turn!");
      return;
    }
    
    // Check if cell is already marked
    if (this.playerData.markedCells && this.playerData.markedCells.includes(cellIndex)) {
      alert("This cell is already marked!");
      return;
    }
    
    // Check if this number was already called
    if (this.gameData.gameState.calledNumbers && this.gameData.gameState.calledNumbers.includes(cellValue)) {
      alert("This number has already been called!");
      return;
    }
    
    try {
      await this.roomManager.makeMove(cellIndex, cellValue);
      
      // Add to game log
      this.addToGameLog(`${this.playerData.name} called ${cellValue}`);
      
    } catch (error) {
      console.error('Error making move:', error);
      alert('Failed to make move. Please try again.');
    }
  }

  addToGameLog(message) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    
    this.gameLogElement.appendChild(logEntry);
    this.gameLogElement.scrollTop = this.gameLogElement.scrollHeight;
  }

  handleGameEnd() {
    const winner = this.gameData.players[this.gameData.gameState.winner];
    const isWinner = this.gameData.gameState.winner === this.playerId;
    
    // Show winner modal
    const modal = document.getElementById('winner-modal');
    const winnerTitle = document.getElementById('winner-title');
    const winnerMessage = document.getElementById('winner-message');
    
    if (isWinner) {
      winnerTitle.textContent = '🎉 Congratulations!';
      winnerMessage.textContent = 'You got BINGO and won the game!';
    } else {
      winnerTitle.textContent = '🏆 Game Over';
      winnerMessage.textContent = `${winner.name} got BINGO and won the game!`;
    }
    
    modal.classList.remove('hidden');
    
    // Store game result for scoreboard
    localStorage.setItem('gameResult', JSON.stringify({
      winner: winner.name,
      isWinner: isWinner,
      players: this.gameData.players,
      roomId: this.roomId
    }));
    
    // Auto-cleanup room after 30 seconds
    setTimeout(() => {
      this.roomManager.deleteRoom();
    }, 30000);
  }
}

// Export for use in other modules
window.BingoGame = BingoGame;