import { useMemo, useState } from 'react'
import './App.css'

type Player = {
  id: string
  name: string
  avatar: string
  score: number
}

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐨', '🐸', '🐵', '🐙', '🐧', '🐺', '🐻', '🐱']

const DEMO_PHRASE = 'ПОЛЕ ЧУДЕС'

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

  return (
    <div className="page">
      <header className="topbar">
        <h1>Поле Чудес — студия ведущего</h1>
        <span className="step">Шаг 1/6: участники + табло</span>
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

          <p className="hint">Пока это каркас: в следующем шаге добавим барабан и механику открытия букв.</p>
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
