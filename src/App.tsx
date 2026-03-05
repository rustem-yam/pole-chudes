import { useMemo, useState } from 'react'
import './App.css'

type Player = {
  id: string
  name: string
  avatar: string
  score: number
}

type Sector =
  | { type: 'points'; label: string; value: number }
  | { type: 'bankrupt'; label: string }
  | { type: 'lose_turn'; label: string }

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐨', '🐸', '🐵', '🐙', '🐧', '🐺', '🐻', '🐱']

const DEMO_PHRASE = 'ПОЛЕ ЧУДЕС'

const SECTORS: Sector[] = [
  { type: 'points', value: 100, label: '100' },
  { type: 'points', value: 200, label: '200' },
  { type: 'points', value: 300, label: '300' },
  { type: 'points', value: 500, label: '500' },
  { type: 'points', value: 700, label: '700' },
  { type: 'points', value: 1000, label: '1000' },
  { type: 'bankrupt', label: 'БАНКРОТ' },
  { type: 'lose_turn', label: 'ПРОПУСК ХОДА' },
]

function maskPhrase(phrase: string) {
  return phrase.split('').map((ch) => (ch === ' ' ? ' ' : '_'))
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newAvatar, setNewAvatar] = useState(AVATARS[0])

  const [isSpinning, setIsSpinning] = useState(false)
  const [currentSector, setCurrentSector] = useState<Sector | null>(null)
  const [spinIndex, setSpinIndex] = useState(0)

  const masked = useMemo(() => maskPhrase(DEMO_PHRASE), [])

  const addPlayer = () => {
    const name = newPlayerName.trim()
    if (!name) return

    const p: Player = {
      id: uid(),
      name,
      avatar: newAvatar,
      score: 0,
    }

    setPlayers((prev) => [...prev, p])
    setNewPlayerName('')
    if (!activePlayerId) setActivePlayerId(p.id)
  }

  const removePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
    if (activePlayerId === id) {
      const next = players.find((p) => p.id !== id)
      setActivePlayerId(next?.id ?? null)
    }
  }

  const updateScore = (id: string, value: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, score: value } : p)))
  }

  const updateAvatar = (id: string, avatar: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, avatar } : p)))
  }

  const spinWheel = () => {
    if (isSpinning) return
    setIsSpinning(true)
    setCurrentSector(null)

    const targetIndex = Math.floor(Math.random() * SECTORS.length)
    let ticks = 0
    const totalTicks = 24 + targetIndex

    const timer = setInterval(() => {
      ticks += 1
      setSpinIndex((prev) => (prev + 1) % SECTORS.length)

      if (ticks >= totalTicks) {
        clearInterval(timer)
        const result = SECTORS[targetIndex]
        setCurrentSector(result)
        setIsSpinning(false)
      }
    }, 70)
  }

  const applySectorToActive = () => {
    if (!activePlayerId || !currentSector) return
    if (currentSector.type !== 'points') return

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === activePlayerId ? { ...p, score: p.score + currentSector.value } : p,
      ),
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Поле Чудес — студия ведущего</h1>
        <span className="step">Шаг 2/6: барабан ведущего + настройка игроков</span>
      </header>

      <main className="layout">
        <section className="boardCard">
          <div className="boardHeader">
            <div>
              <div className="label">Тема</div>
              <strong>Демо раунд</strong>
            </div>
            <div>
              <div className="label">Фраза</div>
              <strong>{DEMO_PHRASE.length} символов</strong>
            </div>
          </div>

          <div className="boardGrid">
            {masked.map((ch, i) =>
              ch === ' ' ? (
                <div key={`space-${i}`} className="space" />
              ) : (
                <div key={i} className="cell">
                  {ch}
                </div>
              ),
            )}
          </div>

          <div className="wheelCard">
            <div className="wheelHeader">
              <h2>Барабан ведущего</h2>
              <button onClick={spinWheel} disabled={isSpinning}>
                {isSpinning ? 'Крутим...' : 'Крутить барабан'}
              </button>
            </div>

            <div className="wheelStrip">
              {SECTORS.map((s, i) => (
                <div key={`${s.label}-${i}`} className={`wheelSector ${i === spinIndex ? 'active' : ''}`}>
                  {s.label}
                </div>
              ))}
            </div>

            <div className="wheelResult">
              <strong>Результат: </strong>
              {currentSector ? currentSector.label : '—'}
              {currentSector?.type === 'points' && (
                <button className="applyBtn" onClick={applySectorToActive}>
                  Начислить активному игроку
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="panel">
          <div className="card">
            <h2>Добавить игрока</h2>
            <div className="formRow">
              <input
                placeholder="Имя игрока"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
              <select value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)}>
                {AVATARS.map((a) => (
                  <option value={a} key={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button onClick={addPlayer}>Добавить</button>
            </div>
          </div>

          <div className="card">
            <h2>Игроки</h2>
            {players.length === 0 ? (
              <div className="empty">Пока нет игроков</div>
            ) : (
              <div className="players">
                {players.map((p) => (
                  <div key={p.id} className={`player ${activePlayerId === p.id ? 'active' : ''}`}>
                    <button className="avatarBtn" onClick={() => setActivePlayerId(p.id)}>
                      <span className="avatar">{p.avatar}</span>
                    </button>

                    <div className="playerInfo">
                      <div className="playerName">{p.name}</div>
                      <label className="scoreWrap">
                        Очки
                        <input
                          type="number"
                          value={p.score}
                          onChange={(e) => updateScore(p.id, Number(e.target.value || 0))}
                        />
                      </label>
                    </div>

                    <div className="playerActions">
                      <select value={p.avatar} onChange={(e) => updateAvatar(p.id, e.target.value)}>
                        {AVATARS.map((a) => (
                          <option value={a} key={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      <button className="danger" onClick={() => removePlayer(p.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
