// Create room page functionality
document.addEventListener('DOMContentLoaded', function() {
  const roomManager = new RoomManager();
  const createRoomForm = document.getElementById('create-room-form');
  const roomCreatedSection = document.getElementById('room-created');
  const roomIdValue = document.getElementById('room-id-value');
  const copyRoomIdBtn = document.getElementById('copy-room-id');
  const playersInRoom = document.getElementById('players-in-room');
  const startGameBtn = document.getElementById('start-game');

  let currentRoom = null;

  createRoomForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const playerName = document.getElementById('player-name').value.trim();
    const maxPlayers = document.getElementById('max-players').value;
    
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    try {
      // Disable form
      const submitBtn = createRoomForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Room...';
      
      // Create room
      const result = await roomManager.createRoom(playerName, maxPlayers);
      
      // Show room created section
      createRoomForm.style.display = 'none';
      roomCreatedSection.classList.remove('hidden');
      roomIdValue.textContent = result.roomId;
      
      currentRoom = result;
      
      // Listen for room updates
      roomManager.onRoomUpdate(handleRoomUpdate);
      
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
      
      // Re-enable form
      const submitBtn = createRoomForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Room';
    }
  });

  copyRoomIdBtn.addEventListener('click', function() {
    const roomId = roomIdValue.textContent;
    navigator.clipboard.writeText(roomId).then(() => {
      copyRoomIdBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyRoomIdBtn.textContent = 'Copy';
      }, 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      copyRoomIdBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyRoomIdBtn.textContent = 'Copy';
      }, 2000);
    });
  });

  startGameBtn.addEventListener('click', async function() {
    try {
      startGameBtn.disabled = true;
      startGameBtn.textContent = 'Starting Game...';
      
      await roomManager.startGame();
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please try again.');
      
      startGameBtn.disabled = false;
      startGameBtn.textContent = 'Start Game';
    }
  });

  function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
      // Room was deleted
      alert('Room has been deleted.');
      window.location.href = 'index.html';
      return;
    }

    // Update players list
    updatePlayersList(room.players);
    
    // Check if game started
    if (room.status === 'playing' && room.gameState.gameStarted) {
      window.location.href = `game.html?room=${currentRoom.roomId}&player=${currentRoom.playerId}`;
    }
  }

  function updatePlayersList(players) {
    playersInRoom.innerHTML = '';
    
    if (!players) return;
    
    const playerList = Object.values(players);
    playerList.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${player.name}</span>
        ${player.isHost ? '<span class="host-badge">Host</span>' : ''}
      `;
      if (player.isHost) {
        li.classList.add('host');
      }
      playersInRoom.appendChild(li);
    });
    
    // Enable start button if there are at least 2 players
    startGameBtn.disabled = playerList.length < 2;
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    roomManager.removeAllListeners();
  });

  // Handle back button
  window.addEventListener('popstate', function() {
    roomManager.leaveRoom();
  });
});