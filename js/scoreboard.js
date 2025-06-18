// Scoreboard page functionality
document.addEventListener('DOMContentLoaded', function() {
  const winnerName = document.getElementById('winner-name');
  const standingsList = document.getElementById('standings-list');
  const gameStats = document.getElementById('game-stats');
  const playAgainBtn = document.getElementById('play-again');
  
  // Load game result from localStorage
  const gameResultStr = localStorage.getItem('gameResult');
  
  if (!gameResultStr) {
    // No game result found, redirect to main menu
    alert('No game result found. Redirecting to main menu.');
    window.location.href = 'index.html';
    return;
  }
  
  const gameResult = JSON.parse(gameResultStr);
  
  // Display winner
  winnerName.textContent = gameResult.winner;
  
  // Display final standings
  displayStandings(gameResult.players, gameResult.winner);
  
  // Display game statistics
  displayGameStats(gameResult.players);
  
  // Handle play again button
  playAgainBtn.addEventListener('click', function() {
    // Clear game result
    localStorage.removeItem('gameResult');
    window.location.href = 'index.html';
  });
  
  function displayStandings(players, winnerId) {
    const playerList = Object.values(players);
    
    // Sort players: winner first, then by BINGO progress
    playerList.sort((a, b) => {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
      
      // Count earned letters
      const aCount = Object.values(a.bingoProgress).filter(Boolean).length;
      const bCount = Object.values(b.bingoProgress).filter(Boolean).length;
      
      return bCount - aCount;
    });
    
    standingsList.innerHTML = '';
    
    playerList.forEach((player, index) => {
      const standingItem = document.createElement('div');
      standingItem.className = 'standing-item';
      
      const position = index + 1;
      const earnedLetters = Object.entries(player.bingoProgress)
        .filter(([letter, earned]) => earned)
        .map(([letter]) => letter)
        .join('');
      
      const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
      
      standingItem.innerHTML = `
        <div class="position">${positionEmoji}</div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-progress">
            ${earnedLetters ? `Letters: ${earnedLetters}` : 'No letters earned'}
          </div>
        </div>
        <div class="player-score">
          ${player.markedCells ? player.markedCells.length : 0} cells marked
        </div>
      `;
      
      standingsList.appendChild(standingItem);
    });
  }
  
  function displayGameStats(players) {
    const playerList = Object.values(players);
    const totalPlayers = playerList.length;
    const totalCellsMarked = playerList.reduce((sum, player) => 
      sum + (player.markedCells ? player.markedCells.length : 0), 0);
    const averageCellsMarked = Math.round(totalCellsMarked / totalPlayers);
    
    // Count how many players earned each letter
    const letterStats = { B: 0, I: 0, N: 0, G: 0, O: 0 };
    playerList.forEach(player => {
      Object.entries(player.bingoProgress).forEach(([letter, earned]) => {
        if (earned) letterStats[letter]++;
      });
    });
    
    const stats = [
      { label: 'Total Players', value: totalPlayers },
      { label: 'Total Cells Marked', value: totalCellsMarked },
      { label: 'Average Cells per Player', value: averageCellsMarked },
      { label: 'Players with B', value: letterStats.B },
      { label: 'Players with I', value: letterStats.I },
      { label: 'Players with N', value: letterStats.N },
      { label: 'Players with G', value: letterStats.G },
      { label: 'Players with O', value: letterStats.O }
    ];
    
    gameStats.innerHTML = '';
    
    stats.forEach(stat => {
      const statCard = document.createElement('div');
      statCard.className = 'stat-card';
      statCard.innerHTML = `
        <div class="stat-value">${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      `;
      gameStats.appendChild(statCard);
    });
  }
});