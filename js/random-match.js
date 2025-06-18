// Random match page functionality
document.addEventListener('DOMContentLoaded', function() {
  const roomManager = new RoomManager();
  const randomMatchForm = document.getElementById('random-match-form');
  const searchingSection = document.getElementById('searching');
  const matchFoundSection = document.getElementById('match-found');
  const cancelSearchBtn = document.getElementById('cancel-search');
  const countdownElement = document.getElementById('countdown');

  let searchTimeout = null;
  let matchTimeout = null;
  let queueRef = null;
  let currentPlayerId = null;

  randomMatchForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    startSearch(playerName);
  });

  cancelSearchBtn.addEventListener('click', function() {
    cancelSearch();
  });

  async function startSearch(playerName) {
    try {
      // Hide form and show searching
      randomMatchForm.style.display = 'none';
      searchingSection.classList.remove('hidden');
      
      currentPlayerId = window.FirebaseUtils.generatePlayerId();
      queueRef = window.firebaseDatabase.ref('matchmaking_queue');
      
      // Add to queue
      await queueRef.child(currentPlayerId).set({
        id: currentPlayerId,
        name: playerName,
        timestamp: window.FirebaseUtils.getTimestamp()
      });
      
      // Listen for other players in queue
      queueRef.on('child_added', handleQueueUpdate);
      
      // Set timeout for search (30 seconds)
      searchTimeout = setTimeout(() => {
        // Create a room and wait for someone to join
        createWaitingRoom(playerName);
      }, 30000);
      
    } catch (error) {
      console.error('Error starting search:', error);
      alert('Failed to start search. Please try again.');
      resetToForm();
    }
  }

  function handleQueueUpdate(snapshot) {
    const player = snapshot.val();
    
    // Don't match with ourselves
    if (player.id === currentPlayerId) return;
    
    // Found a match!
    clearTimeout(searchTimeout);
    foundMatch(player);
  }

  async function foundMatch(opponent) {
    try {
      // Remove both players from queue
      await queueRef.child(currentPlayerId).remove();
      await queueRef.child(opponent.id).remove();
      
      // Show match found
      searchingSection.classList.add('hidden');
      matchFoundSection.classList.remove('hidden');
      
      // Create room with both players
      const roomId = window.FirebaseUtils.generateRoomId();
      const roomData = {
        id: roomId,
        hostId: currentPlayerId,
        maxPlayers: 2,
        status: 'playing',
        createdAt: window.FirebaseUtils.getTimestamp(),
        players: {
          [currentPlayerId]: {
            id: currentPlayerId,
            name: document.getElementById('player-name').value,
            isHost: true,
            joinedAt: window.FirebaseUtils.getTimestamp(),
            board: roomManager.generateBingoBoard(),
            bingoProgress: { B: false, I: false, N: false, G: false, O: false },
            markedCells: []
          },
          [opponent.id]: {
            id: opponent.id,
            name: opponent.name,
            isHost: false,
            joinedAt: window.FirebaseUtils.getTimestamp(),
            board: roomManager.generateBingoBoard(),
            bingoProgress: { B: false, I: false, N: false, G: false, O: false },
            markedCells: []
          }
        },
        gameState: {
          currentTurn: currentPlayerId,
          calledNumbers: [],
          winner: null,
          gameStarted: true
        }
      };

      await window.firebaseDatabase.ref(`rooms/${roomId}`).set(roomData);
      
      // Countdown and redirect
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        countdownElement.textContent = countdown;
        countdown--;
        
        if (countdown < 0) {
          clearInterval(countdownInterval);
          window.location.href = `game.html?room=${roomId}&player=${currentPlayerId}`;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match. Please try again.');
      resetToForm();
    }
  }

  async function createWaitingRoom(playerName) {
    try {
      // Create a room and wait for random players to join
      const result = await roomManager.createRoom(playerName, 2);
      
      // Add room to public rooms list for random matching
      await window.firebaseDatabase.ref(`public_rooms/${result.roomId}`).set({
        roomId: result.roomId,
        hostName: playerName,
        createdAt: window.FirebaseUtils.getTimestamp(),
        playersCount: 1,
        maxPlayers: 2
      });
      
      // Listen for room updates
      roomManager.onRoomUpdate((snapshot) => {
        const room = snapshot.val();
        if (!room) return;
        
        const playerCount = Object.keys(room.players || {}).length;
        
        if (playerCount >= 2) {
          // Start the game automatically
          roomManager.startGame();
        }
      });
      
    } catch (error) {
      console.error('Error creating waiting room:', error);
      alert('Failed to find a match. Please try again.');
      resetToForm();
    }
  }

  function cancelSearch() {
    clearTimeout(searchTimeout);
    
    if (queueRef && currentPlayerId) {
      queueRef.child(currentPlayerId).remove();
      queueRef.off('child_added', handleQueueUpdate);
    }
    
    resetToForm();
  }

  function resetToForm() {
    searchingSection.classList.add('hidden');
    matchFoundSection.classList.add('hidden');
    randomMatchForm.style.display = 'block';
    
    if (queueRef) {
      queueRef.off();
      queueRef = null;
    }
    
    currentPlayerId = null;
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (queueRef && currentPlayerId) {
      queueRef.child(currentPlayerId).remove();
    }
    roomManager.removeAllListeners();
  });

  // Handle back button
  window.addEventListener('popstate', function() {
    cancelSearch();
  });
});