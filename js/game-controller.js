// Game controller for handling game page
document.addEventListener('DOMContentLoaded', function() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  const playerId = urlParams.get('player');
  
  if (!roomId || !playerId) {
    alert('Invalid game parameters. Redirecting to main menu.');
    window.location.href = 'index.html';
    return;
  }
  
  // Initialize game
  const game = new BingoGame(roomId, playerId);
  
  // Handle modal buttons
  const viewScoreboardBtn = document.getElementById('view-scoreboard');
  const newGameBtn = document.getElementById('new-game');
  const leaveGameBtn = document.getElementById('leave-game');
  
  viewScoreboardBtn.addEventListener('click', function() {
    window.location.href = 'scoreboard.html';
  });
  
  newGameBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  leaveGameBtn.addEventListener('click', async function() {
    if (confirm('Are you sure you want to leave the game?')) {
      await game.roomManager.leaveRoom();
      window.location.href = 'index.html';
    }
  });
  
  // Handle page unload
  window.addEventListener('beforeunload', function() {
    game.roomManager.removeAllListeners();
  });
  
  // Handle back button
  window.addEventListener('popstate', function() {
    game.roomManager.leaveRoom();
  });
});