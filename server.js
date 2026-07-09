
// prisha note: server.js = Thread's backend proxy
// prisha note: Purpose of Node.js server is to sit betweenthe React app and Azure, so our secret API keys never get exposed in the browser.
// The React app will call this server and the server calls Azure.
// Azure keys stay secret on the server, never in the browser yayyyy


// prisha note: dotenv reads our .env file and makes the keys available as import.meta.env.VARIABLE_NAME in React, but in Node.js we access them as process.env.VARIABLE_NAME
import 'dotenv/config'

// prisha note: express is the framework that lets us create a server and define what happens when the frontend calls each URL
import express from 'express'

// prisha note: cors lets our React app (port 5173) talk to this server
import cors from 'cors'

const app = express()
const PORT = 3001

// prisha note: these two lines are middleware - they run on every request before it reaches our endpoints.
// express.json() lets us read JSON from the request body.
// cors() allows our React frontend to call this server.
app.use(cors())
app.use(express.json())


// prisha note: number 1 is /api/reply-suggestions
// prisha note: the user listening and replying feature
app.post('/api/reply-suggestions', async (req, res) => {
  // Pull the data the React app sent us
  const { transcript, history } = req.body

  // Basic validation - don't call Azure if there's nothing to work with
  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  const endpoint = process.env.VITE_AZURE_OPENAI_ENDPOINT
  const deployment = process.env.VITE_AZURE_OPENAI_DEPLOYMENT
  const apiKey = process.env.VITE_AZURE_OPENAI_KEY

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2025-01-01-preview`

  const systemPrompt = `You are helping someone who has difficulty speaking communicate quickly in conversation. Someone just said something to them. Suggest exactly 3 short, natural replies they might want to say back.

Rules:
- Each reply must be under 12 words.
- Write in the style of their own past phrases shown below, if relevant.
- Return ONLY a JSON array of 3 strings, nothing else. Example: ["Sure, that works", "Can we do tomorrow instead?", "Let me check and get back to you"]

Their own past phrases (for style reference):
${(history || []).slice(0, 8).join('\n')}`

  try {
    const azureResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `They just said: "${transcript}"` },
        ],
        max_completion_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!azureResponse.ok) {
      const errorBody = await azureResponse.json()
      console.error('Azure OpenAI error:', errorBody)
      return res.status(500).json({ error: 'Azure OpenAI call failed' })
    }

    const data = await azureResponse.json()
    const rawText = data.choices[0].message.content

    // Parse the JSON array the model returned
    try {
      const suggestions = JSON.parse(rawText)
      res.json({ suggestions })
    } catch (parseError) {
      console.error('Could not parse AI response:', rawText)
      res.status(500).json({ error: 'Could not parse AI response' })
    }

  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})


// prisha note: /api/speech-token
// prisha note: Azure Speech SDK needs a key to start listening.
// Instead of putting the key in the browser, give the browser a temporary token that expires after 10 minutes so the real key stays on our server.
app.post('/api/speech-token', async (req, res) => {
  const speechKey = process.env.VITE_AZURE_SPEECH_KEY
  const speechRegion = process.env.VITE_AZURE_SPEECH_REGION

  try {
    const tokenResponse = await fetch(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Could not get speech token' })
    }

    const token = await tokenResponse.text()
    res.json({ token, region: speechRegion })

  } catch (error) {
    console.error('Speech token error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})


// prisha note: start the server!
app.listen(PORT, () => {
  console.log(`Thread backend running on http://localhost:${PORT}`)
  console.log('Endpoints ready:')
  console.log('  POST /api/reply-suggestions')
  console.log('  POST /api/speech-token')
})