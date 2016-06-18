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
var shared = require( './CheckersShared' );

// When jsdom loads our HTML templates, try to have it ignore the <script> tags.  Is this necessary?
jsdom.defaultDocumentFeatures.FetchExternalResources = false;
jsdom.defaultDocumentFeatures.ProcessExternalResources = false;

var nextGameId = 1;
var gamesWaiting = {};
var gamesPlaying = {};

/*
 * This is where we serve requests from the browser client.
 */
var ServerCallback = function( request, result )
{
	try
	{
		var urlData = url.parse( request.url );

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
					var listHtml = '<p>Following is a list of games with players waiting for an opponent.</p>\n';

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
			var jsonData = JSON.stringify( { 'gameId' : gameId, 'color' : 'black' } );
			
			gamesWaiting[ gameId ] = new shared.CheckersGame();
			
			result.writeHead( 200, { 'Content-Type' : 'text/json' } );
			result.end( jsonData );
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

var server = http.createServer( ServerCallback );

var hostname = '127.0.0.1';
var port = 3000;

server.listen( port, hostname );

console.log( 'Checkers server running on host ' + hostname + ':' + port );
