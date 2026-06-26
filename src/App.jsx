// prisha note: this is the actual app
// describes one thing: box where we can tpye into, button speak 

// prisha note: tool from react (useState) that lets app remember and automatically redraw the screen
// will remember what user types and will redraw it
import { useState } from 'react'
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
  { id : 12, text: "I have been feeling pain.", category: 'medical'}, 
]

const CATEGORIES = [
  { id: 'calls', label: 'Calls'}, 
  { id: 'daily', label: 'Daily'}, 
  { id: 'medical', label: 'Medical'},
]


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


// prisha note: app itself 
// prisha note: function that returns what should appear on the screen -- react will call this function and draw whatever it returns

export default function App() {
    // prisha note: setText() is the only way to change text as whenever we call setText(something), React will automatically redraw the screen to match the new value
    const [text, setText] = useState('')
    const [activeCategory, setActiveCategory] = useState('calls')
    //prisha note: function runs everytime user types anytrhing (letter)
    // e is event and information about what happened -- e.target.value is whatever is currently typed
    const handleTyping = (e) => {
        setText(e.target.value)
    }
    // prisha note: runs whenever user press speakl button 
    const handleSpeak = () => {
        speak(text)
    }
    // prisha note: runs whenever user presses clear button
    const handleClear = () => {
        setText('')
    }

    // prisha note: when "Say this first" button is tapped, this will be immdietly spoken
    const handleSayFirst = () => {
      speak(SAY_FIRST)
    }

    // speak function for when type phrase into type box and it loads phrase into type box
    const handleLoadPhrase = (phraseText) => {
      setText(phraseText)
    }

    // speak function for when little speaker icon is taped on a saved phrase tile
    const handleSpeakPhrase = (phraseText) => {
      speak(phraseText)
    }

    // prisha note: only shows phrases of active category
    // so will only show phrase for active category
    const visiblePhrases = SAVED_PHRASES.filter(
      (phrase) => phrase.category === activeCategory
    )


    // prisha note: actual jsx code -- html code which will make everything 
    return (
        <div className = "app">
            {/* app name at the top == job of header */} 
            <header className="header">
                <h1 className="logo">Thread</h1>
            </header>

            <main className="main">
                {/* typebox */}
                <textarea 
                className="type-box"
                placeholder="Type what you want to say...."
                value={text}
                onChange={handleTyping}
                />
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
              <h2 className = "section-label">Say this first</h2>
              <button className="say-first-btn" onClick = {handleSayFirst}>
                <span className="say-first-icon">ℹ️</span>
                <span>{SAY_FIRST}</span>
              </button>
            </section>

            {/* saved phrases with category tabs */} 
            <section> 
              <h2 className="section-label">Saved phrases</h2>
              {/* category tabs row */}
              <div className="category-tabs">
                {CATEGORIES.map((cat) => (
                  <button 
                    key = {cat.id}
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
                {}
              </div>

              {/* actual phrase tiles which show phrases that match currently active category*/}
              <div className = "phrase-grid">
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