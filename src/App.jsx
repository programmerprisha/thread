import { useState, useEffect, useRef } from 'react'

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

import { supabase } from './supabase.js'
import Auth from './auth.jsx'

import './App.css'

const SAY_FIRST = "My speech is a little harder to understand right now, thanks for your patience."

const SAVED_PHRASES = [
  { id: 1, text: 'Can you repeat that?', category: 'calls'},
  { id: 2, text: 'Can we reschedule?', category: 'calls'},
  { id: 3, text: "I was really scared when it happened.", category: 'calls'},
  { id: 4, text: "Thank you for calling and checking in on me", category: 'calls'},
  { id: 5, text: "Give me a second, I am typing this out.", category: 'daily'}, 
  { id: 6, text: 'Can you grab that for me?', category: 'daily'}, 
  { id: 7, text: "I am going to take rest now.", category: 'daily'}, 
  { id: 8, text: "I am hungry and would like food.", category: 'daily'},
  { id: 9, text: "It has been hurting for about a week.", category: 'medical'},
  { id: 10, text: 'Can you give me my medicine?', category: 'medical'},
  { id: 11, text: "I am here for my appointment.", category: 'medical'},
  { id: 12, text: "I have been feeling pain.", category: 'medical'}, 
]

const CATEGORIES = [
  { id: 'calls', label: 'Calls'}, 
  { id: 'daily', label: 'Daily'}, 
  { id: 'medical', label: 'Medical'},
]

const HISTORY_STORAGE_KEY = 'thread-phrase-history'
const MAX_HISTORY_LENGTH = 10

const SERVER_URL = import.meta.env.PROD ? 'https://thread-production-cf63.up.railway.app': 'http://localhost:3001'

function speak(text) {
    if (!text.trim()) return 

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
}

function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Could not load history:', error)
    return []
  }
}

function saveHistoryToStorage(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Could not save history:', error)
    return []
  }
}

  async function askForReplySuggestions(theirTranscript, herHistory) {
    const response = await fetch (`${SERVER_URL}/api/reply-suggestions`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      }, 
      body: JSON.stringify({
        transcript: theirTranscript,
        history: herHistory,
      }),
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    return data.suggestions
  }


  export default function App() {
    const [text, setText] = useState('')
    const [activeCategory, setActiveCategory] = useState('calls')
    const [history, setHistory] = useState(() => loadHistoryFromStorage())

    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [replySuggestions, setReplySuggestions] = useState([])
    const [isThinking, setIsThinking] = useState(false)
    const recognizerRef = useRef(null)
    const [user, setUser] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      })

      const {data: { subscription }} = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null)
        }
      )
      return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
      saveHistoryToStorage(history)
    }, [history])

    const handleSignOut = async () => {
      await supabase.auth.signOut()
    }

    const handleTyping = (e) => {
      setText(e.target.value)
    }
    
    const handleSpeak = () => {
      speak(text)
      addToHistory(text)
    }
    
    const handleClear = () => {
      setText('')
    }

    const handleSayFirst = () => {
      speak(SAY_FIRST)
      addToHistory(SAY_FIRST)
    }

    const handleLoadPhrase = (phraseText) => {
      setText(phraseText)
    }

    const handleSpeakPhrase = (phraseText) => {
      speak(phraseText)
      addToHistory(phraseText)
    }

    const addToHistory = (phraseText) => {
      if (!phraseText.trim()) return 
      setHistory((previousHistory) => {
        const withoutDuplicate = previousHistory.filter(
          (item) => item !== phraseText
        )
        return [phraseText, ...withoutDuplicate].slice(0, MAX_HISTORY_LENGTH)
      })
    }

    const handleSpeakRecent = (phraseText) => {
      speak(phraseText)
      addToHistory(phraseText)
    }

    const matchingHistorySuggestions = 
      text.trim().length > 0
      ? history.filter((pastPhrase) => 
          pastPhrase.toLowerCase().includes(text.toLowerCase())
        )
      : []

    const visiblePhrases = SAVED_PHRASES.filter(
      (phrase) => phrase.category === activeCategory
    )

    const handleToggleListen = () => {
      if (isListening) {
        stopListening()
      } else {
        startListening()
      }
    }
    
  const startListening = async () => {
    try {
      const tokenResponse = await fetch(`${SERVER_URL}/api/speech-token`, {
        method: 'POST',
      })

      if (!tokenResponse.ok) {
        console.error('Could not get speech token from server')
        return
      }

      const { token, region } = await tokenResponse.json()
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        token,
        region
      )
      speechConfig.speechRecognitionLanguage = 'en-US'

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()

      const recognizer = new SpeechSDK.SpeechRecognizer(
        speechConfig,
        audioConfig
      )

      recognizer.recognizing = (sender, event) => {
        setTranscript(event.result.text)
      }

      recognizer.recognized = (sender, event) => {
        const finalText = event.result.text
        if (finalText && finalText.trim().length > 0) {
          setTranscript(finalText)
          fetchSuggestionsFor(finalText)
        }
      }

      recognizer.startContinuousRecognitionAsync()
      recognizerRef.current = recognizer
      setIsListening(true)

    } catch (error) {
      console.error('Could not start listening:', error)
    }
  }
    

    const stopListening = () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync()
        recognizerRef.current = null
      }
      setIsListening(false)
    }

    const fetchSuggestionsFor = async (theirText) => {
      setIsThinking(true)
      setReplySuggestions([])
      try {
        const suggestions = await askForReplySuggestions(theirText, history)
        setReplySuggestions(suggestions)
      } catch (error) {
        console.error('Could not get reply suggestions:', error)
        setReplySuggestions([])
      } finally {
        setIsThinking(false)
      }
    }

    const handleSpeakSuggestion = (suggestionText) => {
      speak(suggestionText)
      addToHistory(suggestionText)
    }

  if (authLoading) return null

  if (!user) return <Auth />

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Thread</h1>
        <div className="header-user">
          <span className="header-email">{user.email}</span>
          <button className="signout-btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

        <main className="main">

          <section>
            <button
              className={
                isListening ? 'listen-btn listen-btn--active' : 'listen-btn'
              }
              onClick={handleToggleListen}
            >
              {isListening ? '🔴 Listening...' : '🎙️ Listen'}
            </button>

            {transcript && (
              <div className="transcript-box">
                <span className="transcript-label">Transcript</span>
                <p className="transcript-text">{transcript}</p>
              </div>
            )}

            {isThinking && (
              <p className="matching-hint">Thinking of replies...</p>
            )}

            {!isThinking && replySuggestions.length > 0 && (
              <div className="reply-suggestions-row">
                {replySuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="reply-suggestion-chip"
                    onClick={() => handleSpeakSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </section>

          <textarea 
            className="type-box"
            placeholder="Type what you want to say...."
            value={text}
            onChange={handleTyping}
          />

          {matchingHistorySuggestions.length > 0 && (
            <div className="suggestions-row">
              {matchingHistorySuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => setText(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="actions">
            <button className="speak-btn" onClick={handleSpeak}>
              🔊 Speak
            </button>
            <button className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>

          <section>
            <h2 className="section-label">Say this first</h2>
            <button className="say-first-btn" onClick={handleSayFirst}>
              <span className="say-first-icon">ℹ️</span>
              <span>{SAY_FIRST}</span>
            </button>
          </section>

          {history.length > 0 && (
            <section>
              <h2 className="section-label">Recent</h2>
              <div className="recent-list">
                {history.map((phraseText, i) => (
                  <button
                    key={i}
                    className="recent-item"
                    onClick={() => handleSpeakRecent(phraseText)}
                  >
                    <span className="recent-icon">🔊</span>
                    <span className="recent-text">{phraseText}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section> 
            <h2 className="section-label">Saved phrases</h2>
            <div className="category-tabs">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat.id}
                  className={
                    activeCategory === cat.id
                    ? 'category-tab category-tab--active'
                    : 'category-tab'
                  }
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="phrase-grid">
              {visiblePhrases.map((phrase) => (
                <div key={phrase.id} className="phrase-tile">
                  <button
                    className="phrase-text-btn"
                    onClick={() => handleLoadPhrase(phrase.text)}
                  >
                    {phrase.text}
                  </button>
                  <button 
                    className="phrase-speak-btn"
                    onClick={() => handleSpeakPhrase(phrase.text)}
                    aria-label="Speak this phrase now"
                  > 
                    🔊
                  </button>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    )
  }