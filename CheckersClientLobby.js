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
			window.sessionStorage.gameId = jsonData.gameId;
			window.sessionStorage.color = jsonData.color;
			window.sessionStorage.gameState = new CheckersGame();
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
			window.sessionStorage.gameId = gameId;
			window.sessionStorage.color = jsonData.color;
			window.sessionStorage.gameState = new CheckersGame();
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
	$( '#startNewGame a' ).click( OnStartNewGameClicked );
	$( '.joinGame a' ).click( OnJoinGameClicked );
}

$( document ).ready( OnDocumentReady );