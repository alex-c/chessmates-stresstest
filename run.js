/**
 * @author      SWE Gruppe 2 PO2013
 * @version     1.1
 * @since       08.01.2017
 *
 * Script zum durchführen eines Stresstestes - mehr Informationen zum Stresstest sind im Server-Handbuch zu finden.
 */

const config = require('config');
const fork = require('child_process').fork;

var gameCount = 10;

var i=0;

/**
 * Startet mehrere Testspiele
 */
console.log("+ [Stresstest] Host: "+config.get('server.host')+" / Port: "+config.get('server.port'));
console.log("+ [Stresstest] Start von "+gameCount+" Spielen...");
var intv=setInterval(function() {
    fork("test.js", [], {
        stdio: 'inherit' //or: silent: true
    }, function(err, stdout, stderr) {
        console.log(err);
    });
    i++;
    if(i==gameCount) {
        clearInterval(intv);
        console.log("+ [Stresstest] "+gameCount+" Spiele gestartet.");
    }
},1000);
