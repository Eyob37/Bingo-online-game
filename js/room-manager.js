// Room management functionality
class RoomManager {
  constructor() {
    this.database = window.firebaseDatabase;
    this.currentRoomId = null;
    this.currentPlayerId = null;
    this.currentPlayerName = null;
    this.roomRef = null;
    this.listeners = [];
  }

  // Create a new room
  async createRoom(hostName, maxPlayers) {
    try {
      const roomId = window.FirebaseUtils.generateRoomId();
      const playerId = window.FirebaseUtils.generatePlayerId();
      
      const roomData = {
        id: roomId,
        hostId: playerId,
        maxPlayers: parseInt(maxPlayers),
        status: 'waiting', // waiting, playing, finished
        createdAt: window.FirebaseUtils.getTimestamp(),
        players: {
          [playerId]: {
            id: playerId,
            name: hostName,
            isHost: true,
            joinedAt: window.FirebaseUtils.getTimestamp(),
            board: this.generateBingoBoard(),
            bingoProgress: { B: false, I: false, N: false, G: false, O: false },
            markedCells: []
          }
        },
        gameState: {
          currentTurn: playerId,
          calledNumbers: [],
          winner: null,
          gameStarted: false
        }
      };

      await this.database.ref(`rooms/${roomId}`).set(roomData);
      
      this.currentRoomId = roomId;
      this.currentPlayerId = playerId;
      this.currentPlayerName = hostName;
      this.roomRef = this.database.ref(`rooms/${roomId}`);
      
      return { roomId, playerId };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Join an existing room
  async joinRoom(roomId, playerName) {
    try {
      const roomRef = this.database.ref(`rooms/${roomId}`);
      const snapshot = await roomRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Room not found');
      }

      const room = snapshot.val();
      const playerCount = Object.keys(room.players || {}).length;
      
      if (playerCount >= room.maxPlayers) {
        throw new Error('Room is full');
      }

      if (room.status !== 'waiting') {
        throw new Error('Game already in progress');
      }

      const playerId = window.FirebaseUtils.generatePlayerId();
      const playerData = {
        id: playerId,
        name: playerName,
        isHost: false,
        joinedAt: window.FirebaseUtils.getTimestamp(),
        board: this.generateBingoBoard(),
        bingoProgress: { B: false, I: false, N: false, G: false, O: false },
        markedCells: []
      };

      await roomRef.child(`players/${playerId}`).set(playerData);
      
      this.currentRoomId = roomId;
      this.currentPlayerId = playerId;
      this.currentPlayerName = playerName;
      this.roomRef = roomRef;
      
      return { roomId, playerId };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Start the game (host only)
  async startGame() {
    if (!this.roomRef || !this.currentPlayerId) return;

    try {
      const snapshot = await this.roomRef.once('value');
      const room = snapshot.val();
      
      if (!room.players[this.currentPlayerId]?.isHost) {
        throw new Error('Only host can start the game');
      }

      const playerIds = Object.keys(room.players);
      const firstPlayerId = playerIds[0];

      await this.roomRef.update({
        status: 'playing',
        'gameState/gameStarted': true,
        'gameState/currentTurn': firstPlayerId
      });

      // Navigate to game page
      window.location.href = `game.html?room=${this.currentRoomId}&player=${this.currentPlayerId}`;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  // Make a move (select a cell)
  async makeMove(cellIndex, cellValue) {
    if (!this.roomRef || !this.currentPlayerId) return;

    try {
      const snapshot = await this.roomRef.once('value');
      const room = snapshot.val();
      
      if (room.gameState.currentTurn !== this.currentPlayerId) {
        throw new Error('Not your turn');
      }

      // Add the called number to the game state
      const calledNumbers = [...(room.gameState.calledNumbers || []), cellValue];
      
      // Update all players' marked cells
      const updates = {};
      updates[`gameState/calledNumbers`] = calledNumbers;
      
      // Mark cells for all players who have this number
      Object.keys(room.players).forEach(playerId => {
        const player = room.players[playerId];
        const cellIndexInBoard = player.board.indexOf(cellValue);
        
        if (cellIndexInBoard !== -1) {
          const markedCells = [...(player.markedCells || []), cellIndexInBoard];
          updates[`players/${playerId}/markedCells`] = markedCells;
          
          // Check for BINGO progress
          const bingoProgress = this.checkBingoProgress(player.board, markedCells);
          updates[`players/${playerId}/bingoProgress`] = bingoProgress;
          
          // Check if player won
          if (this.checkWinner(bingoProgress)) {
            updates[`gameState/winner`] = playerId;
            updates[`status`] = 'finished';
          }
        }
      });

      // Move to next player's turn
      if (!updates[`gameState/winner`]) {
        const playerIds = Object.keys(room.players);
        const currentIndex = playerIds.indexOf(this.currentPlayerId);
        const nextIndex = (currentIndex + 1) % playerIds.length;
        updates[`gameState/currentTurn`] = playerIds[nextIndex];
      }

      await this.roomRef.update(updates);
    } catch (error) {
      console.error('Error making move:', error);
      throw error;
    }
  }

  // Generate a random 5x5 bingo board with numbers 1-25
  generateBingoBoard() {
    const numbers = [];
    for (let i = 1; i <= 25; i++) {
      numbers.push(i);
    }
    
    // Shuffle the numbers
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    return numbers;
  }

  // Check BINGO progress
  checkBingoProgress(board, markedCells) {
    const progress = { B: false, I: false, N: false, G: false, O: false };
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      const rowCells = [];
      for (let col = 0; col < 5; col++) {
        rowCells.push(row * 5 + col);
      }
      if (rowCells.every(cell => markedCells.includes(cell))) {
        progress.B = true;
        if (progress.I) progress.N = true;
        if (progress.N) progress.G = true;
        if (progress.G) progress.O = true;
        break;
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      const colCells = [];
      for (let row = 0; row < 5; row++) {
        colCells.push(row * 5 + col);
      }
      if (colCells.every(cell => markedCells.includes(cell))) {
        if (!progress.B) progress.B = true;
        else if (!progress.I) progress.I = true;
        else if (!progress.N) progress.N = true;
        else if (!progress.G) progress.G = true;
        else if (!progress.O) progress.O = true;
      }
    }

    // Check diagonals
    const diagonal1 = [0, 6, 12, 18, 24];
    const diagonal2 = [4, 8, 12, 16, 20];
    
    if (diagonal1.every(cell => markedCells.includes(cell)) || 
        diagonal2.every(cell => markedCells.includes(cell))) {
      if (!progress.B) progress.B = true;
      else if (!progress.I) progress.I = true;
      else if (!progress.N) progress.N = true;
      else if (!progress.G) progress.G = true;
      else if (!progress.O) progress.O = true;
    }

    return progress;
  }

  // Check if a player has won (completed BINGO)
  checkWinner(bingoProgress) {
    return bingoProgress.B && bingoProgress.I && bingoProgress.N && 
           bingoProgress.G && bingoProgress.O;
  }

  // Listen to room changes
  onRoomUpdate(callback) {
    if (!this.roomRef) return;
    
    const listener = this.roomRef.on('value', callback);
    this.listeners.push({ ref: this.roomRef, listener });
  }

  // Remove all listeners
  removeAllListeners() {
    this.listeners.forEach(({ ref, listener }) => {
      ref.off('value', listener);
    });
    this.listeners = [];
  }

  // Leave room and cleanup
  async leaveRoom() {
    if (this.roomRef && this.currentPlayerId) {
      try {
        await this.roomRef.child(`players/${this.currentPlayerId}`).remove();
        
        // If no players left, remove the room
        const snapshot = await this.roomRef.once('value');
        const room = snapshot.val();
        if (!room || !room.players || Object.keys(room.players).length === 0) {
          await this.roomRef.remove();
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
    
    this.removeAllListeners();
    this.currentRoomId = null;
    this.currentPlayerId = null;
    this.currentPlayerName = null;
    this.roomRef = null;
  }

  // Delete room (host only)
  async deleteRoom() {
    if (this.roomRef && this.currentPlayerId) {
      try {
        const snapshot = await this.roomRef.once('value');
        const room = snapshot.val();
        
        if (room && room.players[this.currentPlayerId]?.isHost) {
          await this.roomRef.remove();
        }
      } catch (error) {
        console.error('Error deleting room:', error);
      }
    }
  }
}

// Export for use in other modules
window.RoomManager = RoomManager;