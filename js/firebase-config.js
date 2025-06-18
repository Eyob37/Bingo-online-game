// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCCK260JRh5gaAuDlfBS-HbWnBrqeaDqhM",
  authDomain: "bingo-6db1b.firebaseapp.com",
  databaseURL: "https://bingo-6db1b-default-rtdb.firebaseio.com",
  projectId: "bingo-6db1b",
  storageBucket: "bingo-6db1b.firebasestorage.app",
  messagingSenderId: "896287671562",
  appId: "1:896287671562:web:b37e43f7a9d723e90ae6f3",
  measurementId: "G-PJRMX941SM"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Export for use in other modules
window.firebaseApp = app;
window.firebaseDatabase = database;

// Utility functions
window.FirebaseUtils = {
  // Generate a random room ID
  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate a random player ID
  generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  },

  // Get current timestamp
  getTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  },

  // Clean up expired rooms (called periodically)
  async cleanupExpiredRooms() {
    const roomsRef = database.ref('rooms');
    const snapshot = await roomsRef.once('value');
    const rooms = snapshot.val() || {};
    const now = Date.now();
    const expireTime = 2 * 60 * 60 * 1000; // 2 hours

    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      if (room.createdAt && (now - room.createdAt) > expireTime) {
        roomsRef.child(roomId).remove();
      }
    });
  }
};