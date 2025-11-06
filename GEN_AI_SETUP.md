# Gen AI Platform Setup Guide

This guide explains how to configure KanbanX to use the Gen AI Platform for enhanced agent intelligence.

## Overview

KanbanX can optionally integrate with the **Gen AI Platform** (Ahold Delhaize's internal Azure OpenAI service) to provide:

- **Enhanced Natural Language Understanding**: The agent can understand more flexible commands
- **Contextual Responses**: Intelligent, natural language responses based on task context
- **General Queries**: Answer questions about the project, tasks, and workflow
- **Task Recommendations**: AI-powered suggestions for task prioritization

## Getting Access

### Step 1: Get a Sandbox API Key

1. Visit the onboarding portal: https://beast.ah.technology/gen-ai-onboarding
2. Request **Sandbox** access (available to all users)
3. Access the developer portal: https://portal.api-ai.digitaldev.nl/
4. Navigate to your **Profile** page
5. Copy your **Subscription Key** for the Sandbox product

### Step 2: Configure KanbanX

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your API key:
   ```bash
   # Gen AI Platform Configuration
   AZURE_OPENAI_API_KEY=your-sandbox-api-key-here
   AZURE_OPENAI_ENDPOINT=https://api-ai.digitaldev.nl
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   ```

4. Restart the backend server:
   ```bash
   npm run dev
   ```

## Available Models

The Gen AI Platform offers multiple models. Choose based on your needs:

### Recommended for KanbanX

| Model | Best For | Rate Limit (Sandbox) |
|-------|----------|----------------------|
| **gpt-4o** | General chat, balanced performance | 100 req/100s |
| **gpt-4o-mini** | Fast responses, cost-effective | 100 req/100s |
| **gpt-41** (gpt-41) | Long context, advanced reasoning | 100 req/60s |
| **gpt-5** | Best-in-class reasoning, multimodal | 100 req/100s |

### Specialized Models

| Model | Best For | Rate Limit (Sandbox) |
|-------|----------|----------------------|
| **o1** | Deep reasoning, complex logic | 10 req/100s |
| **o3** | Next-gen reasoning with web browsing | 100 req/60s |
| **o3-mini** | Fast reasoning for coding/math | 100 req/60s |

### To Change Models

Edit the `AZURE_OPENAI_DEPLOYMENT` variable in your `.env` file:

```bash
# For GPT-4.1 (1M token context)
AZURE_OPENAI_DEPLOYMENT=gpt-41

# For GPT-5 (best reasoning)
AZURE_OPENAI_DEPLOYMENT=gpt-5

# For faster responses
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

## Testing the Integration

### 1. Check LLM Status

The backend will log on startup:

```
✅ LLM Service: Connected to Gen AI Platform (gpt-4o)
```

Or if not configured:

```
⚠️  AZURE_OPENAI_API_KEY not set. LLM features will be disabled.
```

### 2. Test in the UI

1. Open http://localhost:5173
2. Login with admin/password
3. Click "🤖 Show Agent"
4. Try these commands:

**Basic Commands** (work with or without LLM):
```
show available tasks
claim task: <task-id>
```

**Enhanced Commands** (require LLM):
```
What should I work on next?
Tell me about the tasks in progress
Which tasks are blocked?
What's the overall project status?
```

### 3. Verify in Action Cards

When LLM is enabled, you'll see:
- More accurate intent parsing
- Natural language responses
- Contextual suggestions
- Token usage statistics in action cards

## Production Access

For production use with higher rate limits:

1. Complete the **AI IT Quick Scan** via Midas Lagerweij (Midas.Lagerweij@ah.nl)
2. If handling PII data: Complete **PIA & Record Keeping** via Lilian Janssen (lilian.janssen@ah.nl)
3. Request **OpenAI - Production** subscription in Beast
4. Update your subscription key in `.env`

**Production Benefits:**
- No rate limits on GPT-4o (900 req/60s)
- Access to all models
- Legal approval for production use

## Rate Limits & Costs

### Sandbox Limits
- Most endpoints: **100 requests per 100 seconds**
- Reasoning models (o1): **10 requests per 100 seconds**
- No token limits
- **NOT for production use**

### Token Usage

KanbanX is optimized for efficiency:
- Intent parsing: ~200 tokens per request
- Response generation: ~500 tokens per request
- General queries: ~1000 tokens per request

Average: **700 tokens per chat message**

## Troubleshooting

### "LLM service not configured"

**Solution**: Add `AZURE_OPENAI_API_KEY` to your `.env` file and restart the backend.

### "LLM API error (401): Unauthorized"

**Solution**: Check that your API key is correct and has not expired.

### "Rate limit exceeded"

**Solution**: 
- Sandbox has 100 req/100s limit
- Wait 100 seconds or request Production access
- Switch to faster model (gpt-4o-mini)

### Agent works but responses are basic

**Cause**: LLM not configured - falling back to regex patterns.

**Solution**: Add API key to enable enhanced responses.

## Architecture

```
User Message
    ↓
parseIntent() → [LLM if available] → Intent + Entities
    ↓                [Regex fallback]
executeAction() → Call MCP endpoint → Action Result
    ↓
generateResponse() → [LLM if available] → Natural language
    ↓                  [Template fallback]
Display to User
```

## Responsible Use

- **Token Consumption**: Use appropriate `max_tokens` limits
- **Model Selection**: Choose the right model for the task
- **Caching**: Consider caching responses for repeated queries
- **Error Handling**: Always have fallback logic

## Code Example

The LLM service is used in `backend/src/routes/agent.ts`:

```typescript
// Enhanced intent parsing with LLM
const { intent, params } = await parseIntent(message);

// Generate natural language response
if (llmService.isAvailable()) {
  responseText = await llmService.generateResponse(message, [action]);
}
```

See `backend/src/services/llm.ts` for implementation details.

## More Information

- **Documentation**: https://portal.api-ai.digitaldev.nl/docs
- **Code Examples**: https://github.com/RoyalAholdDelhaize/genai-apim-examples
- **Training**: https://github.com/RoyalAholdDelhaize/genai-microsoft-training
- **Onboarding**: https://beast.ah.technology/gen-ai-onboarding

## Summary

✅ **Optional Feature**: Works without API key using basic regex parsing  
✅ **Easy Setup**: Just add API key to `.env` file  
✅ **Flexible**: Choose from 10+ models based on your needs  
✅ **Production-Ready**: Legal approval process for production use  
✅ **Cost-Effective**: Sandbox is free for testing and development  

**Get started in 2 minutes!** 🚀
