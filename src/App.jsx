import React, { useMemo, useState } from 'react';
import { useGameSocket } from './useGameSocket';

function SuitSymbol({ suit, className = '' }) {
  const symbol = suit === 'HEARTS' ? '♥' : suit === 'DIAMONDS' ? '♦' : suit === 'CLUBS' ? '♣' : suit === 'SPADES' ? '♠' : '?';
  const colorClass = suit === 'HEARTS' || suit === 'DIAMONDS' ? 'red' : 'black';
  return <span className={`card-suit-symbol ${colorClass} ${className}`}>{symbol}</span>;
}

function RankText({ rank, className = '' }) {
  const map = { TWO:'2', THREE:'3', FOUR:'4', FIVE:'5', SIX:'6', SEVEN:'7', EIGHT:'8', NINE:'9', TEN:'10', JACK:'J', QUEEN:'Q', KING:'K', ACE:'A' };
  return <span className={`card-rank ${className}`}>{map[rank] || '?'}</span>;
}

function CardFace({ card, trumpSuit, top, interactive, onClick }) {
  if (!card) return null;
  const isTrump = trumpSuit && card.suit === trumpSuit;
  const classNames = ['card-face'];
  if (top) classNames.push('top-card');
  if (interactive) classNames.push('interactive');
  if (isTrump) classNames.push('trump-card');
  const label = `${card.rank} of ${card.suit}`;
  return (
    <div className={classNames.join(' ')} aria-label={label} onClick={interactive ? () => onClick?.() : undefined}>
      <div className="card-corner">
        <RankText rank={card.rank} />
        <SuitSymbol suit={card.suit} />
      </div>
      <div className="card-center-glyph">
        <SuitSymbol suit={card.suit} />
      </div>
      <div className="card-corner bottom">
        <RankText rank={card.rank} />
        <SuitSymbol suit={card.suit} />
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="card-back" aria-hidden="true">
      <div className="card-back-inner" />
      <div className="card-back-logo">DS</div>
    </div>
  );
}

function Lobby({ onJoin, joining }) {
  const [roomId, setRoomId] = useState('ROOM1');
  const [name, setName] = useState('Player-' + Math.floor(Math.random()*100));

  const submit = (e) => {
    e.preventDefault();
    if (!roomId || !name) return;
    onJoin({ roomId: roomId.trim(), playerName: name.trim() });
  };

  return (
    <div className="lobby-shell">
      <div className="lobby-card">
        <h1>Double Sir Trump</h1>
        <p>Enter a room ID and name to join a 4-player table.</p>
        <form onSubmit={submit} className="lobby-form">
          <label>
            <span>Room ID</span>
            <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. 9F7K" />
          </label>
          <label>
            <span>Display name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </label>
          <button type="submit" disabled={joining}>
            {joining ? 'Joining…' : 'Join table'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState(null);
  const [joining, setJoining] = useState(false);

  const { connected, gameState, sendSelectTrump, sendPlayCard } = useGameSocket({
    roomId,
    playerName,
    enabled: !!roomId && !!playerName,
  });

  const me = useMemo(() => {
    if (!gameState || !playerName) return null;
    return (gameState.players || []).find(p => p.name === playerName) || null;
  }, [gameState, playerName]);

  const myHand = me?.hand || [];

  const handleJoin = ({ roomId, playerName }) => {
    setJoining(true);
    setRoomId(roomId);
    setPlayerName(playerName);
    // connection + join will be triggered by hook
    setTimeout(() => setJoining(false), 800);
  };

  const onPlayCard = (cardId) => {
    if (!gameState || !me) return;
    if (gameState.currentTurn !== me.position) return;
    sendPlayCard(me.id, cardId);
  };

  if (!roomId || !playerName) {
    return <Lobby onJoin={handleJoin} joining={joining} />;
  }

  const trumpSuit = gameState?.trumpSuit;

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <header className="top-bar">
          <div className="brand">
            <div className="brand-logo"><span>DS</span></div>
            <div className="brand-meta">
              <div className="title">Double Sir Trump</div>
              <div className="subtitle">Room {roomId} · {connected ? 'Connected' : 'Connecting…'}</div>
            </div>
          </div>
          <div className="room-info">
            <span className="room-pill-label">Player</span>
            <span className="room-pill-code">{playerName}</span>
          </div>
        </header>

        <main className="layout-main">
          <section className="table-shell" aria-label="card table">
            <div className="table-shell-inner">
              <div className="table-header-row">
                <div className="trump-chip">
                  <div className="trump-suit" aria-label="Trump suit">
                    {trumpSuit ? <SuitSymbol suit={trumpSuit} /> : '?'}
                  </div>
                  <div>
                    <div style={{fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--text-soft)'}}>Trump</div>
                    <div style={{fontSize:'0.8rem'}}>{trumpSuit ? `${trumpSuit.toLowerCase()} ${gameState?.trumpRevealed ? '· revealed' : '· hidden'}` : 'Waiting for trump keeper'}</div>
                  </div>
                </div>
                <div className="turn-indicator">
                  <span className="turn-dot" />
                  <span>{gameState?.currentTurn || 'NORTH'} to play</span>
                </div>
              </div>

              <div className="table-grid">
                <div className="table-players">
                  {/* For brevity, only render bottom hand visually; others shown as counts */}
                  <div className="player-seat seat-bottom">
                    <div className={`seat-tag ${gameState?.currentTurn === me?.position ? 'turn' : ''}`}>
                      <span className="team-pill">{me?.team || 'Team'}</span>
                      <div>
                        <div className="label">{me?.position || 'SOUTH'} · You</div>
                        <div className="meta">Your hand ({myHand.length} cards)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-center-stack">
                  <div className="table-center-label">Current trick</div>
                  <div className="table-center-cards" aria-live="polite">
                    {(gameState?.currentTrick || []).map((pc, idx) => (
                      <CardFace
                        key={idx}
                        card={pc.card}
                        trumpSuit={trumpSuit}
                        top={idx === 0}
                      />
                    ))}
                    {!gameState?.currentTrick?.length && (
                      <div style={{fontSize:'0.75rem', color:'var(--text-soft)'}}>Waiting for lead…</div>
                    )}
                  </div>
                </div>

                <div className="table-footer-row">
                  <div>
                    <span style={{fontSize:'0.75rem', color:'var(--text-soft)'}}>Consecutive wins:</span>
                    <span className="streak-pill">{gameState?.consecutiveWins || 0}</span>
                  </div>
                  <div className="pile-pill">
                    <div className="pile-chip"></div>
                    <span>Table pile</span>
                    <strong>{gameState?.tablePileCount || 0} cards</strong>
                  </div>
                </div>
              </div>

              <div className="cards-row-bottom">
                <div>
                  <div className="player-hand-label">Your hand · click card to play</div>
                  <div className="cards-hand-row">
                    {myHand.map((card) => (
                      <CardFace
                        key={card.id}
                        card={card}
                        trumpSuit={trumpSuit}
                        interactive={true}
                        onClick={() => onPlayCard(card.id)}
                      />
                    ))}
                    {!myHand.length && <span style={{fontSize:'0.8rem', color:'var(--text-soft)'}}>No cards – hand finished.</span>}
                  </div>
                </div>
                <div className="hand-stats">
                  <div className="hand-pill">Trump cards in hand: <strong>{myHand.filter(c => c.suit === trumpSuit).length}</strong></div>
                  <div>Team A hands: <strong>{gameState?.teamAHnds ?? 0}</strong></div>
                  <div>Team B hands: <strong>{gameState?.teamBHands ?? 0}</strong></div>
                </div>
              </div>
            </div>
          </section>

          <aside className="sidebar-shell" aria-label="rules">
            <div className="rules-panel">
              <h3>Round logic</h3>
              <div className="rules-highlight">Win two tricks in a row with a non‑Ace to capture the entire table pile.</div>
              <ul className="rules-list">
                <li><span className="idx">8.</span><span className="txt">Follow suit if possible; otherwise discard or (after reveal) play trump.</span></li>
                <li><span className="idx">18.</span><span className="txt">Same player must win two consecutive tricks to claim the pile.</span></li>
                <li><span className="idx">19–20.</span><span className="txt">Second win with an Ace does not capture the pile; you must win again with a non‑Ace.</span></li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
