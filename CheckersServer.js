/*
 * CheckersServer.js
 *
 * Here we implement the checkers game server-side.
 */

 'use strict';

var http = require( 'http' );
var url = require( 'url' );
var jsdom = require( 'jsdom' );
var fs = require( 'fs' );
var sockIO = require( 'socket.io' );
var shared = require( './CheckersShared' );

// When jsdom loads our HTML templates, try to have it ignore the <script> tags.  Is this necessary?
jsdom.defaultDocumentFeatures.FetchExternalResources = false;
jsdom.defaultDocumentFeatures.ProcessExternalResources = false;

var nextGameId = 1;
var gamesWaiting = {};
var gamesPlaying = {};
var gameSockets = {};

/*
 * This is where we serve requests from the browser client.
 */
var ServerCallback = function( request, result )
{
	try
	{
		var urlData = url.parse( request.url );

		console.log( 'Asked to server URL: ' + request.url );
		
		if( urlData.pathname === '/' )
		{
			var htmlPage = fs.readFileSync( 'CheckersLobby.html', 'utf8' );

			var JsdomCallback = function( errors, window )
			{
				var $ = window.$;
				var document = window.document;

				var waitingListElement = document.getElementById( 'waitingList' );

				if( Object.keys( gamesWaiting ).length === 0 )
					waitingListElement.innerHTML = '<p>There are currently no players waiting for an opponent.</p>';
				else
				{
					var listHtml = '<p>Following is a list of games with players waiting for an opponent.  Click on the game you wish to join.</p>\n';

					listHtml += '<ul>\n';

					for( var gameId in gamesWaiting )
						listHtml += '\t<li><span class="joinGame"><a id="' + gameId.toString() + '" href="">Game ' + gameId.toString() + '</a></span></li>\n';

					listHtml += '</ul>\n';

					waitingListElement.innerHTML = listHtml;
				}

				htmlPage = window.document.documentElement.outerHTML;

				result.writeHead( 200, { 'Content-type' : 'text/html' } );
				result.end( htmlPage );
			}

			jsdom.env( htmlPage, [ 'http://code.jquery.com/jquery.js' ], JsdomCallback );
		}
		else if( /checkersclientlobby/i.exec( request.url ) )
		{
			var clientSource = fs.readFileSync( 'CheckersClientLobby.js', 'utf8' );
			result.writeHead( 200, { 'Content-Type' : 'text/plain' } );
			result.end( clientSource );
		}
		else if( /checkersclientgame/i.exec( request.url ) )
		{
			var clientSource = fs.readFileSync( 'CheckersClientGame.js', 'utf8' );
			result.writeHead( 200, { 'Content-Type' : 'text/plain' } );
			result.end( clientSource );
		}
		else if( /checkersshared/i.exec( request.url ) )
		{
			var sharedSource = fs.readFileSync( 'CheckersShared.js', 'utf8' );
			result.writeHead( 200, { 'Content-Type' : 'text/plain' } );
			result.end( sharedSource );
		}
		else if( urlData.pathname === '/NewGame.json' )
		{
			var gameId = nextGameId++;
			var jsonData = { 'gameId' : gameId, 'color' : 'black' };
			
			var match = /^againstComputer=([a-zA-Z]+)/.exec( urlData.query )[1];
			var againstComputer = ( match === 'true' );
			
			var gameState = new shared.CheckersGame();
			
			if( !againstComputer )
				gamesWaiting[ gameId ] = gameState;
			else
			{
				gamesPlaying[ gameId ] = gameState;
				gameState.againstComputer = true;
				jsonData.color = 'red';
			}
			
			result.writeHead( 200, { 'Content-Type' : 'text/json' } );
			result.end( JSON.stringify( jsonData ) );
		}
		else if( urlData.pathname === '/JoinGame.json' )
		{
			var capture = /^gameId=([0-9]+)/.exec( urlData.query );
			if( capture.length !== 2 )
				throw 'Failed to parse query data on URL string.';
			
			var gameId = parseInt( capture[1] );
			var jsonObject =
			{
				'gameId' : gameId,
				'join' : ( gameId in gamesWaiting ),
				'color' : 'red'
			};
			
			if( jsonObject.join === true )
			{
				gamesPlaying[ gameId ] = gamesWaiting[ gameId ];
				delete gamesWaiting[ gameId ];
			}
			
			var jsonData = JSON.stringify( jsonObject );
			
			result.writeHead( 200, { 'Content-Type' : 'text/json' } );
			result.end( jsonData );
		}
		else if( urlData.pathname === '/game' )
		{
			var htmlPage = fs.readFileSync( 'CheckersGame.html', 'utf8' );
			
			result.writeHead( 200, { 'Content-type' : 'text/html' } );
			result.end( htmlPage );
		}
		else if( /\.png/.exec( request.url ) )
		{
			var pngFile = urlData.pathname.substring( 1, urlData.pathname.length );
			var pngFileData = fs.readFileSync( pngFile, 'binary' );
			
			result.writeHead( 200, { 'Content-Type' : 'image/png' } );
			result.end( pngFileData, 'binary' );
		}
		else
		{
			throw 'Unknown request.';
		}
	}
	catch( error )
	{
		result.writeHead( 404, { 'Content-Type' : 'text/plain' } );
		result.end( 'Error: ' + error.toString() );
	}
}

var OnSocketConnection = function( socket )
{
	// Note that these closures don't appear to be given enough information, but the idea
	// is that the information they need can be stored as up-values on the closure.
	// For example, I'm not given here the socket that disconnected, but I can save it
	// as part of the closure by referencing it here from the defining scope.
	var OnSocketDisconnect = function()
	{
		var gameId = socket.gameId;
		if( !gameId )
			return;
		
		var socketPair = gameSockets[ gameId ];
		if( !socketPair )
			return;
		
		var opponentColor = shared.OpponentOf( socket.color );
		var opponentSocket = socketPair[ opponentColor ];
		if( opponentSocket )
		{
			// Tell the player that their opponent disconnected.
			opponentSocket.emit( 'message', { 'type' : 'opponent disconnected' } );
		}
		
		// The game is over.  We don't support any kind of reconnect mid-game.
		delete socketPair[ socket.color ];
		delete gamesPlaying[ gameId ];
	}
	
	var OnSocketReceiveMessage = function( messageData )
	{
		if( messageData.type === 'self identification' )
		{
			// We can store our own properties on the socket object (or any object.)
			socket.gameId = messageData.gameId;
			socket.color = messageData.color;
			
			var socketPair = gameSockets[ messageData.gameId ];
			if( !socketPair )
				socketPair = {};
			
			if( socketPair[ messageData.color ] )
			{
				socket.emit( 'message', { 'type' : 'error', 'error' : 'Color ' + messageData.color + ' already connected.' } );
				return;
			}
			
			socketPair[ messageData.color ] = socket;
			gameSockets[ messageData.gameId ] = socketPair;
		}
		else if( messageData.type === 'take turn' )
		{
			if( !( messageData.gameId in gamesPlaying ) )
			{
				socket.emit( 'message', { 'type' : 'error', 'error' : 'Game not found.' } );
				return;
			}
			
			var gameState = gamesPlaying[ messageData.gameId ];
			
			if( socket.color !== gameState.whosTurn )
			{
				socket.emit( 'message', { 'type' : 'move rejected', 'reason' : 'You cannot take your opponent\'s turn for them.' } );
				return;
			}
			
			var result = gameState.TakeTurn( messageData.moveSequence, false );
			if( result !== 'SUCCESS' )
			{
				socket.emit( 'message', { 'type' : 'move rejected', 'reason' : result } );
				return;
			}
			
			var opponentColor = shared.OpponentOf( socket.color );
			var socketPair = gameSockets[ messageData.gameId ];
			var opponentSocket = socketPair[ opponentColor ];
			if( !opponentSocket && !gameState.againstComputer )
			{
				socket.emit( 'message', { 'type' : 'error', 'reason' : 'Opponent not connected/identified.' } );
				return;
			}
				
			result = gameState.TakeTurn( messageData.moveSequence, true );
			if( result !== 'SUCCESS' )
			{
				socket.emit( 'message', { 'type' : 'error', 'reason' : 'Internal error: ' + result } );
				return;
			}
			
			var messageData = { 'type' : 'execute move sequence', 'moveSequence' : messageData.moveSequence };
			socket.emit( 'message', messageData );
			if( opponentSocket )
				opponentSocket.emit( 'message', messageData );
			
			var winner = gameState.Winner();
			if( winner )
			{
				messageData = { 'type' : 'game over', 'winner' : winner };
				socket.emit( 'message', messageData );
				if( opponentSocket )
					opponentSocket.emit( 'message', messageData );
			}
			else if( gameState.againstComputer )
			{
				var TimeoutCallback = function()
				{
					// Are socket emissions guarenteed to be received in order?!
					var computerMoveSequence = gameState.FormulateTurn();
					if( !computerMoveSequence )		// Computer admits defeat if it can't come up with a move sequence.
						socket.emit( 'message', { 'type' : 'game over', 'winner' : socket.color } );
					else
					{
						result = gameState.TakeTurn( computerMoveSequence, true );
						if( result !== 'SUCCESS' )
							socket.emit( 'message', { 'type' : 'error', 'reason' : 'Failed to apply computer-generated move sequence: ' + result } );
						else
						{
							messageData = { 'type' : 'execute move sequence', 'moveSequence' : computerMoveSequence };
							socket.emit( 'message', messageData );
							winner = gameState.Winner();
							if( winner )
								socket.emit( 'message', { 'type' : 'game over', 'winner' : winner } );
						}
					}
				}
				
				setTimeout( TimeoutCallback, 1000 );				
			}
		}
	}
	
	socket.on( 'message', OnSocketReceiveMessage );
	socket.on( 'disconnect', OnSocketDisconnect );
	socket.emit( 'message', { 'type' : 'identify yourself' } );
}

var server = http.createServer( ServerCallback );

var hostname = '127.0.0.1';
var port = process.env.PORT || 5000;

server.listen( port ); //, hostname );

var io = sockIO.listen( server );
io.sockets.on( 'connection', OnSocketConnection );

console.log( 'Checkers server running on host ' + hostname + ':' + port );
