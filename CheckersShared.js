/*
 * CheckersShared.js
 *
 * This is code shared between the client and the server.
 */

'use strict';

var checkerBoardRows = 10;
var checkerBoardCols = 10;
 
/*
 * Make a deep copy of the given object.
 */
function CopyObject( object )
{
	if( object === undefined || object === null )
		return object;
	
	var objectType = typeof( object );
	
	if( objectType === 'object' )
	{
		var objectCopy = Object.create( Object.getPrototypeOf( object ) );
		
		for( var property in object )
		{
			if( !object.hasOwnProperty( property ) )
				continue;
			
			if( typeof( object[ property ] ) === 'function' )
				continue;
			
			objectCopy[ property ] = CopyObject( object[ property ] );
		}
		
		return objectCopy;
	}
	
	return object;
}
 
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
 * This is effectively a 180-degree rotation of the board.
 */
function FlipLocation( boardLocation )
{
	boardLocation.row = checkerBoardRows - 1 - boardLocation.row;
	boardLocation.col = checkerBoardCols - 1 - boardLocation.col;
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
 * The winner captures all of his/her opponent's board pieces first.
 */
CheckersGame.prototype.Winner = function()
{
	if( this.captures[ 'red' ] == 20 )
		return 'red';
	
	if( this.captures[ 'black' ] == 20 )
		return 'black';
	
	return null;
}

/*
 * Tell us if the given occupant can go in the given direction.
 */
CheckersGame.prototype.RowDeltaOkay = function( rowDelta, boardOccupant )
{
	if( boardOccupant.type === 'man' )
	{
		if( ( boardOccupant.color === 'red' && rowDelta > 0 ) ||
			( boardOccupant.color === 'black' && rowDelta < 0 ) )
		{
			return false;
		}
	}
	
	return true;
}

/*
 * Tell us if the occupant at the given board element can jump an adjacent piece.
 */
CheckersGame.prototype.BoardOccupantCanStrike = function( boardElement )
{
	var boardOccupant = boardElement.occupant;
	if( !boardOccupant )
		return false;
	
	for( var rowDelta = -2; rowDelta <= 2; rowDelta += 4 )
	{
		var rowLand = boardElement.row + rowDelta;
		if( rowLand < 0 || rowLand >= checkerBoardRows )
			continue;
		
		if( !this.RowDeltaOkay( rowDelta, boardOccupant ) )
			continue;
		
		for( var colDelta = -2; colDelta <= 2; colDelta += 4 )
		{
			var colLand = boardElement.col + colDelta;
			if( colLand < 0 || colLand >= checkerBoardCols )
				continue;
			
			if( this.boardMatrix[ rowLand ][ colLand ].occupant )
				continue;
			
			var jumpedRow = boardElement.row + rowDelta / 2;
			var jumpedCol = boardElement.col + colDelta / 2;
			
			var jumpedBoardElement = this.boardMatrix[ jumpedRow ][ jumpedCol ];
			var jumpedBoardOccupant = jumpedBoardElement.occupant;
			
			if( jumpedBoardOccupant && jumpedBoardOccupant.color === OpponentOf( boardOccupant.color ) )
				return true;
		}
	}
	
	return false;
}

/*
 * A method for changing the board state according to the legal moves of the game.
 */
CheckersGame.prototype.TakeTurn = function( moveSequence, execute )
{
	try
	{
		if( moveSequence.length < 2 )
			throw 'A valid move sequences consists of at least two board locations.';
		
		/*
		 * Bounds-check all board locations in the given sequence.
		 */
		
		for( var i = 0; i < moveSequence.length; i++ )
		{
			var boardLocation = moveSequence[i];
			
			if( boardLocation.row < 0 || boardLocation.row >= checkerBoardRows ||
				boardLocation.col < 0 || boardLocation.col >= checkerBoardCols )
			{
				throw 'Out-of-bounds error.';
			}
		}
		
		/*
		 * Make sure we're only move a piece who's turn it is.
		 */
		
		var sourceBoardLocation = moveSequence[0];
		var sourceBoardElement = this.boardMatrix[ sourceBoardLocation.row ][ sourceBoardLocation.col ];
		var sourceOccupant = sourceBoardElement.occupant;
		
		if( !sourceOccupant )
			throw 'No source occupant found.';
		
		if( sourceOccupant.color !== this.whosTurn )
			throw 'It is not yet ' + sourceOccupant.color + '\'s turn.';

		/*
		 * We can only jump to vacant locations.
		 */
		
		for( var i = 1; i < moveSequence.length; i++ )
		{
			var boardLocation = moveSequence[i];
			var boardElement = this.boardMatrix[ boardLocation.row ][ boardLocation.col ];
			var boardOccupant = boardElement.occupant;
			
			if( boardOccupant )
				throw 'You cannot move into an already-occupied board location.';
		}
		
		/*
		 * Gather the jumped board locations, if any, and vet a multi/single-jump sequence.
		 */
		
		var jumpedLocationSequence = [];
		
		for( var i = 0; i < moveSequence.length - 1; i++ )
		{
			var prevBoardLocation = moveSequence[ i + 0 ];
			var nextBoardLocation = moveSequence[ i + 1 ];
			
			var rowDelta = nextBoardLocation.row - prevBoardLocation.row;
			var colDelta = nextBoardLocation.col - prevBoardLocation.col;
			
			if( Math.abs( rowDelta ) !== Math.abs( colDelta ) )
				throw 'You can only move diagonally';
			
			if( Math.abs( rowDelta ) === 1 && moveSequence.length > 2 )
				throw 'Single-jump moves can only be done one turn at a time.';
			
			if( !this.RowDeltaOkay( rowDelta, sourceOccupant ) )
				throw 'Only kings may retreat back into their own territory.';
			
			if( Math.abs( rowDelta ) === 2 )
			{
				var jumpedBoardLocation = { 'row' : ( prevBoardLocation.row + rowDelta / 2 ), 'col' : ( prevBoardLocation.col + colDelta / 2 ) };
				var jumpedBoardElement = this.boardMatrix[ jumpedBoardLocation.row ][ jumpedBoardLocation.col ];
				var jumpedOccupant = jumpedBoardElement.occupant;
					
				if( !jumpedOccupant )
					throw 'A double-jump can only be made over an opponent\'s piece, not over a vaccant board location.';
					
				if( jumpedOccupant.color !== OpponentOf( sourceOccupant.color ) )
					throw 'You can only jump an opponent\'s game piece, not your own.';
				
				// This makes us O(n^2) when we could be O(n ln n), but a sequence should never be big enough for us to care.
				for( var j = 0; j < jumpedLocationSequence.length; j++ )
				{
					var alreadyJumpedBoardLocation = jumpedLocationSequence[j];
					
					if( alreadyJumpedBoardLocation.row === jumpedBoardLocation.row &&
						alreadyJumpedBoardLocation.col === jumpedBoardLocation.col )
					{
						throw 'You cannot jump the same board location more than once.';
					}
				}
				
				jumpedLocationSequence.push( jumpedBoardLocation );
			}
			else if( Math.abs( rowDelta ) > 2 )
			{
				throw 'You cannot jump farther than a double-jump.';
			}
		}
		
		/*
		 * At this point we have fully vetted the move and are ready to execute it.
		 */
		
		if( !execute )
			return 'SUCCESS';
		
		/*
		 * The first thing we do is forfeit any piece, except the one moved, that we
		 * didn't use that could have been used to jump one of our opponent's peices.
		 * But I think we only do this if we didn't jump any pieces on our turn.
		 */
		
		if( jumpedLocationSequence.length == 0 )
		{
			/* I'm going to ignore this rule for now.
			for( var row = 0; row < checkerBoardRows; row++ )
			{
				for( var col = 0; col < checkerBoardCols; col++ )
				{
					var boardElement = this.boardMatrix[ row ][ col ];
					var boardOccupant = boardElement.occupant;
					
					if( boardOccupant && boardOccupant.color === this.whosTurn )
					{
						if( boardOccupant === sourceOccupant )
							continue;
						
						if( this.BoardOccupantCanStrike( boardElement ) )
						{
							boardElement.occupant = null;
							this.captures[ OpponentOf( this.whosTurn ) ]++;
						}
					}
				}
			}
			*/
		}
		
		var targetBoardLocation = moveSequence[ moveSequence.length - 1 ];
		var targetBoardElement = this.boardMatrix[ targetBoardLocation.row ][ targetBoardLocation.col ];
		
		targetBoardElement.occupant = sourceOccupant;
		sourceBoardElement.occupant = null;
		
		this.captures[ this.whosTurn ] += jumpedLocationSequence.length;
		
		for( var i = 0; i < jumpedLocationSequence.length; i++ )
		{
			var jumpedBoardLocation = jumpedLocationSequence[i];
			var jumpedBoardElement = this.boardMatrix[ jumpedBoardLocation.row ][ jumpedBoardLocation.col ];
			
			jumpedBoardElement.occupant = null;
		}
		
		/*
		 * Men who reach the other side become kings.
		 */
		
		if( sourceOccupant.type === 'man' )
		{
			if( ( sourceOccupant.color === 'black' && targetBoardElement.row === checkerBoardRows - 1 ) ||
				( sourceOccupant.color === 'red' && targetBoardElement.row === 0 ) )
			{
				sourceOccupant.type = 'king';
			}
		}
		
		/*
		 * Lastly, change who's turn it is.
		 */
		
		this.whosTurn = OpponentOf( this.whosTurn );
	}
	catch( error )
	{
		return error;
	}
	
	return 'SUCCESS';
}

/*
 * This is the entry-point for the computer's attempt at coming up with a good move.
 */
CheckersGame.prototype.FormulateTurn = function()
{
	var opponentColor = OpponentOf( this.whosTurn );
	var self = this;
	
	var maxDecisionPathLength = 4;
	var decisionScoreMap = {};
	
	var OutcomeCallback = function( decisionPath, gameStateCopy )
	{
		if( decisionPath.length == 0 )
			return;
		
		var goodCaptureCount = gameStateCopy.captures[ self.whosTurn ] - self.captures[ self.whosTurn ];
		var badCaptureCount = gameStateCopy.captures[ opponentColor ] - self.captures[ opponentColor ];
		var decisionScore = ( goodCaptureCount - badCaptureCount ) * 100 + ( maxDecisionPathLength - decisionPath.length );
		
		var i = decisionPath[0];
		
		if( !decisionScoreMap[i] )
			decisionScoreMap[i] = 0;
		
		if( decisionScoreMap[i] < decisionScore )		
			decisionScoreMap[i] = decisionScore;
	}
	
	var decisionPath = [];
	
	try
	{
		this.ExploreOutcomes( decisionPath, maxDecisionPathLength, OutcomeCallback );
	}
	catch( error )
	{
		return null;
	}
	
	var bestImmediateDecision = -1;
	for( var i in decisionScoreMap )
		if( bestImmediateDecision == -1 || decisionScoreMap[ bestImmediateDecision ] < decisionScoreMap[i] )
			bestImmediateDecision = i;
	
	if( bestImmediateDecision === -1 )
		return null;
	
	var possibleMoveSequences = this.GenerateAllPossibleMoveSequences();
	
	return possibleMoveSequences[ bestImmediateDecision ];
}

/*
 * Recursively explore all possible outcomes of the game to a given depth.
 */
CheckersGame.prototype.ExploreOutcomes = function( decisionPath, maxDecisionPathLength, OutcomeCallback )
{
	if( decisionPath.length === maxDecisionPathLength || this.Winner() !== null )
		OutcomeCallback( decisionPath, this );
	else
	{	
		var possibleMoveSequences = this.GenerateAllPossibleMoveSequences();
		
		for( var i = 0; i < possibleMoveSequences.length; i++ )
		{
			var gameStateCopy = CopyObject( this );
		
			var result = gameStateCopy.TakeTurn( possibleMoveSequences[i], true );
			if( result !== 'SUCCESS' )
				throw 'Internal error!';
			
			decisionPath.push(i);
			gameStateCopy.ExploreOutcomes( decisionPath, maxDecisionPathLength, OutcomeCallback );
			decisionPath.pop();
		}
	}
}

/*
 * Generate all possible move sequences of the game in its current state for player who's turn it currently is.
 */
CheckersGame.prototype.GenerateAllPossibleMoveSequences = function()
{
	var possibleMoveSequences = [];
	
	for( var row = 0; row < checkerBoardRows; row++ )
	{
		for( var col = 0; col < checkerBoardCols; col++ )
		{
			var boardElement = this.boardMatrix[ row ][ col ];
			
			var boardOccupant = boardElement.occupant;
			if( !boardOccupant || boardOccupant.color !== this.whosTurn )
				continue;
			
			var moveSequence = [ { 'row' : boardElement.row, 'col' : boardElement.col } ];
			this.AccumulateMoveSequencesRecursively( moveSequence, possibleMoveSequences, boardOccupant );
		}
	}
	
	return possibleMoveSequences;
}

/*
 * This is used exclusively by the 'GenerateAllPossibleMoveSequences' method.
 */
CheckersGame.prototype.AccumulateMoveSequencesRecursively = function( moveSequence, possibleMoveSequences, boardOccupant )
{
	var length = moveSequence.length;
	if( length >= 2 )
	{
		var mapCallback = function( boardLocation ) { return { 'row' : boardLocation.row, 'col' : boardLocation.col }; }
		var moveSequenceCopy = moveSequence.map( mapCallback );
		possibleMoveSequences.push( moveSequenceCopy );
	}
	
	var currentRow = moveSequence[ length - 1 ].row;
	var currentCol = moveSequence[ length - 1 ].col;
	
	if( moveSequence.length === 1 )
	{	
		for( var rowDelta = -1; rowDelta <= 1; rowDelta += 2 )
		{
			var rowLand = currentRow + rowDelta;
			if( rowLand < 0 || rowLand >= checkerBoardRows )
				continue;
			
			if( !this.RowDeltaOkay( rowDelta, boardOccupant ) )
				continue;
			
			for( var colDelta = -1; colDelta <= 1; colDelta += 2 )
			{
				var colLand = currentCol + colDelta;
				if( colLand < 0 || colLand >= checkerBoardCols )
					continue;
				
				var boardElement = this.boardMatrix[ rowLand ][ colLand ];
				if( !boardElement.occupant )
				{
					moveSequence.push( { 'row' : rowLand, 'col' : colLand } );
					this.AccumulateMoveSequencesRecursively( moveSequence, possibleMoveSequences, boardOccupant );
					moveSequence.pop();
				}
			}
		}
	}
	
	if( length === 1 || Math.abs( moveSequence[ length - 1 ].row - moveSequence[ length - 2 ].row ) > 1 )
	{
		for( var rowDelta = -2; rowDelta <= 2; rowDelta += 4 )
		{
			var rowLand = currentRow + rowDelta;
			if( rowLand < 0 || rowLand >= checkerBoardRows )
				continue;
			
			if( !this.RowDeltaOkay( rowDelta, boardOccupant ) )
				continue;
			
			for( var colDelta = -2; colDelta <= 2; colDelta += 4 )
			{
				var colLand = currentCol + colDelta;
				if( colLand < 0 || colLand >= checkerBoardCols )
					continue;
				
				var boardElement = this.boardMatrix[ rowLand ][ colLand ];
				if( boardElement.occupant )
					continue;
				
				var jumpedBoardElement = this.boardMatrix[ currentRow + rowDelta / 2 ][ currentCol + colDelta / 2 ];
				var jumpedBoardOccupant = jumpedBoardElement.occupant;
				if( !jumpedBoardOccupant || jumpedBoardOccupant.color !== OpponentOf( this.whosTurn ) )
					continue;
				
				var locationRepeated = false;
				var boardLocation = { 'row' : rowLand, 'col' : colLand };
				for( var i = 0; i < length && !locationRepeated; i++ )
					if( moveSequence[i].row === boardLocation.row && moveSequence[i].col === boardLocation.col )
						locationRepeated = true;
				
				if( locationRepeated )
					continue;
				
				moveSequence.push( boardLocation );
				this.AccumulateMoveSequencesRecursively( moveSequence, possibleMoveSequences, boardOccupant );
				moveSequence.pop();
			}
		}
	}
}

/*
 * This function is a lame hack necessitated by the inability to store a
 * JavaScript object in the session storage space.  Only primitives are
 * aloud, so the object must be serialized and then deserialized as a string.
 * Consequently, methods are not preserved.  jStorage may be a solution,
 * but for now, I'm going to work around the issue.
 */
var RestoreMethods = function( gameState )
{
	Object.setPrototypeOf( gameState, CheckersGame.prototype );
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
		'OpponentOf' : OpponentOf,
		'RestoreMethods' : RestoreMethods
	};
}