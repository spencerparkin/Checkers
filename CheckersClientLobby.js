/*
 * CheckersClientLobby.js
 *
 * Here we implement the checkers lobby client-side.
 */

 // Note that we must return false here to prevent the default behavior of the hyper-link.
var OnStartNewGameClicked = function( event )
{
	if( window.sessionStorage.newGameRequestInProgress )
		return false;
	
	window.sessionStorage.newGameRequestInProgress = true;
	
	var JsonRequestCallback = function( jsonData )
	{
		if( jsonData.gameId )
		{
			// Note that sadly we can't store an object in session storage without seralizing it to a string.
			// The deserialization process may not preserve the methods we have defined on the object either.
			var gameState = new CheckersGame();
			
			window.sessionStorage.gameId = jsonData.gameId;
			window.sessionStorage.color = jsonData.color;
			window.sessionStorage.gameState = JSON.stringify( gameState );
			window.location.replace( '/game' );
		}
		else
		{
			alert( 'Failed to request new checkers game.' );
			window.location.reload();
		}
		
		window.sessionStorage.newGameRequestInProgress = false;
	}
	
	$.getJSON( 'NewGame.json', JsonRequestCallback );
	
	return false;
}

var OnJoinGameClicked = function( event )
{
	if( window.sessionStorage.gameId && window.sessionStorage.gameId > 0 )
	{
		alert( 'You have already joined/started a game.' );
		window.location.replace( '/game' );
		return false;
	}
	
	if( window.sessionStorage.joinGameRequestInProgress )
		return false;
	
	window.sessionStorage.joinGameRequestInProgress = true;
	
	var gameId = parseInt( event.target.id );
	
	var JsonRequestCallback = function( jsonData )
	{
		if( jsonData.join )
		{
			var gameState = new CheckersGame();
			
			window.sessionStorage.gameId = gameId;
			window.sessionStorage.color = jsonData.color;
			window.sessionStorage.gameState = JSON.stringify( gameState );
			window.location.replace( '/game' );
		}
		else
		{
			alert( 'Failed to join existing checkers game.' );
			window.location.reload();
		}
		
		window.sessionStorage.newGameRequestInProgress = false;
	}
	
	$.getJSON( 'JoinGame.json', 'gameId=' + gameId, JsonRequestCallback );
	
	return false;
}

var OnDocumentReady = function()
{
	var gameId = window.sessionStorage.gameId;
	if( window.sessionStorage.gameId && window.sessionStorage.gameId > 0 )
	{
		window.location.replace( '/game' );
		return;
	}
	
	//$( '#startNewGame a' ).click( OnStartNewGameClicked );	// This doesn't work on Heroku.
	$( '.joinGame a' ).click( OnJoinGameClicked );
}

$( document ).ready( OnDocumentReady );