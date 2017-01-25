/**
 * @author      SWE Gruppe 2 PO2013
 * @version     1.1
 * @since       08.01.2017
 */

const config = require('config');
const rp = require('request-promise')
const chessjs = require('chess.js');

/**
 * Konfiguration des Testspiels
 *
 * @param unique_tag     Identifikation des Spiels
 * @param verbose        Konfiguration der Ausgabe
 *
 */
function TestGame(unique_tag,verbose) {
    this.baseUrl = config.get('server.host') + config.get('server.port');
    this.unique_tag = unique_tag;
    this.verbose = verbose;
    this.game = new chessjs.Chess();
    this.player = [{
        name: "u1" + unique_tag,
        sessionID: ""
    }, {
        name: "u2" + unique_tag,
        sessionID: ""
    }];
    this.gameId = 0;
    this.activePlayer = 1;
}

/**
 * Starten eines Testspiels mit Konsolenausgabe der einzelnen Schritte
 */
TestGame.prototype.setup = function(cb) {
    var self = this;
    self.verbose && console.log("+------ GameTest setup: " + self.unique_tag);
    self.verbose && console.log("| + Register user 1");
    rp({
        url: self.baseUrl + "/register",
        method: 'POST',
        form: {
            name: self.player[0].name,
            password: "u1",
            email: "u1@test.wtf"
        }
    })
    .then(function(response) {
        self.verbose && console.log("| + Register user 2");
        return rp({
            url: self.baseUrl + "/register",
            method: 'POST',
            form: {
                name: self.player[1].name,
                password: "u2",
                email: "u2@test.wtf"
            }
        });
    })
    .then(function(response) {
        self.verbose && console.log("| + Login user 1");
        return rp({
            url: self.baseUrl + "/login",
            method: 'POST',
            form: {
                name: self.player[0].name,
                password: "u1",
                deviceID: "d1",
                appKey: "k1"
            }
        });
    })
    .then(function(response) {
        self.player[0].sessionID = JSON.parse(response).sessionID;
        self.verbose && console.log("| | + Got session ID " + self.player[0].sessionID);
        self.verbose && console.log("| + Login user 2");
        return rp({
            url: self.baseUrl + "/login",
            method: 'POST',
            form: {
                name: self.player[1].name,
                password: "u2",
                deviceID: "d2",
                appKey: "k2"
            }
        });
    })
    .then(function(response) {
        self.player[1].sessionID = JSON.parse(response).sessionID;
        self.verbose && console.log("| | + Got session ID " + self.player[1].sessionID);
        self.verbose && console.log("| + Send challenge");
        return rp({
            url: self.baseUrl + "/challenges/send",
            method: 'POST',
            form: {
                name: self.player[0].name,
                sessionID: self.player[0].sessionID,
                opponent: self.player[1].name,
                gameType: "normal",
                time: "0"
            }
        });
    })
    .then(function(response) {
        self.verbose && console.log("| + Get challenge ID");
        return rp({
            url: self.baseUrl + "/challenges/list",
            method: 'GET',
            qs: {
                name: self.player[1].name,
                sessionID: self.player[1].sessionID
            }
        });
    })
    .then(function(response) {
        var challengeID = JSON.parse(response).challenges[0].id;
        self.verbose && console.log("| | Found challenge id: " + challengeID);
        self.verbose && console.log("| + Accept challenge");
        return rp({
            url: self.baseUrl + "/challenges/accept",
            method: 'POST',
            form: {
                name: self.player[1].name,
                sessionID: self.player[1].sessionID,
                id: challengeID
            }
        });
    })
    .then(function(response) {
        self.gameId = JSON.parse(response).id;
        console.log("| | + Game created!");
        self.verbose && console.log("+----- Setup complete!");
        cb();
    })
    .catch(function(error) {
        console.log("| | + ERROR: " + error);
        cb(error);
    });
}

/**
 * Durchführen eines zufällig gewähltem Zuges mit Konsolenausgabe
 */
TestGame.prototype.makeMove = function(cb) {
    var cb = cb;
    var self = this;
    var moves = this.game.moves({
        verbose: true
    });
    var move = moves[Math.floor(Math.random() * moves.length)];
    self.verbose && console.log("Zug " + (self.activePlayer==1 ? "weiß": "schwarz") + ": "  + move.san);
    rp({
        url: this.baseUrl + "/game/move",
        method: 'POST',
        form: {
            name: this.player[this.activePlayer].name,
            sessionID: this.player[this.activePlayer].sessionID,
            id: this.gameId,
            move: move.san
        }
    })
    .then(function(response) {
        var res = JSON.parse(response);
        self.game = new chessjs.Chess(res.gameState.board);
        self.verbose && console.log("Zeit weiß: " + res.gameState.players.white.timeLeft.toFixed(2));
        self.verbose && console.log("Zeit schwarz: " + res.gameState.players.black.timeLeft.toFixed(2));
        /*self.verbose &&*/ console.log(self.game.ascii());
        if (res.gameState.state.over) {
            cb(res.gameState.state);
        }
        self.activePlayer = (self.activePlayer == 1) ? 0 : 1;
    })
    .catch(function(error) {
        console.log(error);
    });
}


var test = new TestGame(Date.now().toString(),true);
test.setup(function(error) {
    var interval = setInterval(function() {
        test.makeMove(function(state) {
            console.log(state.flag);
            clearInterval(interval);
        });
    }, 4000);
});
