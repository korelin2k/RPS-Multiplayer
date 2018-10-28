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
    addNewPlayer: function() {
        // Initialize Game Record
        let playerConnection = database.ref('players').push({
            nickName: 'tester5',
            first: 'John',
            last: 'Smith',
            wins: 0,
            losses: 0
        });

        players.playerId = playerConnection.ref.key;

        players.addToQueue();
    },
    addToQueue: function() {
        database.ref('queue').push({
            playerId: players.playerId,
            dateAdded: firebase.database.ServerValue.TIMESTAMP
        })
    }
};

let game = {
    gameId: '',
    gameQueue: 0,
    gameStatus: 'waiting',
    selectPlayers: function() {
        // let citiesRef = database.ref('cities');
        let getPlayers = database.ref('queue').orderByChild('dateAdded').limitToFirst(2);
        console.log(getPlayers);
    },
    startNewGame: function() {
        // Initialize Game Record
        gameConnection = database.ref('games').push({
            playerOne: {
                playerId: '',
                currentSelection: ''
            },
            playerTwo: {
                playerId: '',
                currentSelection: ''
            }
        });

        gameId = gameConnection.ref.key;
    },

    roundOver: function(winner, loser) {

    }
}

$(document).ready(function() {
    players.addNewPlayer();
    game.startNewGame();

    // Listener - player gets added to the queue
    database.ref('queue').on("child_added", function(snapshot) {
        game.gameQueue++;

        if(game.gameQueue >= 2) {
            game.selectPlayers();
        }
    });
});