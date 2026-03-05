import { useEffect, useMemo, useState, useRef, type CSSProperties } from 'react'
import './App.css'
import yakunovichImg from './assets/yakubovich.jpg'
import yakunovichSayImg from './assets/yakubovich-say.jpg'
import natashaImg from './assets/natasha.png'
import sashaImg from './assets/sasha.png'
import ritaImg from './assets/rita.png'
import katyaImg from './assets/katya.png'
import wheelMusicSrc from './assets/wheel-music.m4a'
import wrongGuessSrc from './assets/wrong-guess.m4a'
import rightGuessSrc from './assets/right-guess.m4a'

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

type RoundItem = {
  id: string
  title: string
  hint: string
  phrase: string
}

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐨', '🐸', '🐵', '🐙', '🐧', '🐺', '🐻', '🐱']
const DEFAULT_PHRASE = 'ПОЛЕ ЧУДЕС'
const STORAGE_KEY = 'pole-chudes-state-v1'

const DEFAULT_PLAYERS: Player[] = [
  { id: 'player-natasha', name: 'Наташа', avatar: natashaImg, score: 0 },
  { id: 'player-sasha', name: 'Саша', avatar: sashaImg, score: 0 },
  { id: 'player-rita', name: 'Рита', avatar: ritaImg, score: 0 },
  { id: 'player-katya', name: 'Катя', avatar: katyaImg, score: 0 },
]

const DEFAULT_ROUND: RoundItem = {
  id: 'round-1',
  title: 'Раунд 1',
  hint: '',
  phrase: DEFAULT_PHRASE,
}

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
  return v.trim().toUpperCase()
}

type PersistedState = {
  players?: Player[]
  activePlayerId?: string | null
  rounds?: RoundItem[]
  activeRoundId?: string | null
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

// function playTone(freq: number, duration = 120) {
//   try {
//     const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
//     if (!Ctx) return
//     const ctx = new Ctx()
//     const osc = ctx.createOscillator()
//     const gain = ctx.createGain()
//     osc.frequency.value = freq
//     osc.type = 'triangle'
//     gain.gain.value = 0.02
//     osc.connect(gain)
//     gain.connect(ctx.destination)
//     osc.start()
//     setTimeout(() => {
//       osc.stop()
//       void ctx.close()
//     }, duration)
//   } catch {
//     // ignore audio issues
//   }
// }

export default function App() {
  const [persisted] = useState<PersistedState | null>(() => readPersistedState())

  const [players, setPlayers] = useState<Player[]>(
    (persisted?.players && persisted.players.length > 0) ? persisted.players : DEFAULT_PLAYERS
  )
  const [activePlayerId, setActivePlayerId] = useState<string | null>(
    persisted?.activePlayerId ?? DEFAULT_PLAYERS[0]?.id ?? null
  )
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newAvatar, setNewAvatar] = useState(AVATARS[0])

  const [isSpinning, setIsSpinning] = useState(false)
  const [currentSector, setCurrentSector] = useState<Sector | null>(null)
  const [spinIndex, setSpinIndex] = useState(0)

  const [rounds, setRounds] = useState<RoundItem[]>(
    persisted?.rounds && persisted.rounds.length > 0 ? persisted.rounds : [DEFAULT_ROUND],
  )
  const [activeRoundId, setActiveRoundId] = useState<string | null>(
    persisted?.activeRoundId ?? (persisted?.rounds?.[0]?.id ?? DEFAULT_ROUND.id),
  )
  const [showAnswer, setShowAnswer] = useState(false)
  const [showPhraseInput, setShowPhraseInput] = useState(false)

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
  const [yakubovichSpeech, setYakubovichSpeech] = useState('')
  const [showYakubovichSpeech, setShowYakubovichSpeech] = useState(false)

  const yakubovichTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelMusicRef = useRef<HTMLAudioElement | null>(null)
  const wrongGuessAudioRef = useRef<HTMLAudioElement | null>(null)
  const rightGuessAudioRef = useRef<HTMLAudioElement | null>(null)

  const activePlayer = players.find((p) => p.id === activePlayerId) ?? null
  const activeRound = rounds.find((r) => r.id === activeRoundId) ?? rounds[0] ?? DEFAULT_ROUND
  const phrase = activeRound?.phrase ?? ''
  const roundTitle = activeRound?.title ?? ''
  const hint = activeRound?.hint ?? ''

  const masked = useMemo(() => {
    return phrase.split('').map((ch) => {
      if (ch === ' ') return ' '
      return openedLetters.includes(normalizeLetter(ch)) ? ch : '_'
    })
  }, [openedLetters, phrase])

  const playAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => {
      // ignore autoplay/media errors
    })
  }

  const stopAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const patchActiveRound = (patch: Partial<RoundItem>) => {
    setRounds((prev) => prev.map((r) => (r.id === activeRound.id ? { ...r, ...patch } : r)))
  }

  const prevRound = () => {
    if (rounds.length === 0) return
    const idx = rounds.findIndex((r) => r.id === activeRound.id)
    const prevIdx = idx === -1 ? 0 : (idx - 1 + rounds.length) % rounds.length
    setActiveRoundId(rounds[prevIdx].id)
    setOpenedLetters([])
    setUsedLetters([])
    setStatus(`Переключено: ${rounds[prevIdx].title}`)
  }

  const addRound = () => {
    const nextNumber = rounds.length + 1
    const next: RoundItem = {
      id: uid(),
      title: `Раунд ${nextNumber}`,
      hint: '',
      phrase: '',
    }
    setRounds((prev) => [...prev, next])
    setActiveRoundId(next.id)
    setOpenedLetters([])
    setUsedLetters([])
    setStatus(`Создан ${next.title}`)
  }

  const nextRound = () => {
    if (rounds.length === 0) return
    const idx = rounds.findIndex((r) => r.id === activeRound.id)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % rounds.length
    setActiveRoundId(rounds[nextIdx].id)
    setOpenedLetters([])
    setUsedLetters([])
    setStatus(`Переключено: ${rounds[nextIdx].title}`)
  }

  const nextPlayer = () => {
    if (players.length === 0) return
    if (!activePlayerId) {
      const firstPlayer = players[0]
      setActivePlayerId(firstPlayer.id)
      showYakubovichMessage(getRandomPhraseForPlayer(NEXT_PLAYER_PHRASES, firstPlayer.name))
      return
    }

    const idx = players.findIndex((p) => p.id === activePlayerId)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % players.length
    const next = players[nextIdx]
    setActivePlayerId(next.id)
    showYakubovichMessage(getRandomPhraseForPlayer(NEXT_PLAYER_PHRASES, next.name))
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

  const handleAvatarUpload = (playerId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          updateAvatar(playerId, dataUrl)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const showYakubovichMessage = (message: string) => {
    if (yakubovichTimerRef.current) {
      clearTimeout(yakubovichTimerRef.current)
    }
    setYakubovichSpeech(message)
    setShowYakubovichSpeech(true)
    yakubovichTimerRef.current = setTimeout(() => {
      setShowYakubovichSpeech(false)
    }, 5000)
  }

  const getRandomPhrase = (phrases: string[]): string => {
    return phrases[Math.floor(Math.random() * phrases.length)]
  }

  const BANKRUPT_PHRASES = ['%s, вы банкрот!', '%s банкрот!', '%s, вы потеряли все!']
  const LOSE_TURN_PHRASES = ['%s, пропускаете ход!', '%s, ход не ваш!', '%s, ход прошёл мимо!']
  const CALL_LETTER_PHRASES = ['Называйте букву, %s!', '%s, отлично, называйте!', '%s, можете назвать букву или слово!']
  const NEXT_PLAYER_PHRASES = ['%s, крутите барабан!', '%s, ваш ход, крутите!', '%s, барабан ждёт вас!']
  const GUESSED_LETTER_PHRASES = ['%s, правильно!', '%s, есть такая буква!', '%s молодец!']
  const MISSED_LETTER_PHRASES = ['%s, нет такой буквы!', '%s, не угадали!', '%s, такой буквы нет!']
  const GUESSED_WORD_PHRASES = ['%s, отлично! Слово угадано!', '%s, браво! Правильный ответ!', '%s, восхитительно!']
  const MISSED_WORD_PHRASES = ['%s, не то слово!', 'Неверно, %s!', '%s, к сожалению, неправильно!']

  const formatPhrase = (template: string, playerName?: string): string => {
    const name = playerName?.trim() || activePlayer?.name?.trim() || 'Игрок'
    return template.replace(/%s/g, name)
  }

  const getRandomPhraseForPlayer = (phrases: string[], playerName?: string): string => {
    return formatPhrase(getRandomPhrase(phrases), playerName)
  }

  const getRandomPhraseForActivePlayer = (phrases: string[]): string => {
    return getRandomPhraseForPlayer(phrases)
  }

  const spinWheel = () => {
    if (isSpinning) return
    
    // Clear previous Yakubovich message
    if (yakubovichTimerRef.current) {
      clearTimeout(yakubovichTimerRef.current)
    }
    setShowYakubovichSpeech(false)
    
    setIsSpinning(true)
    setCurrentSector(null)
    setStatus('Крутим барабан...')
    if (partyMode) {
      // playTone(420, 90)
      playAudio(wheelMusicRef.current)
    }

    const targetIndex = Math.floor(Math.random() * SECTORS.length)
    let ticks = 0
    let currentIndex = spinIndex
    const totalTicks = 60 + targetIndex

    const spinStep = () => {
      ticks += 1
      currentIndex = (currentIndex + 1) % SECTORS.length
      setSpinIndex(currentIndex)

      // Проверяем, достаточно ли близко к концу, чтобы замедлиться и дойти до targetIndex
      const remainingTicks = totalTicks - ticks
      const isNearEnd = remainingTicks < 15
      
      if (isNearEnd && currentIndex === targetIndex) {
        // Достигли целевого индекса близко к концу
        const result = SECTORS[targetIndex]
        setCurrentSector(result)
        setIsSpinning(false)
        stopAudio(wheelMusicRef.current)
        // if (partyMode) playTone(result.type === 'points' ? 620 : 260, 180)
        
        // Show Yakubovich message based on sector type
        if (result.type === 'bankrupt') {
          if (activePlayerId) {
            updateScore(activePlayerId, 0)
          }
          setStatus('БАНКРОТ! Очки активного игрока обнулены.')
          showYakubovichMessage(getRandomPhraseForActivePlayer(BANKRUPT_PHRASES))
        } else if (result.type === 'lose_turn') {
          setStatus('ПРОПУСК ХОДА! Передай ход следующему игроку.')
          showYakubovichMessage(getRandomPhraseForActivePlayer(LOSE_TURN_PHRASES))
          setTimeout(() => {
            nextPlayer()
          }, 2000)
        } else {
          setStatus(`Выпало ${result.value}. Назови букву или слово.`)
          const callLetterPhrase = getRandomPhraseForActivePlayer(CALL_LETTER_PHRASES)
          if (result.value === 1000) {
            showYakubovichMessage('ОГО! ' + callLetterPhrase)
          } else {
            showYakubovichMessage(callLetterPhrase)
          }
        }
      } else if (ticks >= totalTicks) {
        // Fallback если что-то пошло не так
        setSpinIndex(targetIndex)
        const result = SECTORS[targetIndex]
        setCurrentSector(result)
        setIsSpinning(false)
        stopAudio(wheelMusicRef.current)
        // if (partyMode) playTone(result.type === 'points' ? 620 : 260, 180)
        
        if (result.type === 'bankrupt') {
          if (activePlayerId) {
            updateScore(activePlayerId, 0)
          }
          setStatus('БАНКРОТ! Очки активного игрока обнулены.')
          showYakubovichMessage(getRandomPhraseForActivePlayer(BANKRUPT_PHRASES))
        } else if (result.type === 'lose_turn') {
          setStatus('ПРОПУСК ХОДА! Передай ход следующему игроку.')
          showYakubovichMessage(getRandomPhraseForActivePlayer(LOSE_TURN_PHRASES))
          setTimeout(() => {
            nextPlayer()
          }, 2000)
        } else {
          setStatus(`Выпало ${result.value}. Назови букву или слово.`)
          const callLetterPhrase = getRandomPhraseForActivePlayer(CALL_LETTER_PHRASES)
          if (result.value === 1000) {
            showYakubovichMessage('ОГО! ' + callLetterPhrase)
          } else {
            showYakubovichMessage(callLetterPhrase)
          }
        }
      } else {
        // Эффект замедления: интервал увеличивается в зависимости от прогресса
        const progress = ticks / totalTicks
        const baseInterval = 50
        const maxInterval = 300
        const interval = baseInterval + (maxInterval - baseInterval) * (progress * progress)
        setTimeout(spinStep, interval)
      }
    }

    spinStep()
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

    const normalizedPhrase = phrase.toUpperCase()
    const count = [...normalizedPhrase].filter((ch) => ch === letter).length

    if (count > 0) {
      setOpenedLetters((prev) => [...new Set([...prev, letter])])

      if (currentSector?.type === 'points') {
        applyPointsToActive(currentSector.value * count)
        setStatus(`Есть ${count} шт. ${letter}. Начислено: ${currentSector.value * count}`)
      } else {
        setStatus(`Есть ${count} шт. ${letter}.`)
      }
      showYakubovichMessage(getRandomPhraseForActivePlayer(GUESSED_LETTER_PHRASES))
      if (partyMode) {
        // playTone(720, 120)
        playAudio(rightGuessAudioRef.current)
      }
    } else {
      setStatus(`Буквы ${letter} нет. Передай ход.`)
      showYakubovichMessage(getRandomPhraseForActivePlayer(MISSED_LETTER_PHRASES))
      if (partyMode) {
        // playTone(220, 140)
        playAudio(wrongGuessAudioRef.current)
      }
    }

    setLetterInput('')
  }

  const guessWord = () => {
    const guess = wordInput.trim().toUpperCase()
    const answer = phrase.toUpperCase()

    if (!guess) return

    if (guess === answer) {
      const letters = [...new Set(answer.replace(/\s+/g, '').split(''))]
      setOpenedLetters(letters)
      setStatus('СЛОВО УГАДАНО! 🎉')
      showYakubovichMessage(getRandomPhraseForActivePlayer(GUESSED_WORD_PHRASES))
      setCelebrate(true)
      if (partyMode) {
        // playTone(660, 100)
        // setTimeout(() => playTone(880, 130), 120)
        // setTimeout(() => playTone(1040, 160), 280)
        playAudio(rightGuessAudioRef.current)
      }
      setTimeout(() => setCelebrate(false), 1400)
    } else {
      setStatus('Неверное слово. Передай ход.')
      showYakubovichMessage(getRandomPhraseForActivePlayer(MISSED_WORD_PHRASES))
      if (partyMode) {
        // playTone(220, 160)
        playAudio(wrongGuessAudioRef.current)
      }
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
    const wheel = new Audio(wheelMusicSrc)
    wheel.loop = true
    wheelMusicRef.current = wheel
    wrongGuessAudioRef.current = new Audio(wrongGuessSrc)
    rightGuessAudioRef.current = new Audio(rightGuessSrc)

    return () => {
      if (wheelMusicRef.current) {
        wheelMusicRef.current.pause()
        wheelMusicRef.current.currentTime = 0
      }
      if (wrongGuessAudioRef.current) {
        wrongGuessAudioRef.current.pause()
        wrongGuessAudioRef.current.currentTime = 0
      }
      if (rightGuessAudioRef.current) {
        rightGuessAudioRef.current.pause()
        rightGuessAudioRef.current.currentTime = 0
      }
      wheelMusicRef.current = null
      wrongGuessAudioRef.current = null
      rightGuessAudioRef.current = null
    }
  }, [])

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
      JSON.stringify({ players, activePlayerId, rounds, activeRoundId, openedLetters, usedLetters }),
    )
  }, [players, activePlayerId, rounds, activeRoundId, openedLetters, usedLetters])

  useEffect(() => {
    return () => {
      if (yakubovichTimerRef.current) {
        clearTimeout(yakubovichTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="page">
      <header className="topbar">
        <h1>Поле Чудес — студия ведущего</h1>
        <div className="topbarActions">
          <button className="ghost" onClick={() => setBigBoardMode((v) => !v)}>
            {bigBoardMode ? 'Обычное табло' : 'Big Board'}
          </button>
          <button className="ghost" onClick={() => setPartyMode((v) => !v)}>
            {partyMode ? 'Праздничный режим: ON' : 'Праздничный режим: OFF'}
          </button>
          <button className="ghost" onClick={() => setShowHotkeys((v) => !v)}>
            {showHotkeys ? 'Скрыть hotkeys' : 'Показать hotkeys'}
          </button>
          <button className="ghost" onClick={prevRound}>Предыдущий раунд</button>
          <button className="ghost" onClick={addRound}>+ Раунд</button>
          <button className="ghost" onClick={nextRound}>Следующий раунд</button>
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
          {activePlayer ? (
            <strong>
              {activePlayer.avatar.includes('.') || activePlayer.avatar.startsWith('data:') || activePlayer.avatar.startsWith('http') ? (
                <>
                  <img src={activePlayer.avatar} alt="" style={{ width: 24, height: 24, borderRadius: 4, marginRight: 8, verticalAlign: 'middle' }} />
                  {activePlayer.name}
                </>
              ) : (
                `${activePlayer.avatar} ${activePlayer.name}`
              )}
            </strong>
          ) : (
            <strong>Игрок не выбран</strong>
          )}
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
                <input value={roundTitle} onChange={(e) => patchActiveRound({ title: e.target.value })} placeholder="Название раунда" />
                <input value={hint} onChange={(e) => patchActiveRound({ hint: e.target.value })} placeholder="Вопрос" />
                <div className="visibilityInputWrap">
                  <input
                    type={showPhraseInput ? 'text' : 'password'}
                    value={phrase}
                    onChange={(e) => patchActiveRound({ phrase: e.target.value.toUpperCase() })}
                    placeholder="Загаданное слово / фраза"
                  />
                  <button
                    type="button"
                    className="ghost visibilityToggleBtn"
                    onClick={() => setShowPhraseInput((v) => !v)}
                  >
                    {showPhraseInput ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <button className="ghost" onClick={() => setShowAnswer((v) => !v)}>
                  {showAnswer ? 'Скрыть ответ' : 'Показать ответ ведущему'}
                </button>
              </div>

              <div className="roundsRow">
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    className={`ghost ${r.id === activeRound.id ? 'activeRoundBtn' : ''}`}
                    onClick={() => {
                      setActiveRoundId(r.id)
                      setOpenedLetters([])
                      setUsedLetters([])
                    }}
                  >
                    {r.title || 'Без названия'}
                  </button>
                ))}
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

            <div className="wheelContent">
              <div className='wheelYakubovich'>
                <img src={showYakubovichSpeech ? yakunovichSayImg : yakunovichImg} alt="Ведущий" />
                {showYakubovichSpeech && (
                  <div className="yakubovichSpeechBubble">
                    {yakubovichSpeech}
                  </div>
                )}
              </div>

              <div className="wheelCircleWrap">
              <div className="wheelCircle">
                {SECTORS.map((s, i) => {
                  const angle = (360 / SECTORS.length) * i
                  const style = {
                    transform: `rotate(${angle}deg) translateY(-121px) rotate(${-angle}deg)`,
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
                      {p.avatar.includes('.') || p.avatar.startsWith('data:') || p.avatar.startsWith('http') ? (
                        <img src={p.avatar} alt={p.name} className="avatarImg" />
                      ) : (
                        <span className="avatar">{p.avatar}</span>
                      )}
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
                        <button className="mini" onClick={() => handleAvatarUpload(p.id)}>📷</button>
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
