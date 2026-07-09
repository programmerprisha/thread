// prisha note: this is the actual app
// describes one thing: box where we can tpye into, button speak 

// prisha note: tool from react (useState, useEffect, useRef) that lets app remember and automatically redraw the screen
// will remember what user types and will redraw it
// useRef lets us hold onto the Azure microphone object across renders without causing re-draws
import { useState, useEffect, useRef } from 'react'

// prisha note: need Azure Speech SDK 
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

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
  // Azure OpenAI sends back 3 short reply suggestions.
  async function askForReplySuggestions(theirTranscript, herHistory) {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT
    const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY

    // prisha note: URL Azure OpenAI 
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview`

    const systemPrompt = `You are helping someone who has difficulty speaking communicate quickly in conversation. Someone just said something to them. Suggest exactly 3 short, natural replies they might want to say back.

  Rules:
  - Each reply must be under 12 words.
  - Write in the style of their own past phrases shown below, if relevant.
  - Return ONLY a JSON array of 3 strings, nothing else. Example: ["Sure, that works", "Can we do tomorrow instead?", "Let me check and get back to you"]

  Their own past phrases (for style reference):
  ${herHistory.slice(0, 8).join('\n')}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `They just said: "${theirTranscript}"` },
        ],
        max_completion_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
    const errorBody = await response.json()
    console.log('Azure error details:', JSON.stringify(errorBody))
    throw new Error(`Azure OpenAI error: ${response.status}`)
    }

    const data = await response.json()
    const rawText = data.choices[0].message.content

    // prisha note: the model returns a JSON string like ["reply 1", "reply 2", "reply 3"]
    // JSON.parse turns that string into a real JavaScript array
    try {
      return JSON.parse(rawText)
    } catch (error) {
      console.error('Could not parse AI suggestions:', rawText)
      return []
    }
  }


// prisha note: app itself 
// prisha note: function that returns what should appear on the screen -- react will call this function and draw whatever it returns
  export default function App() {
    // prisha note: setText() is the only way to change text as whenever we call setText(something), React will automatically redraw the screen to match the new value
    const [text, setText] = useState('')
    const [activeCategory, setActiveCategory] = useState('calls')
    const [history, setHistory] = useState(() => loadHistoryFromStorage())

    // NEW: is the mic currently on and listening to the other person?
    const [isListening, setIsListening] = useState(false)

    // NEW: live transcript of what the OTHER person is saying
    // this updates word by word as they talk
    const [transcript, setTranscript] = useState('')

    // NEW: the 3 AI-suggested replies that appear after the other person finishes a sentence
    const [replySuggestions, setReplySuggestions] = useState([])

    // NEW: true while we're waiting for Azure OpenAI to send back suggestions
    const [isThinking, setIsThinking] = useState(false)

    // NEW: holds the actual Azure microphone "recognizer" object
    // prisha note: we use useRef (not useState) because changing this shouldn't
    // trigger a screen redraw - it's just a behind-the-scenes tool we hold onto
    const recognizerRef = useRef(null)

    useEffect(() => {
      saveHistoryToStorage(history)
    }, [history])

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

    const startListening = () => {
      const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY
      const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION

      // prisha note: SpeechConfig is like the settings for our microphone connection
      // i tell it our key (password) and which Azure region to use
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        speechKey,
        speechRegion
      )
      speechConfig.speechRecognitionLanguage = 'en-US'

      // prisha note: this tells Azure to use the computer's built-in microphone
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

      // prisha note: "recognized" fires ONCE when they pause or finish a sentence
      // this is the final, complete version - this is what we send to the AI
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
    return (
      <div className="app">
        {/* app name at the top == job of header */} 
        <header className="header">
          <h1 className="logo">Thread</h1>
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