/*
 * CheckersClientGame.js
 *
 * Here we implement the checkers game client-side.
 */

var gl = null;

function LoadShader( shaderSource, shaderType )
{
	var shader = gl.createShader( shaderType );
	
	gl.shaderSource( shader, shaderSource );
	gl.compileShader( shader );
	
	if( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) )
	{
		var error = gl.getShaderInfoLog( shader );
		gl.deleteShader( shader );
		throw error.toString();
	}
	
	return shader;
}

function LoadProgram( vertexShaderSource, fragmentShaderSource )
{
	var vertexShader = LoadShader( vertexShaderSource, gl.VERTEX_SHADER );
	var fragmentShader = LoadShader( fragmentShaderSource, gl.FRAGMENT_SHADER );
	
	var program = gl.createProgram();
	
	gl.attachShader( program, vertexShader );
	gl.attachShader( program, fragmentShader );
	
	gl.linkProgram( program );
	
	if( !gl.getProgramParameter( program, gl.LINK_STATUS ) )
	{
		var error = gl.getProgramInfoLog( program );
		gl.deleteProgram( program );
		throw error.toString();
	}
	
	return program;
}

var textureLoadCount = 0;

function LoadTexture( textureObject )
{
	textureObject.texture = gl.createTexture();
	textureObject.image = new Image();
	textureObject.image.onload = function()
	{
		gl.bindTexture( gl.TEXTURE_2D, textureObject.texture );
		//gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObject.image );		// Note: For security reasons, this only works when files are being served by a web-server.  I don't understand all the details.
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		
		// This is super lame, but it appears to be the standard way of doing things in JavaScript land (not surprisingly.)
		// If we were doing ajax calls to get the texture data, then we could replace this hack with the 'Promises' technique of ES6.
		if( ++textureLoadCount >= 7 )
		{
			// All textures have loaded, we can now render.
			RenderCheckerBoard();
		}
	}
	
	textureObject.image.src = textureObject.source;
}

var boardVertexAndShaderProgram = null;
var boardQuadVertexBuffer = null;
var boardQuadTexCoordBuffer = null;
var boardWhiteTileTextureObject = { 'source' : 'WhiteMarble.png' };
var boardBlackTileTextureObject = { 'source' : 'BlackMarble.png' };
var boardRedManPieceTextureObject = { 'source' : 'RedManPiece.png' };
var boardRedKingPieceTextureObject = { 'source' : 'RedKingPiece.png' };
var boardBlackManPieceTextureObject = { 'source' : 'BlackManPiece.png' };
var boardBlackKingPieceTextureObject = { 'source' : 'BlackKingPiece.png' };
var boardSelectedTextureObject = { 'source' : 'Selected.png' };
var boardSelectionSequence = null;

function RenderBoardQuad( row, col, textureObject )
{
	if( !boardVertexAndShaderProgram )
		return false;
	
	gl.useProgram( boardVertexAndShaderProgram );
	
	var rowUniformLocation = gl.getUniformLocation( boardVertexAndShaderProgram, 'row' );
	var colUniformLocation = gl.getUniformLocation( boardVertexAndShaderProgram, 'col' );
	
	gl.uniform1i( rowUniformLocation, row );
	gl.uniform1i( colUniformLocation, col );
	
	if( boardQuadVertexBuffer )
		gl.bindBuffer( gl.ARRAY_BUFFER, boardQuadVertexBuffer );	
	else
	{
		boardQuadVertexBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, boardQuadVertexBuffer );
	
		// Our object space is always a full-screen quad in clip-space.
		var vertexData =
		[
			-1.0, -1.0,
			1.0, -1.0,
			-1.0, 1.0,
			-1.0, 1.0,
			1.0, -1.0,
			1.0, 1.0
		];
	
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertexData ), gl.STATIC_DRAW );
		
		var vertexAttributeLocation = gl.getAttribLocation( boardVertexAndShaderProgram, 'vertex' );
		gl.enableVertexAttribArray( vertexAttributeLocation );
		gl.vertexAttribPointer( vertexAttributeLocation, 2, gl.FLOAT, false, 0, 0 );
	}
	
	if( boardQuadTexCoordBuffer )
		gl.bindBuffer( gl.ARRAY_BUFFER, boardQuadTexCoordBuffer );
	else
	{
		boardQuadTexCoordBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, boardQuadTexCoordBuffer );
		
		var texCoordData =
		[
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0
		];
		
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( texCoordData ), gl.STATIC_DRAW );
		
		var texCoordAttributeLocation = gl.getAttribLocation( boardVertexAndShaderProgram, 'texCoord' );
		gl.enableVertexAttribArray( texCoordAttributeLocation );
		gl.vertexAttribPointer( texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0 );
	}
	
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, textureObject.texture );
	
	var texSamplerUniformLocation = gl.getUniformLocation( boardVertexAndShaderProgram, 'texSampler' );
	gl.uniform1i( texSamplerUniformLocation, 0 );
	
	gl.drawArrays( gl.TRIANGLES, 0, 6 );
}

function RenderCheckerBoard()
{
	if( !gl )
		return;
	
	gl.clear( gl.COLOR_BUFFER_BIT );
	
	// We're not concerned with any real-time animation, so this is okay.
	var gameState = JSON.parse( window.sessionStorage.gameState );
	if( !gameState )
		return;
	
	for( var row = 0; row < checkerBoardRows; row++ )
	{
		for( var col = 0; col < checkerBoardCols; col++ )
		{
			var textureObject = null;
			var boardElement = gameState.boardMatrix[ row ][ col ];
			if( boardElement.color == 'white' )
				textureObject = boardWhiteTileTextureObject;
			else if( boardElement.color == 'black' )
				textureObject = boardBlackTileTextureObject;
			
			if( textureObject )
				RenderBoardQuad( row, col, textureObject );
			
			if( boardElement.occupant )
			{
				textureObject = null;
				
				if( boardElement.occupant.color === 'black' )
				{
					if( boardElement.occupant.type === 'man' )
						textureObject = boardBlackManPieceTextureObject;
					else if( boardElement.occupant.type === 'king' )
						textureObject = boardBlackKingPieceTextureObject;
				}
				else if( boardElement.occupant.color === 'red' )
				{
					if( boardElement.occupant.type === 'man' )
						textureObject = boardRedManPieceTextureObject;
					else if( boardElement.occupant.type === 'king' )
						textureObject = boardRedKingPieceTextureObject;
				}
				
				if( textureObject )
					RenderBoardQuad( row, col, textureObject );
			}
		}
	}
	
	if( boardSelectionSequence )
	{
		// TODO: It might be nice if we rendered the numbers of the sequence.
		for( var i = 0; i < boardSelectionSequence.length; i++ )
		{
			var boardLocation = boardSelectionSequence[i];
			
			RenderBoardQuad( boardLocation.row, boardLocation.col, boardSelectedTextureObject );
		}
	}
}

var OnCanvasClicked = function( event )
{
	var canvas = document.getElementById( "canvas" );
	
	var boardLocation =
	{
		'row' : Math.floor( ( event.offsetY / canvas.height ) * 10.0 ),
		'col' : Math.floor( ( event.offsetX / canvas.width ) * 10.0 )
	};
	
	// Only allow selection of the black tiles.
	if( ( boardLocation.row + boardLocation.col ) % 2 == 0 )
		return;
	
	if( !boardSelectionSequence )
		boardSelectionSequence = [];
	
	boardSelectionSequence.push( boardLocation );
	
	RenderCheckerBoard();
}

var OnClearSelection = function()
{
	boardSelectionSequence = undefined;
	
	RenderCheckerBoard();
}

var OnTakeTurn = function()
{
	alert( 'Not yet implemented!' );
}

var OnDocumentReady = function()
{
	try
	{
		var canvas = document.getElementById( "canvas" );
	
		if( gl )
			throw 'GL context already initialized.';
		
		gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		
		if( !gl )
			throw 'WebGL is not available/working.';
		
		var boardVertexShaderSource = document.getElementById( "boardVertexShader" ).firstChild.textContent;
		var boardFragmentShaderSource = document.getElementById( "boardFragmentShader" ).firstChild.textContent;
		
		boardVertexAndShaderProgram = LoadProgram( boardVertexShaderSource, boardFragmentShaderSource );
		
		LoadTexture( boardWhiteTileTextureObject );
		LoadTexture( boardBlackTileTextureObject );
		LoadTexture( boardRedManPieceTextureObject );
		LoadTexture( boardRedKingPieceTextureObject );
		LoadTexture( boardBlackManPieceTextureObject );
		LoadTexture( boardBlackKingPieceTextureObject );
		LoadTexture( boardSelectedTextureObject );
		
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
		gl.disable( gl.DEPTH_TEST );
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
		
		$( "#canvas" ).click( OnCanvasClicked );
	}
	catch( error )
	{
		alert( 'Error: ' + error.toString() );
	}
}

$( document ).ready( OnDocumentReady );