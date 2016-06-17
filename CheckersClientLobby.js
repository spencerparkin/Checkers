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
		}
		
		window.sessionStorage.newGameRequestInProgress = false;
	}
	
	$.getJSON( "NewGame.json", JsonRequestCallback );
	
	return false;
}

var OnJoinGameClicked = function( event )
{
	window.sessionStorage.joinGameRequestInProgress = true;
	
	var gameId; // use jquery to get gameId in hyperlink.
	
	// TODO: Get id of event.target as gameId, make ajax request to join that game, keep gameId if joined, then redirect to game page.
	// if fail, refresh current page; someone else may have accepted before us.
	//var $( event.target ).text();
	//corner-case: can't join own game we started...but we'll be on a different page, but account for it anyway.
}

var OnDocumentReady = function()
{
	$( '#startNewGame a' ).click( OnStartNewGameClicked );
	$( '.joinGame a' ).click( OnJoinGameClicked );
}

$( document ).ready( OnDocumentReady );