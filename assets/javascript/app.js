// Initialize Firebase
let config = {
    apiKey: "AIzaSyCepdoBx3XmAEuI6Qpd50KYFKs3qRyo6Hs",
    authDomain: "rpsmp-3f60c.firebaseapp.com",
    databaseURL: "https://rpsmp-3f60c.firebaseio.com",
    projectId: "rpsmp-3f60c",
    storageBucket: "rpsmp-3f60c.appspot.com",
    messagingSenderId: "18120047495"
};
firebase.initializeApp(config);

// Create a variable to reference the database
let database = firebase.database();

let players = {
    playerId: '',
    addNewPlayer: function(nickName, first, last) {
        // Initialize Game Record
        let playerReference = database.ref('players');
        let playerConnection = playerReference.push({
            nickName: nickName,
            first: first,
            last: last,
            currentState: 'online',
            wins: 0,
            losses: 0
        });

        players.playerId = playerConnection.ref.key;

        playerConnection.onDisconnect().update({
            currentState: 'offline'
        });

        // players.addToQueue(players.playerId);
    },
    // addToQueue: function(playerId) {
    //     database.ref('queue').push({
    //         playerId: playerId,
    //         dateAdded: firebase.database.ServerValue.TIMESTAMP
    //     })
    // },
    // removeFromQueue: function(playerSnapshot) {
    //     playerSnapshot.ref.remove();
    // }
    returnPlayer: function() {
        return players.playerId;
    }
};

let game = {
    gameId: '',
    gameStatus: 'waiting',
    createPairings: function() {
        // Initialize Game Record
        let gameConnection;

        gamesRef = database.ref('games');
        gamesRef.once("value", function(snapshot){
            // Not defined - add a new game
            if (!snapshot.val()) {
                console.log("testing 1");
                gameConnection = database.ref('games').push({
                    playerOne: {
                        playerId: players.returnPlayer(),
                        currentSelection: ''
                    },
                    playerTwo: {
                        playerId: '',
                        currentSelection: ''                        
                    }
                });
            } else {
            // Check the games to see if anyone is waiting for another member
                snapshot.forEach(function(itemSnapshot) {
                    console.log(itemSnapshot.val());
                    if(!itemSnapshot.val().playerTwo.playerId && !game.gameId) {
                        itemSnapshot.ref.update({
                            playerTwo: {
                                playerId: players.returnPlayer(),
                                currentSelection: ''
                            }
                        });
                        
                        game.gameId = itemSnapshot.ref.key;
                    } 
                });
                    
                // Start a brand new game
                if (!game.gameId) {
                    console.log("testing 2");
                    gameConnection = database.ref('games').push({
                        playerOne: {
                            playerId: players.returnPlayer(),
                            currentSelection: ''
                        },
                        playerTwo: {
                            playerId: '',
                            currentSelection: ''                        
                        }
                    });     
                    
                    game.gameId = gameConnection.ref.key;
                }    
            }
        });
    }
}

$(document).ready(function() {
    players.addNewPlayer('tester3', 'john', 'tester');
    game.createPairings();
});