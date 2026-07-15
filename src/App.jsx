// prisha note: this is the actual app
// describes one thing: box where we can tpye into, button speak 

// prisha note: tool from react (useState, useEffect, useRef) that lets app remember and automatically redraw the screen
// will remember what user types and will redraw it
// useRef lets us hold onto the Azure microphone object across renders without causing re-draws
import { useState, useEffect, useRef } from 'react'

// prisha note: need Azure Speech SDK 
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

// prisha note: address of backend server because i will call this instead of calling Azure directly
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

//prisha note: regular helper function (not react-specific) that makes the computer talk
// no download needed -- most modern browsers have this

function speak(text) {
    // prisha note: default case, if box is empty no talking required
    if (!text.trim()) return 

    // SpeechSynthesisUtterance is built in "thing to be spoken"
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95

    //prisha note: will speak in built in voice, may change this later if possible to user's voice
    window.speechSynthesis.speak(utterance)
}

// prisha note: reads whatever history we previously saved
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




  // prisha note: AI listener transcripter
  // once the other person finishes talking, it will send:
  //   1. what they just said (transcript)
  //   2. her own past phrases (so AI can match her style)
  // server sends back 3 short reply suggestions.
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


// prisha note: app itself 
// prisha note: function that returns what should appear on the screen -- react will call this function and draw whatever it returns
  export default function App() {
    // prisha note: setText() is the only way to change text as whenever we call setText(something), React will automatically redraw the screen to match the new value
    const [text, setText] = useState('')
    const [activeCategory, setActiveCategory] = useState('calls')
    const [history, setHistory] = useState(() => loadHistoryFromStorage())

   // prisha note: is the mic listening or not 
    const [isListening, setIsListening] = useState(false)

    //prisha note: live transcript of what the OTHER person is saying
    const [transcript, setTranscript] = useState('')

    // prisha note: the 3 AI-suggested replies 
    const [replySuggestions, setReplySuggestions] = useState([])

    // prisha note: true while we're waiting for Azure OpenAI to send back suggestions
    const [isThinking, setIsThinking] = useState(false)

    // prisha note: holds azure SDK recognizer object so we can stop it later
    const recognizerRef = useRef(null)

    // prisha note: tracks who is logged in 
    const [user, setUser] = useState(null)

    // prisha note: gives right screen of sign in or sign up
    const [authLoading, setAuthLoading] = useState(true)

    // prisha note: checks for existing sesion when website loads
    useEffect(() => {
      // prisha note: getSesssion() checks if user is already logged in 
      // from a previous visit -- supabase stores the session automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      })

      // prisha note: onAuthStateChange() will run whenever user logs in or logs out
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

    // prisha note: signs user out
    const handleSignOut = async () => {
      await supabase.auth.signOut()
    }

    // prisha note: function runs everytime user types anything (letter)
    // e is event and information about what happened -- e.target.value is whatever is currently typed
    const handleTyping = (e) => {
      setText(e.target.value)
    }
    // prisha note: runs whenever user presses speak button 
    const handleSpeak = () => {
      speak(text)
      addToHistory(text)
    }
    // prisha note: runs whenever user presses clear button
    const handleClear = () => {
      setText('')
    }

    // prisha note: when "Say this first" button is tapped, this will be immediately spoken
    const handleSayFirst = () => {
      speak(SAY_FIRST)
      addToHistory(SAY_FIRST)
    }

    // speak function for when type phrase into type box and it loads phrase into type box
    const handleLoadPhrase = (phraseText) => {
      setText(phraseText)
    }

    // speak function for when little speaker icon is taped on a saved phrase tile
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

    // prisha note: only shows phrases of active category
    const visiblePhrases = SAVED_PHRASES.filter(
      (phrase) => phrase.category === activeCategory
    )

    
    // Listen button logic
    const handleToggleListen = () => {
      if (isListening) {
        stopListening()
      } else {
        startListening()
      }
    }

    // prisha note: changed this now to ask server for a temporary token instead of using the real key in the browser (token expires in 10 mins)
    
  const startListening = async () => {
    try {
      // prisha note: ask OUR server for a temporary speech token
      // the server has the real key - it gives us a short-lived token
      const tokenResponse = await fetch(`${SERVER_URL}/api/speech-token`, {
        method: 'POST',
      })

      if (!tokenResponse.ok) {
        console.error('Could not get speech token from server')
        return
      }

      const { token, region } = await tokenResponse.json()

      // prisha note: now we use the token (not the real key) to set up the Azure Speech recognizer
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

      // prisha note: "recognizing" fires WHILE someone is still talking
      // gives us the live, still-changing version of the transcript
      recognizer.recognizing = (sender, event) => {
        setTranscript(event.result.text)
      }

      // prisha note: "recognized" fires ONCE when they pause/finish
      // this is the final version - we send this to the AI
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

    // prisha note: calls Azure OpenAI to get reply suggestions
    // runs automatically after the other person finishes talking
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

    // prisha note: runs when user taps one of the AI reply chips
    // speaks it immediately and saves it to user's history
    const handleSpeakSuggestion = (suggestionText) => {
      speak(suggestionText)
      addToHistory(suggestionText)
    }

  // prisha note: actual jsx code -- html code which will make everything 
  // prisha note: still checking if user is logged in - show nothing
  // this prevents a flash of the login screen on page refresh
  if (authLoading) return null

  // prisha note: no user logged in - show the login screen
  if (!user) return <Auth />

  // prisha note: user is logged in - show Thread!
  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Thread</h1>
        {/* NEW: show user email and sign out button */}
        <div className="header-user">
          <span className="header-email">{user.email}</span>
          <button className="signout-btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

        <main className="main">

          {/* Listen section */}
          <section>
            <button
              className={
                isListening ? 'listen-btn listen-btn--active' : 'listen-btn'
              }
              onClick={handleToggleListen}
            >
              {isListening ? '🔴 Listening...' : '🎙️ Listen'}
            </button>

            {/* only shows when there's something transcribed */}
            {transcript && (
              <div className="transcript-box">
                <span className="transcript-label">Transcript</span>
                <p className="transcript-text">{transcript}</p>
              </div>
            )}

            {/* shows while waiting for AI */}
            {isThinking && (
              <p className="matching-hint">Thinking of replies...</p>
            )}

            {/* shows the 3 reply suggestions once AI responds */}
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

          {/* typebox */}
          <textarea 
            className="type-box"
            placeholder="Type what you want to say...."
            value={text}
            onChange={handleTyping}
          />

          {/* search-as-you-type suggestions from her history */}
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

          {/* buttons row */}
          <div className="actions">
            <button className="speak-btn" onClick={handleSpeak}>
              🔊 Speak
            </button>
            <button className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>

          {/* say first button */}
          <section>
            <h2 className="section-label">Say this first</h2>
            <button className="say-first-btn" onClick={handleSayFirst}>
              <span className="say-first-icon">ℹ️</span>
              <span>{SAY_FIRST}</span>
            </button>
          </section>

          {/* recent phrases - only show if there's at least one */}
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

          {/* saved phrases with category tabs */} 
          <section> 
            <h2 className="section-label">Saved phrases</h2>
            {/* category tabs row */}
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

            {/* actual phrase tiles which show phrases that match currently active category */}
            <div className="phrase-grid">
              {visiblePhrases.map((phrase) => (
                <div key={phrase.id} className="phrase-tile">
                  <button
                    className="phrase-text-btn"
                    onClick={() => handleLoadPhrase(phrase.text)}
                  >
                    {phrase.text}
                  </button>
                  {/* speaker icon speaks instantly */}
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