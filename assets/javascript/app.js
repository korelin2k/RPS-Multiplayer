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

        commentString = '<p>' + players.nickName + ' beat ' + players.opponent.nickName + ' like a little girl!</p>';
        let updateChat = database.ref('games/' + game.gameId + '/chat');
        let updateConnection = updateChat.push({
            comment: commentString
        });   
        game.roundStatus = 'playing';

        players.wins++;
    },
    incrementLosses: function() {
        let playerLosses = 'players/' + players.playerId + '/losses'
        let conRef = database.ref(playerLosses);

        conRef.once("value", function(snapshot){
            let currentLosses = (snapshot.val() + 1);
            conRef.set(currentLosses);
        });

        game.roundStatus = 'playing';
        players.losses++;
    },
    incrementTies: function() {
        let playerTies = 'players/' + players.playerId + '/ties'
        let conRef = database.ref(playerTies);

        conRef.once("value", function(snapshot){
            let currentTies = (snapshot.val() + 1);
            conRef.set(currentTies);
        });

        if (game.playerPosition) {
            commentString = '<p>' + players.nickName + ' tied ' + players.opponent.nickName + ' - weak!</p>';
            let updateChat = database.ref('games/' + game.gameId + '/chat');
            let updateConnection = updateChat.push({
                comment: commentString
            });   
        } 

        game.roundStatus = 'playing';
        players.ties++;
    }
};

let game = {
    gameId: '',
    gameReference: '',
    gameStatus: 'waiting',
    roundStatus: 'waiting',
    playerPosition: '',
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
                        playerId: players.playerId,
                        currentSelection: '',
                    },
                    chat: '',
                    status: 'waiting'
                });

                game.gameId = gameConnection.ref.key;
                game.gameReference = gameConnection.ref;
                game.playerPosition = 0;

                gameConnection.onDisconnect().remove();

            } else {
            // Check the games to see if anyone is waiting for another member
                snapshot.forEach(function(itemSnapshot) {
                    if((Object.keys(itemSnapshot.val()).length === 3) && !game.gameId) {
                        gameConnection = itemSnapshot.ref.update({
                            [players.playerId]: {
                                playerId: players.playerId,
                                currentSelection: '',
                            },
                            chat: '',
                            status: 'playing'
                        });

                        game.gameStatus = 'playing';
                        game.roundStatus = 'playing';
                        game.playerPosition = 1;
                        
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
                            playerId: players.playerId,
                            currentSelection: '',
                        },
                        chat: '',
                        status: 'waiting'
                    });     
                    
                    game.gameId = gameConnection.ref.key;
                    game.gameReference = gameConnection.ref;
                    game.playerPosition = 0;

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
                    game.roundStatus = 'playing';

                    game.gameScreen();
                }

                // Check what choice was selected
                if (playerChoices.currentSelection) {
                    game.roundChoices.push(playerChoices);
                }

                if(game.roundChoices.length === 2 && game.roundStatus === 'playing') {
                    game.roundStatus = 'waiting';
                    game.gameRules(game.roundChoices);

                    // Reset values
                    game.roundChoices = [];

                    let gameSelection = database.ref('games/' + game.gameId + '/' + players.playerId);
                    let playerConnection = gameSelection.update({
                        currentSelection: '',
                    });   
                }

                // Check if the change is a comment
                if(typeof playerChoices === 'object') {
                    let lastChange = Object.values(playerChoices).pop();
                    
                    if (lastChange.comment) {
                        $('.chat-output').append(lastChange.comment);
                    }
                } 
            });

            // Setup Listener - Game over, opponent has left
            database.ref(gameQueryString).on("child_removed", function(snapshot) {
                game.gameStatus = 'waiting';
                game.roundStatus = 'waiting';
                $('.chat-output').empty();
                $('.custom-join-message').html(players.opponent.nickName + ' has <strong>disconnected</strong>. Play another?')
                game.gameId = '';
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
                if (gameResults[i] !== 'status' && gameResults[i] !== 'chat' && gameResults[i] !== players.playerId) {
                    players.opponent.playerId = gameResults[i];

                    let opponentDetails = 'players/' + players.opponent.playerId;
                    let conRef = database.ref(opponentDetails);
            
                    conRef.once("value", function(snapshot){
                        players.opponent.nickName = snapshot.val().nickName;
                        players.opponent.avatar = snapshot.val().avatar;

                        $('.player-avatar').attr('src', 'assets/images/' + players.avatar);
                        $('.opponent-avatar').attr('src', 'assets/images/' + players.opponent.avatar);

                        $('.player-name').text(players.nickName);
                        $('.opponent-name').text(players.opponent.nickName);

                        // Kick off game screen
                        $('.screen-waiting-opponent').hide();
                        $('.screen-game').show(); 
                    });                   
                }
            }   
        });        
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
        }
        if (playerOneSelection === "rock") {
            if (playerTwoSelection === "scissors") {
                players.incrementWins();
            } else {
                players.incrementLosses();
            }
        }
        if (playerOneSelection === "paper") {
            if (playerTwoSelection === "rock") {
                players.incrementWins();
            } else {
                players.incrementLosses();
            }
        }
        if (playerOneSelection === "scissors") {
            if (playerTwoSelection === "rock") {
                players.incrementLosses();
            } else {
                players.incrementWins();
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
        if (!inputNick) {
            inputNick = 'Smithy';
        }

        let inputFirst = $('#inputFirst').val();
        if (!inputFirst) {
            inputFirst = 'Jack';
        }

        let inputLast = $('#inputLast').val();
        if (!inputLast) {
            inputLast = 'Smith';
        }

        let inputAvatar = $("input:radio[name ='inputAvatar']:checked").val();
        if (!inputAvatar) {
            inputAvatar = 'fate-image-2.png';
        }

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

    $(document).on('click', '.make-selection', function() {
        let selectionValue = $(this).attr('id');
        
        // Update Game Record
        let gameSelection = database.ref('games/' + game.gameId + '/' + players.playerId);
        let playerConnection = gameSelection.update({
            currentSelection: selectionValue,
        });        
    });

    $(document).on('keypress', '#chat-input', function(e) {
        var key = e.which;
        if(key == 13){
            let commentString = '<p>' + players.nickName + ': ';
            commentString += $('#chat-input').val();
            commentString += '</p>';

            let updateChat = database.ref('games/' + game.gameId + '/chat');
            let updateConnection = updateChat.push({
                comment: commentString
            });   

            $('#chat-input').val('');
        }
    });
});