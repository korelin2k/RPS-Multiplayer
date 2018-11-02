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
    playerRef: '',
    nickName: '',
    first: '',
    last: '',
    avatar: '',
    wins: '',
    losses: '',
    ties: '',
    opponent: {
        playerId: '',
        nickName: '',
        avatar: ''
    },
    addNewPlayer: function(nickName, first, last, avatar) {
        players.nickName = nickName;
        players.first = first;
        players.last = last;
        players.avatar = avatar;
        players.wins = 0;
        players.losses = 0;
        players.ties = 0;

        // Initialize Game Record
        let playerReference = database.ref('players');
        let playerConnection = playerReference.push({
            nickName: nickName,
            first: first,
            last: last,
            avatar: avatar,
            currentState: 'online',
            wins: 0,
            losses: 0,
            ties: 0
        });

        players.playerId = playerConnection.ref.key;
        players.playerRef = playerConnection.ref;

        playerConnection.onDisconnect().update({
            currentState: 'offline'
        });

        localStorage.setItem('playerId', players.playerId);

    },
    returnPlayer: function() {
        return players.playerId;
    },
    incrementWins: function() {
        let playerWins = 'players/' + players.playerId + '/wins'
        let conRef = database.ref(playerWins);

        conRef.once("value", function(snapshot){
            let currentWins = (snapshot.val() + 1);
            conRef.set(currentWins);
        });

        players.wins++;
    },
    incrementLosses: function() {
        let playerLosses = 'players/' + players.playerId + '/losses'
        let conRef = database.ref(playerLosses);

        conRef.once("value", function(snapshot){
            let currentLosses = (snapshot.val() + 1);
            conRef.set(currentLosses);
        });

        players.losses++;
    },
    incrementTies: function() {
        let playerTies = 'players/' + players.playerId + '/ties'
        let conRef = database.ref(playerTies);

        conRef.once("value", function(snapshot){
            let currentTies = (snapshot.val() + 1);
            conRef.set(currentTies);
        });

        player.ties++;
    }
};

let game = {
    gameId: '',
    gameReference: '',
    gameStatus: 'waiting',
    roundChoices: [],
    createPairings: function() {
        // Initialize Game Record
        let gameConnection;

        gamesRef = database.ref('games');
        gamesRef.once("value", function(snapshot){
            // Not defined - add a new game
            if (!snapshot.val()) {
                gameConnection = database.ref('games').push({
                    [players.playerId]: {
                        currentSelection: '',
                        chat: ''
                    },
                    status: 'waiting'
                });

                game.gameId = gameConnection.ref.key;
                game.gameReference = gameConnection.ref;

                gameConnection.onDisconnect().remove();

            } else {
            // Check the games to see if anyone is waiting for another member
                snapshot.forEach(function(itemSnapshot) {
                    if((Object.keys(itemSnapshot.val()).length === 2) && !game.gameId) {
                        gameConnection = itemSnapshot.ref.update({
                            [players.playerId]: {
                                currentSelection: '',
                                chat: ''
                            },
                            status: 'playing'
                        });

                        game.gameStatus = 'playing';
                        
                        game.gameId = itemSnapshot.ref.key;
                        game.gameReference = itemSnapshot.ref;

                        itemSnapshot.ref.onDisconnect().remove();

                        game.gameScreen();                    
                    } 
                });
                    
                // Start a brand new game
                if (!game.gameId) {
                    gameConnection = database.ref('games').push({
                        [players.playerId]: {
                            currentSelection: '',
                            chat: ''
                        },
                        status: 'waiting'
                    });     
                    
                    game.gameId = gameConnection.ref.key;
                    game.gameReference = gameConnection.ref;

                    gameConnection.onDisconnect().remove();
                }    
            }

            // Setup listener - Game changes
            let gameQueryString = 'games/' + game.gameId;
            database.ref(gameQueryString).on("child_changed", function(snapshot) {
                let playerChoices = snapshot.val();

                // Check if a new game has been triggered with a status of playing
                if(game.gameStatus === 'waiting' && playerChoices === 'playing') {
                    game.gameStatus = 'playing';

                    game.gameScreen();
                }

                // Check what choice was selected
                if (playerChoices.currentSelection) {
                    game.roundChoices.push(playerChoices);
                }

                if(game.roundChoices.length === 2) {
                    console.log(game.gameRules(game.roundChoices));

                    // Reset values
                    game.roundChoices = [];
                }
            });

            // Setup Listener - Game over, opponent has left
            database.ref(gameQueryString).on("child_removed", function(snapshot) {
                $('.screen-game').hide();
                $('.screen-want-to-play').show();
            });
        });
    },
    gameScreen: function() {
        let gameDetails = 'games/' + game.gameId;
        let conRef = database.ref(gameDetails);

        conRef.once("value", function(snapshot){
            let gameResults = Object.keys(snapshot.val());

            for (i in gameResults) {
                if (gameResults[i] !== 'status' && gameResults[i] !== players.playerId) {
                    players.opponent.playerId = gameResults[i];

                    let opponentDetails = 'players/' + players.opponent.playerId;
                    let conRef = database.ref(opponentDetails);
            
                    conRef.once("value", function(snapshot){
                        players.opponent.nickName = snapshot.val().nickName;
                        players.opponent.avatar = snapshot.val().avatar;

                        // Kick off game screen
                        $('.screen-waiting-opponent').hide();
                        $('.screen-game').show(); 
                    });                   
                }
            }   
        });        
    },
    selectChoice: function() {

    },
    gameRules: function(playerChoices) {
        let playerOneSelection, playerTwoSelection;

         if (playerChoices[0].playerId === players.playerId) {
             playerOneSelection = playerChoices[0].currentSelection;
             playerTwoSelection = playerChoices[1].currentSelection;
         } else {
             playerOneSelection = playerChoices[1].currentSelection
             playerTwoSelection = playerChoices[0].currentSelection;
         }

        if (playerOneSelection === playerTwoSelection) {
            players.incrementTies();
            return "It's a tie!";
        }
        if (playerOneSelection === "rock") {
            if (playerTwoSelection === "scissors") {
                players.incrementWins();
                return "You win!";
            } else {
                players.incrementLosses();
                return "You lose! Try again.";
            }
        }
        if (playerOneSelection === "paper") {
            if (playerTwoSelection === "rock") {
                players.incrementWins();
                return "You win!";
            } else {
                players.incrementLosses();
                return "You lose! Try again.";
            }
        }
        if (playerOneSelection === "scissors") {
            if (playerTwoSelection === "rock") {
                players.incrementLosses();
                return "You lose! Try again.";
            } else {
                players.incrementWins();
                return "You win!";
            }
        }
    },
    populateCharacterScreen: function() {
        $('.player-avatar').attr('src', 'assets/images/' + players.avatar);
        $('.player-nick').text(players.nickName);
        $('.player-first').text(players.first);
        $('.player-last').text(players.last);
        $('.player-wins').text(players.wins);
        $('.player-losses').text(players.losses);
        $('.player-ties').text(players.ties);
    }
}

$(document).ready(function() {
    // Check if player has been stored in localStorage
    if(localStorage.getItem('playerId') !== null) {
        players.playerId = localStorage.getItem('playerId');
        let playerDetails = 'players/' + players.playerId;
        let conRef = database.ref(playerDetails);

        conRef.once("value", function(snapshot){
            players.nickName = snapshot.val().nickName;
            players.first = snapshot.val().first;
            players.last = snapshot.val().last;
            players.avatar = snapshot.val().avatar;
            players.wins = snapshot.val().wins;
            players.losses = snapshot.val().losses;
            players.ties = snapshot.val().ties;  
            
            game.populateCharacterScreen();

            // Show proper screens
            $('.screen-new-session').hide();
            $('.screen-want-to-play').show();
        });       

        // Update Game Record
        let playerReference = database.ref('players/' + players.playerId);
        let playerConnection = playerReference.update({
            currentState: 'online',
        });

        playerReference.onDisconnect().update({
            currentState: 'offline'
        });
    }

    // Create user to play the game
    $('#button-add-player').on('click', function() {
        event.preventDefault();
        let inputNick = $('#inputNick').val();
        let inputFirst = $('#inputFirst').val();
        let inputLast = $('#inputLast').val();
        let inputAvatar = $("input:radio[name ='inputAvatar']:checked").val();
        console.log(inputAvatar);

        players.addNewPlayer(inputNick, inputFirst, inputLast, inputAvatar);

        game.populateCharacterScreen();

        // Show proper screens
        $('.screen-new-session').hide();
        $('.screen-want-to-play').show();
    });

    $(document).on('click', '#submit-play-game', function() {
        event.preventDefault();
        game.createPairings();

        $('.screen-want-to-play').hide();
        $('.screen-waiting-opponent').show();
    });
});