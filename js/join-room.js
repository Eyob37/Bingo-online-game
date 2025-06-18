// Join room page functionality
document.addEventListener('DOMContentLoaded', function() {
  const roomManager = new RoomManager();
  const joinRoomForm = document.getElementById('join-room-form');
  const roomJoinedSection = document.getElementById('room-joined');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const roomIdValue = document.getElementById('room-id-value');
  const playersInRoom = document.getElementById('players-in-room');

  let currentRoom = null;

  joinRoomForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const playerName = document.getElementById('player-name').value.trim();
    const roomId = document.getElementById('room-id').value.trim().toUpperCase();
    
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    if (!roomId) {
      alert('Please enter a room ID');
      return;
    }

    try {
      // Disable form
      const submitBtn = joinRoomForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining Room...';
      
      // Join room
      const result = await roomManager.joinRoom(roomId, playerName);
      
      // Show room joined section
      joinRoomForm.style.display = 'none';
      roomJoinedSection.classList.remove('hidden');
      roomIdValue.textContent = result.roomId;
      
      currentRoom = result;
      
      // Listen for room updates
      roomManager.onRoomUpdate(handleRoomUpdate);
      
    } catch (error) {
      console.error('Error joining room:', error);
      
      // Show error message
      joinRoomForm.style.display = 'none';
      errorMessage.classList.remove('hidden');
      
      let errorMsg = 'Unable to join room. Please check the room ID and try again.';
      if (error.message === 'Room not found') {
        errorMsg = 'Room not found. Please check the room ID.';
      } else if (error.message === 'Room is full') {
        errorMsg = 'This room is full. Please try another room.';
      } else if (error.message === 'Game already in progress') {
        errorMsg = 'Game is already in progress. You cannot join now.';
      }
      
      errorText.textContent = errorMsg;
    }
  });

  function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
      // Room was deleted
      alert('Room has been deleted by the host.');
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