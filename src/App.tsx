import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
const DEFAULT_PHRASE = 'ПОЛЕ ЧУДЕС'
const STORAGE_KEY = 'pole-chudes-state-v1'


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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLetter(v: string) {
  return v.trim().toUpperCase().replace('Ё', 'Е')
}

type PersistedState = {
  players?: Player[]
  activePlayerId?: string | null
  phrase?: string
  roundTitle?: string
  hint?: string
  openedLetters?: string[]
  usedLetters?: string[]
}

function readPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function playTone(freq: number, duration = 120) {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    osc.type = 'triangle'
    gain.gain.value = 0.02
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      void ctx.close()
    }, duration)
  } catch {
    // ignore audio issues
  }
}

export default function App() {
  const [persisted] = useState<PersistedState | null>(() => readPersistedState())

  const [players, setPlayers] = useState<Player[]>(persisted?.players ?? [])
  const [activePlayerId, setActivePlayerId] = useState<string | null>(persisted?.activePlayerId ?? null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newAvatar, setNewAvatar] = useState(AVATARS[0])

  const [isSpinning, setIsSpinning] = useState(false)
  const [currentSector, setCurrentSector] = useState<Sector | null>(null)
  const [spinIndex, setSpinIndex] = useState(0)

  const [phrase, setPhrase] = useState(persisted?.phrase ?? DEFAULT_PHRASE)
  const [roundTitle, setRoundTitle] = useState(persisted?.roundTitle ?? 'Раунд 1')
  const [hint, setHint] = useState(persisted?.hint ?? '')
  const [showAnswer, setShowAnswer] = useState(false)

  const [openedLetters, setOpenedLetters] = useState<string[]>(persisted?.openedLetters ?? [])
  const [usedLetters, setUsedLetters] = useState<string[]>(persisted?.usedLetters ?? [])
  const [letterInput, setLetterInput] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [status, setStatus] = useState('Готово к игре')
  const [screenMode, setScreenMode] = useState(false)
  const [showHotkeys, setShowHotkeys] = useState(true)
  const [bigBoardMode, setBigBoardMode] = useState(false)
  const [partyMode, setPartyMode] = useState(true)
  const [celebrate, setCelebrate] = useState(false)

  const masked = useMemo(() => {
    return phrase.split('').map((ch) => {
      if (ch === ' ') return ' '
      return openedLetters.includes(normalizeLetter(ch)) ? ch : '_'
    })
  }, [openedLetters])

  const activePlayer = players.find((p) => p.id === activePlayerId) ?? null

  const nextPlayer = () => {
    if (players.length === 0) return
    if (!activePlayerId) {
      setActivePlayerId(players[0].id)
      return
    }

    const idx = players.findIndex((p) => p.id === activePlayerId)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % players.length
    setActivePlayerId(players[nextIdx].id)
  }

  const addPlayer = () => {
    const name = newPlayerName.trim()
    if (!name) return

    const p: Player = { id: uid(), name, avatar: newAvatar, score: 0 }
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

  const adjustScore = (id: string, delta: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p)),
    )
  }

  const resetScore = (id: string) => {
    updateScore(id, 0)
  }

  const updateAvatar = (id: string, avatar: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, avatar } : p)))
  }

  const spinWheel = () => {
    if (isSpinning) return
    setIsSpinning(true)
    setCurrentSector(null)
    setStatus('Крутим барабан...')
    if (partyMode) playTone(420, 90)

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
        if (partyMode) playTone(result.type === 'points' ? 620 : 260, 180)
        if (result.type === 'bankrupt') setStatus('БАНКРОТ! Обнули очки игрока при необходимости.')
        else if (result.type === 'lose_turn') setStatus('ПРОПУСК ХОДА! Передай ход следующему игроку.')
        else setStatus(`Выпало ${result.value}. Назови букву или слово.`)
      }
    }, 70)
  }

  const applyPointsToActive = (points: number) => {
    if (!activePlayerId) return
    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayerId ? { ...p, score: p.score + points } : p)),
    )
  }

  const guessLetter = () => {
    const letter = normalizeLetter(letterInput)
    if (!letter || letter.length !== 1) return
    if (usedLetters.includes(letter)) {
      setStatus(`Буква ${letter} уже была.`)
      return
    }

    setUsedLetters((prev) => [...prev, letter])

    const normalizedPhrase = phrase.toUpperCase().replace('Ё', 'Е')
    const count = [...normalizedPhrase].filter((ch) => ch === letter).length

    if (count > 0) {
      setOpenedLetters((prev) => [...new Set([...prev, letter])])

      if (currentSector?.type === 'points') {
        applyPointsToActive(currentSector.value * count)
        setStatus(`Есть ${count} шт. ${letter}. Начислено: ${currentSector.value * count}`)
      } else {
        setStatus(`Есть ${count} шт. ${letter}.`)
      }
      if (partyMode) playTone(720, 120)
    } else {
      setStatus(`Буквы ${letter} нет. Передай ход.`)
      if (partyMode) playTone(220, 140)
    }

    setLetterInput('')
  }

  const guessWord = () => {
    const guess = wordInput.trim().toUpperCase().replace('Ё', 'Е')
    const answer = phrase.toUpperCase().replace('Ё', 'Е')

    if (!guess) return

    if (guess === answer) {
      const letters = [...new Set(answer.replace(/\s+/g, '').split(''))]
      setOpenedLetters(letters)
      setStatus('СЛОВО УГАДАНО! 🎉')
      setCelebrate(true)
      if (partyMode) {
        playTone(660, 100)
        setTimeout(() => playTone(880, 130), 120)
        setTimeout(() => playTone(1040, 160), 280)
      }
      setTimeout(() => setCelebrate(false), 1400)
    } else {
      setStatus('Неверное слово. Передай ход.')
      if (partyMode) playTone(220, 160)
    }

    setWordInput('')
  }

  const resetRound = () => {
    setOpenedLetters([])
    setUsedLetters([])
    setLetterInput('')
    setWordInput('')
    setCurrentSector(null)
    setStatus('Новый раунд готов')
  }

  const quickStartRound = () => {
    resetRound()
    setStatus('Раунд запущен')
  }

  const applyCurrentSector = () => {
    if (!currentSector) return
    if (currentSector.type === 'points') {
      applyPointsToActive(currentSector.value)
      setStatus(`Начислено ${currentSector.value} активному игроку`)
    }
    if (currentSector.type === 'bankrupt' && activePlayerId) {
      updateScore(activePlayerId, 0)
      setStatus('Активному игроку применён БАНКРОТ')
    }
    if (currentSector.type === 'lose_turn') {
      nextPlayer()
      setStatus('Пропуск хода: переход к следующему игроку')
    }
  }

  const bankruptActive = () => {
    if (!activePlayerId) return
    updateScore(activePlayerId, 0)
    setStatus('Очки активного игрока обнулены')
  }

  const openFullscreen = async () => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (event.code === 'Space') {
        event.preventDefault()
        spinWheel()
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        nextPlayer()
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void openFullscreen()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSpinning, players, activePlayerId])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ players, activePlayerId, phrase, roundTitle, hint, openedLetters, usedLetters }),
    )
  }, [players, activePlayerId, phrase, roundTitle, hint, openedLetters, usedLetters])

  return (
    <div className="page">
      <header className="topbar">
        <h1>Поле Чудес — студия ведущего</h1>
        <div className="topbarActions">
          <span className="step">Шаг 6/6: финальный стрим-полиш</span>
          <button className="ghost" onClick={() => setBigBoardMode((v) => !v)}>
            {bigBoardMode ? 'Обычное табло' : 'Big Board'}
          </button>
          <button className="ghost" onClick={() => setPartyMode((v) => !v)}>
            {partyMode ? 'Праздничный режим: ON' : 'Праздничный режим: OFF'}
          </button>
          <button className="ghost" onClick={() => setShowHotkeys((v) => !v)}>
            {showHotkeys ? 'Скрыть hotkeys' : 'Показать hotkeys'}
          </button>
          <button className="ghost" onClick={quickStartRound}>Быстрый старт раунда</button>
          <button className="ghost" onClick={() => void openFullscreen()}>Fullscreen (F)</button>
          <button className="ghost" onClick={() => setScreenMode((v) => !v)}>
            {screenMode ? 'Выйти из Screen Mode' : 'Screen Mode'}
          </button>
        </div>
      </header>

      {!screenMode && <section className="turnCard">
        <div>
          <div className="label">Сейчас ходит</div>
          <strong>{activePlayer ? `${activePlayer.avatar} ${activePlayer.name}` : 'Игрок не выбран'}</strong>
        </div>
        <div className="turnActions">
          <button className="ghost" onClick={nextPlayer}>Следующий игрок (N)</button>
          <button onClick={spinWheel} disabled={isSpinning}>{isSpinning ? 'Крутим...' : 'Крутить барабан (Space)'}</button>
        </div>
      </section>}

      {!screenMode && (
        <section className="controlCard">
          <button className="ghost" onClick={applyCurrentSector}>Применить сектор</button>
          <button className="ghost" onClick={bankruptActive}>Банкрот активному</button>
          <button className="ghost" onClick={nextPlayer}>Пропуск хода</button>
          <button className="ghost" onClick={resetRound}>Сброс раунда</button>
          {showHotkeys && <div className="hotkeys">Hotkeys: Space — барабан · N — следующий игрок · F — fullscreen</div>}
        </section>
      )}

      <main className={`layout ${screenMode ? 'layoutScreen' : ''}`}>
        <section className={`boardCard ${celebrate ? 'celebrate' : ''}`}>
          <div className="boardHeader">
            <div>
              <div className="label">Раунд</div>
              <strong>{roundTitle}</strong>
            </div>
            <div>
              <div className="label">Вопрос</div>
              <strong>{hint || '—'}</strong>
            </div>
            <div>
              <div className="label">Фраза</div>
              <strong>{phrase.length} символов</strong>
            </div>
          </div>

          {!screenMode && (
            <>
              <div className="hostSetup hostSetupWide">
                <input value={roundTitle} onChange={(e) => setRoundTitle(e.target.value)} placeholder="Название раунда" />
                <input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Вопрос" />
                <input value={phrase} onChange={(e) => setPhrase(e.target.value.toUpperCase())} placeholder="Загаданное слово / фраза" />
                <button className="ghost" onClick={() => setShowAnswer((v) => !v)}>
                  {showAnswer ? 'Скрыть ответ' : 'Показать ответ ведущему'}
                </button>
              </div>

              {hint && <div className="hintPreview">Подсказка: {hint}</div>}
              {showAnswer && <div className="answerPreview">Ответ: {phrase}</div>}

            </>
          )}

          {celebrate && <div className="confetti">🎉 🎊 ✨</div>}
          <div className={`boardGrid ${bigBoardMode ? 'boardGridBig' : ''}`}>
            {masked.map((ch, i) =>
              ch === ' ' ? (
                <div key={`space-${i}`} className="space" />
              ) : (
                <div key={i} className={`cell ${bigBoardMode ? 'cellBig' : ''}`}>{ch}</div>
              ),
            )}
          </div>

          <div className="guessCard">
            <div className="guessRow">
              <input
                placeholder="Буква"
                value={letterInput}
                onChange={(e) => setLetterInput(e.target.value.slice(0, 1))}
              />
              <button onClick={guessLetter}>Открыть букву</button>
              <input
                placeholder="Слово целиком"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
              />
              <button onClick={guessWord}>Проверить слово</button>
              <button className="ghost" onClick={resetRound}>Новый раунд</button>
            </div>
            <div className="usedLetters">Были буквы: {usedLetters.join(', ') || '—'}</div>
            <div className="status">Статус: {status}</div>
          </div>

          <div className={`wheelCard ${screenMode ? 'wheelCardScreen' : ''}`}>
            <div className="wheelHeader">
              <h2>Барабан</h2>
              <button onClick={spinWheel} disabled={isSpinning}>
                {isSpinning ? 'Крутим...' : 'Крутить барабан'}
              </button>
            </div>

            <div className="wheelCircleWrap">
              <div className="wheelPointer">▼</div>
              <div className="wheelCircle">
                {SECTORS.map((s, i) => {
                  const angle = (360 / SECTORS.length) * i
                  const style = {
                    transform: `rotate(${angle}deg) translateY(-120px) rotate(${-angle}deg)`,
                  } as CSSProperties
                  return (
                    <div key={`${s.label}-${i}`} style={style} className={`wheelSector ${i === spinIndex ? 'active' : ''}`}>
                      {s.label}
                    </div>
                  )
                })}
                <div className="wheelCenter">🎡</div>
              </div>
            </div>

            <div className="wheelResult">
              <strong>Результат: </strong>
              {currentSector ? currentSector.label : '—'}
            </div>
          </div>
        </section>

        <aside className="panel">
          {!screenMode && (
            <div className="card">
              <h2>Добавить игрока</h2>
              <div className="formRow">
                <input placeholder="Имя игрока" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                <select value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)}>
                  {AVATARS.map((a) => <option value={a} key={a}>{a}</option>)}
                </select>
                <button onClick={addPlayer}>Добавить</button>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Игроки</h2>
            {players.length === 0 ? (
              <div className="empty">Пока нет игроков</div>
            ) : (
              <div className={`players ${screenMode ? 'playersStream' : ''}`}>
                {players.map((p) => (
                  <div key={p.id} className={`player ${activePlayerId === p.id ? 'active' : ''} ${screenMode ? 'playerStream' : ''}`}>
                    <button className="avatarBtn" onClick={() => setActivePlayerId(p.id)}>
                      <span className="avatar">{p.avatar}</span>
                    </button>

                    <div className="playerInfo">
                      <div className="playerName">{p.name}</div>
                      <label className="scoreWrap">
                        Очки
                        {screenMode ? (
                          <div className="scoreValue">{p.score}</div>
                        ) : (
                          <input type="number" value={p.score} onChange={(e) => updateScore(p.id, Number(e.target.value || 0))} />
                        )}
                      </label>
                      {!screenMode && (
                        <div className="quickScoreRow">
                          <button className="mini" onClick={() => adjustScore(p.id, 100)}>+100</button>
                          <button className="mini" onClick={() => adjustScore(p.id, 200)}>+200</button>
                          <button className="mini" onClick={() => adjustScore(p.id, -100)}>-100</button>
                          <button className="mini ghost" onClick={() => resetScore(p.id)}>Сброс</button>
                        </div>
                      )}
                    </div>

                    {!screenMode && (
                      <div className="playerActions">
                        <select value={p.avatar} onChange={(e) => updateAvatar(p.id, e.target.value)}>
                          {AVATARS.map((a) => <option value={a} key={a}>{a}</option>)}
                        </select>
                        <button className="danger" onClick={() => removePlayer(p.id)}>Удалить</button>
                      </div>
                    )}
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
