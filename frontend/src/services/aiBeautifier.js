import axios from 'axios'

export const beautifyLead = async (description, configs) => {
  if (!configs || configs.length === 0) {
    throw new Error('No AI configuration found. Please add an API key in Settings.')
  }

  // Find primary config or use first
  const config = configs.find(c => c.is_primary) || configs[0]
  const { provider, model, api_key } = config

  const allowedKeys = ['Title', 'Company', 'Skills', 'Contact', 'Budget', 'Requirements', 'Benefits', 'Location']

  const prompt = `
    Output ONLY a pipe-separated list of key=value pairs using these exact keys:
    ${allowedKeys.map(k => `- ${k}`).join('\n    ')}
    
    Rules:
    - Start directly with the first key=value, no sentences before
    - Use | to separate pairs, e.g. Title=Senior Dev | Skills=Python,React
    - Never include any text before or after the list
    - If information is missing, use "Not specified"
    
    Description:
    "${description}"
  `

  try {
    let response;
    
    const providerLower = provider.toLowerCase();
    
    // OpenRouter Support
    if (providerLower.includes('openrouter')) {
      response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'LEADFinder AI',
          'Content-Type': 'application/json'
        }
      })
      return response.data.choices[0].message.content
    }

    // GitHub Models Support (GitHub AI endpoint)
    if (providerLower.includes('github')) {
      const githubEndpoint = `https://models.github.ai/inference/chat/completions`
      
      response = await axios.post(githubEndpoint, {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data.choices[0].message.content
    }

    // Azure AI Inference Support
    if (providerLower.includes('azure')) {
      response = await axios.post('https://models.inference.ai.azure.com/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data.choices[0].message.content
    }

    // Standard OpenAI
    if (providerLower.includes('openai')) {
      response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data.choices[0].message.content
    } 
    
    // Anthropic Support
    if (providerLower.includes('anthropic') || providerLower.includes('claude')) {
      response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      })
      
      return response.data.content[0].text
    }
    
    throw new Error(`Provider ${provider} not supported for frontend generation yet.`)
    
  } catch (err) {
    console.error('AI Generation Error:', err)
    throw new Error(`AI Beautification failed: ${err.response?.data?.error?.message || err.message}`)
  }
}

const ALLOWED_KEYS = ['Title', 'Company', 'Skills', 'Contact', 'Budget', 'Requirements', 'Benefits', 'Location']

export const parseBeautifiedData = (text) => {
  if (!text) return null
  const pairs = text.split('|')
  const data = {}
  let hasValid = false
  pairs.forEach(p => {
    const [rawKey, ...valueParts] = p.split('=')
    const key = rawKey?.trim()
    if (key && ALLOWED_KEYS.includes(key) && valueParts.length > 0) {
      data[key] = valueParts.join('=').trim()
      hasValid = true
    }
  })
  return hasValid ? data : null
}
