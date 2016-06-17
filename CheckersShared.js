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
				
				boardElement.occupant = occupant;
			}
			
			this.boardMatrix[ row ][ col ] = boardElement;
		}
	}
}

/*
 * A method for changing the board state according to the legal moves of the game.
 */
CheckersGame.prototype.TakeTurn = function( source, target )
{
	try
	{
		var sourceBoardElement = this.boardMatrix[ source.row ][ source.col ];
		var sourceOccupant = sourceBoardElement.occupant;
		
		if( !sourceOccupant )
			throw 'No source occupant found.';
		
		if( sourceOccupant.color !== this.whosTurn )
			throw 'It is not ' + sourceOccupant.color + '\'s turn yet.';
		
		var targetBoardElement = this.boardMatrix[ target.row ][ target.col ];
		var targetOccupant = targetBoardElement.occupant;
		
		if( targetOccupant )
			throw 'Cannot move into occupied board location.';
		
		if( sourceOccupant.type === 'man' )
		{
			if( ( sourceOccupant.color === 'black' && sourceBoardElement.row > targetBoardElement.row ) ||
				( sourceOccupant.color === 'red' && sourceBoardElement.row < targetBoardElement.row ) )
			{
				throw 'Only kings may move backwards.';
			}
		}
		
		var rowDelta = targetBoardElement.row - sourceBoardElement.row;
		var colDelta = targetBoardElement.col - sourceBoardElement.col;
		
		if( Math.abs( rowDelta ) != Math.abs( colDelta ) )
			throw 'You can only move diagonally.';
		
		if( Math.abs( rowDelta ) > 2 )
			throw 'You cannot move that far.';
		
		var jumpedBoardElement = null;
		var jumpedOccupant = null;
		
		if( Math.abs( rowDelta ) === 2 )
		{
			jumpedBoardElement = this.boardMatrix[ sourceBoardElement.row + rowDelta / 2 ][ sourceBoardElement.col + colDelta / 2 ];
			jumpedOccupant = jumpedBoardElement.occupant;
			
			if( !jumpedOccupant )
				throw 'You can\'t move that far unless you jump an opponent.';
			
			if( jumpedOccupant.color !== OpponentOf( sourceOccupant.color ) )
				throw 'You can only jump an opponent.';
		}
		
		// At last, we have determined that we can make the move.  Make it!
		
		sourceBoardElement.occupant = null;
		targetBoardElement.occupant = sourceOccupant;
		
		if( jumpedOccupant )
		{
			this.captures[ jumpedOccupant.color ]++;
			jumpedBoardElement.occupant = null;
		}
		
		if( sourceOccupant.type === 'man' )
		{
			if( ( sourceOccupant.color === 'black' && targetBoardElement.row === checkerBoardRows - 1 ) ||
				( sourceOccupant.color === 'red' && targetBoardElement.row === 0 ) )
			{
				sourceOccupant.type = 'king';
			}
		}
		
		this.whosTurn = OpponentOf( this.whosTurn );
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