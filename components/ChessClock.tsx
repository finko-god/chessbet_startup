'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { usePusherChannel } from '@/hooks/usePusherChannel';
import { getPusherClient } from '@/lib/pusherClient';
import { debounce } from 'lodash';

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
  
  // Pusher integration
  const handleTimeUpdate = useCallback(({ whiteTime, blackTime }: { 
    whiteTime: number
    blackTime: number 
  }) => {
    console.log('Time update received:', whiteTime, blackTime)
    setWhiteTimeLeft(whiteTime)
    setBlackTimeLeft(blackTime)
  }, [])

  const eventHandlers = useMemo(() => ({
    'time-update': handleTimeUpdate
  }), [handleTimeUpdate])

  usePusherChannel(channelName, eventHandlers)
  
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
            if (newTime <= 0) {
              clearInterval(intervalRef.current!);
              onTimeEndAction(gameId, 'black');
              return 0;
            }
            return newTime;
          });
        } else {
          setBlackTimeLeft(prev => {
            const newTime = Math.max(0, prev - elapsed);
            if (newTime <= 0) {
              clearInterval(intervalRef.current!);
              onTimeEndAction(gameId, 'white');
              return 0;
            }
            return newTime;
          });
        }
      }, 100); // Update more frequently for smoother countdown
    } else {
      setIsClockRunning(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isGameStarted, isWhiteTurn, gameId, onTimeEndAction, isFirstMove]);

  // Update server periodically (not on every tick)
  useEffect(() => {
    if (!isGameStarted || !isClockRunning) return;
    
    const serverUpdateInterval = setInterval(() => {
      updateTimeOnServer(whiteTimeLeft, blackTimeLeft);
    }, 1000); // Update server once per second
    
    return () => clearInterval(serverUpdateInterval);
  }, [isGameStarted, isClockRunning, whiteTimeLeft, blackTimeLeft]);

  // Track first move completion
  useEffect(() => {
    if (isFirstMove && !isWhiteTurn) {
      setIsFirstMove(false);
    }
  }, [isWhiteTurn, isFirstMove]);

  // Throttle server updates
  const updateTimeOnServer = useCallback(debounce(async (whiteTime: number, blackTime: number) => {
    // Only send update if time difference is significant (more than 1 second)
    const timeDiff = Math.abs(whiteTime - prevWhiteTimeRef.current) > 1000 || 
                    Math.abs(blackTime - prevBlackTimeRef.current) > 1000

    if (timeDiff) {
      try {
        const response = await fetch(`/api/games/${gameId}/time`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            whiteTime,
            blackTime,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update time on server')
        }

        // Update previous time references
        prevWhiteTimeRef.current = whiteTime
        prevBlackTimeRef.current = blackTime
      } catch (error) {
        console.error('Error updating time on server:', error)
      }
    }
  }, 2000), [gameId]) // Increased debounce time to 2 seconds

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