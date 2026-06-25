// prisha note: this is the actual app
// describes one thing: box where we can tpye into, button speak 

// prisha note: tool from react (useState) that lets app remember and automatically redraw the screen
// will remember what user types and will redraw it
import { useState } from 'react'
import './App.css'


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
            </main>
        </div>
    )
}