/*
 * CheckersClient.js
 *
 * Here we implement the checkers game client-side.
 */

// TODO: Can I include the shared JS here and put game state in local storage?

var OnStartNewGameClicked = function()
{
	// TODO: Use ajax to get new gameId, then redirect browser to game page?  Yeah, gameId could fail, in which case we can't redirect.

	// window.sessionStorage.gameId = ...;

	// window.location.replace(...) or window.location.href = ...;?
}

var OnJoinGameClicked = function( event )
{
	// TODO: Get id of event.target as gameId, make ajax request to join that game, keep gameId if joined, then redirect to game page.

	//var $( event.target ).text();
}

var OnDocumentReady = function()
{
	$( '#startNewGame a' ).click( OnStartNewGameClicked );
	$( '.joinGame a' ).click( OnJoinGameClicked );
}

$( document ).ready( OnDocumentReady );