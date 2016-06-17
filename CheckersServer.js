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

var nextGameId = 0;
var gamesWaiting = {};
var gamesPlaying = {};

/*
 * This is where we serve requests from the browser client.
 */
var ServerCallback = function( request, result )
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
				var listHtml = '<p>Following is a list of players waiting for an opponent.</p>\n';

				listHtml += '<ol>\n';

				for( var gameId in gamesWaiting )
					listHtml += '\t<li><span class="joingGame"><a id="' + gameId.toString() + '" href="">Game ' + gameId.toString() + '</a></span></li>\n';

				listHtml += '</ol>\n';

				waitingListElement.innerHTML = listHtml;
			}

			htmlPage = window.document.documentElement.outerHTML;

			result.writeHead( 200, { 'Content-type' : 'text/html' } );
			result.end( htmlPage );
		}

		jsdom.env( htmlPage, [ 'http://code.jquery.com/jquery.js' ], JsdomCallback );
	}
	else if( /checkersclient/i.exec( request.url ) )
	{
		var clientSource = fs.readFileSync( 'CheckersClient.js', 'utf8' );
		result.writeHead( 200, { 'Content-Type' : 'text/plain' } );
		result.end( clientSource );
	}
	else
	{
		result.writeHead( 404, { 'Content-Type' : 'text/plain' } );
		result.end( 'Page not found!\n' );
	}
}

var server = http.createServer( ServerCallback );

var hostname = '127.0.0.1';
var port = 3000;

server.listen( port, hostname );

console.log( 'Checkers server running on host ' + hostname + ':' + port );
