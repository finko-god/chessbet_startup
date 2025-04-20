'use client';

import { Chess } from 'chess.js';
import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';

export function ChessboardComponent() {
  const [game] = useState(new Chess())
  const [boardWidth, setBoardWidth] = useState(400)

  useEffect(() => {
    const updateBoardWidth = () => {
      const isMobile = window.innerWidth < 768
      setBoardWidth(isMobile ? 280 : 400)
    }

    updateBoardWidth()
    window.addEventListener('resize', updateBoardWidth)
    return () => window.removeEventListener('resize', updateBoardWidth)
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Chessboard 
        position={game.fen()}
        boardWidth={boardWidth}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
        }}
        customDarkSquareStyle={{ backgroundColor: '#779556' }}
        customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
      />
    </div>
  )
}


