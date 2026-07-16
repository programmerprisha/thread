
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://thread-lilac.vercel.app',
  ], 
  methods: ['GET', 'POST', 'OPTIONS'],
}))
app.use(express.json())

app.post('/api/reply-suggestions', async (req, res) => {
  const { transcript, history } = req.body

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  const endpoint = process.env.VITE_AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')
  const deployment = process.env.VITE_AZURE_OPENAI_DEPLOYMENT
  const apiKey = process.env.VITE_AZURE_OPENAI_KEY

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview` 

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Thread backend'
  })
})


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Thread backend running on port ${PORT}`)
  console.log('Endpoints ready:')
  console.log('  GET  /health')
  console.log('  POST /api/reply-suggestions')
  console.log('  POST /api/speech-token')
})