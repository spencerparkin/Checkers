/*
 * CheckersShared.js
 *
 * This is code shared between the client and the server.
 */

'use strict';

 var checkerBoardRows = 10;
 var checkerBoardCols = 10;
 
/*
 * Determine the given player's opponent.
 */
function OpponentOf( color )
{
	if( color === 'red' )
		return 'black';
	
	if( color === 'black' )
		return 'red';
	
	return '?';
}
 
/*
 * A constructor for the checkers game state.
 */ 
function CheckersGame()
{
	this.whosTurn = 'red';
	this.captures = { 'red' : 0, 'black' : 0 };
	this.boardMatrix = [];
	
	for( var row = 0; row < checkerBoardRows; row++ )
	{
		this.boardMatrix[ row ] = [];
		
		for( var col = 0; col < checkerBoardCols; col++ )
		{
			var boardElement = { 'row' : row, 'col' : col };
			
			boardElement.color = ( ( row + col ) % 2 === 0 ) ? 'white' : 'black';
			
			boardElement.occupant = null;
			
			if( boardElement.color === 'black' )
			{
				var occupant = { 'type' : 'man' };
				
				if( row < 4  )
					occupant.color = 'black';
				else if( row > 5 )
					occupant.color = 'red';
				
				if( occupant.color )
					boardElement.occupant = occupant;
			}
			
			this.boardMatrix[ row ][ col ] = boardElement;
		}
	}
}

/*
 * A method for changing the board state according to the legal moves of the game.
 * A valid sequence accounts for legal direction and does not jump any location more
 * than once.  Before ending a player's turn, he loses all pieces that didn't jump an
 * opponent's piece that could have done so.
 */
CheckersGame.prototype.TakeTurn = function( moveSequence )
{
	try
	{
		// TODO: Rewrite this in terms of the given moveSequence.
	}
	catch( error )
	{
		return error;
	}
	
	return 'SUCCESS';
}

/*
 * When being used server-side, we're exposed as a module.
 * When used client-side, we can ignore this.
 */
var typeofModule = typeof( module );
if( typeofModule !== 'undefined' )
{
	module.exports =
	{
		'CheckersGame' : CheckersGame,
		'OpponentOf' : OpponentOf
	};
}