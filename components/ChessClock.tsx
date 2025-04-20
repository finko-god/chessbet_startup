'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { usePusherChannel } from '@/hooks/usePusherChannel';


interface ChessClockProps {
  gameId: string;
  isWhitePlayer: boolean;
  whiteTime: number;
  blackTime: number;
  isWhiteTurn: boolean;
  isGameStarted: boolean;
  onTimeEndAction: (gameId: string, winner: 'white' | 'black') => Promise<void>;
}

export default function ChessClock({
  gameId,
  whiteTime,
  blackTime,
  isWhiteTurn,
  isGameStarted,
  onTimeEndAction,
}: ChessClockProps) {
  const channelName = `private-game-${gameId}`;
  const [whiteTimeLeft, setWhiteTimeLeft] = useState(whiteTime);
  const [blackTimeLeft, setBlackTimeLeft] = useState(blackTime);
  const [isFirstMove, setIsFirstMove] = useState(true);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevWhiteTimeRef = useRef(whiteTime);
  const prevBlackTimeRef = useRef(blackTime);
  const timeEndedRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  
  // Only update state from props on first mount or forced refresh
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      setWhiteTimeLeft(whiteTime);
      setBlackTimeLeft(blackTime);
      prevWhiteTimeRef.current = whiteTime;
      prevBlackTimeRef.current = blackTime;
      initialLoadDoneRef.current = true;
    }
  }, [whiteTime, blackTime]);

  // Pusher integration
  const handleTimeUpdate = useCallback(({ whiteTime, blackTime }: { 
    whiteTime: number
    blackTime: number 
  }) => {
    console.log('Time update received:', whiteTime, blackTime);
    setWhiteTimeLeft(whiteTime);
    setBlackTimeLeft(blackTime);
    // Update local references
    prevWhiteTimeRef.current = whiteTime;
    prevBlackTimeRef.current = blackTime;
  }, []);

  const handleGameEnded = useCallback(({ winner, reason }: { 
    winner: string
    reason: string 
  }) => {
    console.log('Game ended event received:', { winner, reason });
    if (reason === 'time') {
      console.log('Time ran out for player:', winner === 'white' ? 'black' : 'white');
      const isWhiteWinner = winner === 'white';
      onTimeEndAction(gameId, isWhiteWinner ? 'white' : 'black');
      
      // Stop the clock
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsClockRunning(false);
    }
  }, [gameId, onTimeEndAction]);

  const handleMoveEvent = useCallback(({ fen, player1TimeLeft, player2TimeLeft }: { 
    fen: string
    player1TimeLeft: number
    player2TimeLeft: number 
  }) => {
    // Immediately update the time when a move is made
    const isWhiteTurn = fen.split(' ')[1] === 'w';
    if (isWhiteTurn) {
      setBlackTimeLeft(player2TimeLeft);
      prevBlackTimeRef.current = player2TimeLeft;
    } else {
      setWhiteTimeLeft(player1TimeLeft);
      prevWhiteTimeRef.current = player1TimeLeft;
    }
  }, []);

  const eventHandlers = useMemo(() => {
    console.log('Setting up event handlers for channel:', channelName);
    return {
      'time-update': handleTimeUpdate,
      'move-made': handleMoveEvent,
      'game-ended': handleGameEnded
    };
  }, [handleTimeUpdate, handleMoveEvent, handleGameEnded, channelName]);

  usePusherChannel(channelName, eventHandlers);
  
  // Sync local clock with server times when props change
  useEffect(() => {
    if (prevWhiteTimeRef.current !== whiteTime) {
      setWhiteTimeLeft(whiteTime);
      prevWhiteTimeRef.current = whiteTime;
    }
    if (prevBlackTimeRef.current !== blackTime) {
      setBlackTimeLeft(blackTime);
      prevBlackTimeRef.current = blackTime;
    }
  }, [whiteTime, blackTime]);

  // Start clock when game begins or turn changes
  useEffect(() => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset time ended flag when game starts or turn changes
    timeEndedRef.current = false;

    // Don't start clock on first move for white (special case)
    if (isFirstMove && isWhiteTurn) {
      return;
    }

    // Start clock if game is active
    if (isGameStarted) {
      setIsClockRunning(true);
      lastUpdateTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;
        
        if (isWhiteTurn) {
          setWhiteTimeLeft(prev => {
            const newTime = Math.max(0, prev - elapsed);
            // Check for timeout
            if (newTime === 0 && !timeEndedRef.current) {
              timeEndedRef.current = true;
              onTimeEndAction(gameId, 'black'); // Black wins when white times out
            }
            return newTime;
          });
        } else {
          setBlackTimeLeft(prev => {
            const newTime = Math.max(0, prev - elapsed);
            // Check for timeout
            if (newTime === 0 && !timeEndedRef.current) {
              timeEndedRef.current = true;
              onTimeEndAction(gameId, 'white'); // White wins when black times out
            }
            return newTime;
          });
        }
      }, 16); // Update every 16ms (60fps) for smoother countdown
    } else {
      setIsClockRunning(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isGameStarted, isWhiteTurn, isFirstMove]);

  // Track first move completion
  useEffect(() => {
    if (isFirstMove && !isWhiteTurn) {
      setIsFirstMove(false);
    }
  }, [isWhiteTurn, isFirstMove]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const tenths = Math.floor((time % 1000) / 100);
    
    // Show tenths of seconds when less than 10 seconds remain
    if (time < 10000) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="chess-clock-container">
      <div
        className={`chess-clock ${
          isWhiteTurn && isClockRunning ? 'active' : ''
        }`}
      >
        <div className="player-name">White</div>
        <div className={`time ${whiteTimeLeft < 30000 ? 'text-red-600' : ''}`}>
          {formatTime(whiteTimeLeft)}
        </div>
        {isFirstMove && isWhiteTurn && (
          <div className="text-[10px] text-gray-500">
            First move
          </div>
        )}
      </div>
      <div
        className={`chess-clock ${
          !isWhiteTurn && isClockRunning ? 'active' : ''
        }`}
      >
        <div className="player-name">Black </div>
        <div className={`time ${blackTimeLeft < 30000 ? 'text-red-600' : ''}`}>
          {formatTime(blackTimeLeft)}
        </div>
      </div>
    </div>
  );
}