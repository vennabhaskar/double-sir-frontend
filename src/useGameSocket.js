import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

export function useGameSocket({ roomId, playerName, enabled }) {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const stompRef = useRef(null);

  useEffect(() => {
    if (!enabled || !roomId || !playerName) return;

    const sock = new SockJS('/ws-game');
    const stomp = Stomp.over(sock);
    stomp.debug = () => {};

    stomp.connect({}, () => {
      setConnected(true);
      stompRef.current = stomp;

      // Subscribe to shared room state topic – you must broadcast there from backend
      const topic = `/topic/room/${roomId}/state`;
      stomp.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body);
          setGameState(payload);
        } catch (e) {
          console.error('Failed to parse game state', e);
        }
      });

      // Send join message
      stomp.send(`/app/room/${roomId}/join`, {}, JSON.stringify({ roomId, playerName }));
    }, (err) => {
      console.error('STOMP error', err);
      setConnected(false);
    });

    return () => {
      try {
        stomp.disconnect(() => {});
      } catch {}
      setConnected(false);
      stompRef.current = null;
    };
  }, [roomId, playerName, enabled]);

  const sendSelectTrump = (playerId, trumpSuit) => {
    if (!stompRef.current) return;
    const payload = { roomId, playerId, trumpSuit };
    stompRef.current.send(`/app/room/${roomId}/select-trump`, {}, JSON.stringify(payload));
  };

  const sendPlayCard = (playerId, cardId) => {
    if (!stompRef.current) return;
    const payload = { roomId, playerId, cardId };
    stompRef.current.send(`/app/room/${roomId}/play-card`, {}, JSON.stringify(payload));
  };

  return { connected, gameState, sendSelectTrump, sendPlayCard };
}
