/**
 * LLM Service for Gen AI Platform Integration
 * Provides natural language processing capabilities using Azure OpenAI-compatible API
 */

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMService {
  private apiKey: string;
  private endpoint: string;
  private apiVersion: string;
  private deployment: string;

  constructor() {
    this.apiKey = process.env['AZURE_OPENAI_API_KEY'] || '';
    this.endpoint = process.env['AZURE_OPENAI_ENDPOINT'] || 'https://api-ai.digitaldev.nl';
    this.apiVersion = process.env['AZURE_OPENAI_API_VERSION'] || '2024-02-15-preview';
    this.deployment = process.env['AZURE_OPENAI_DEPLOYMENT'] || 'gpt-4o';
    
    if (!this.apiKey) {
      console.warn('⚠️  AZURE_OPENAI_API_KEY not set. LLM features will be disabled.');
    }
  }

  /**
   * Check if LLM service is configured and available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Send chat completion request to Gen AI Platform
   */
  async chat(messages: LLMMessage[], options: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  } = {}): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('LLM service not configured. Please set AZURE_OPENAI_API_KEY in .env file.');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    
    const requestBody = {
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;
      
      return {
        content: data.choices[0].message.content,
        finishReason: data.choices[0].finish_reason,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      } as LLMResponse;
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw error;
    }
  }

  /**
   * Enhanced intent parsing using LLM for natural language understanding
   */
  async parseIntent(userMessage: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  }> {
    const systemPrompt = `You are an AI assistant helping parse user intents for a Kanban task management system.
Analyze the user's message and extract:
1. The primary intent (one of: query_tasks, claim_task, release_task, update_status, add_comment, get_task, create_subtask, general_query)
2. Any entities (task_id, status, comment_text, subtask_title, etc.)
3. Confidence level (0-1)

Respond in JSON format:
{
  "intent": "intent_name",
  "entities": { "key": "value" },
  "confidence": 0.95
}

Available statuses: backlog, todo, ai-prep, in-progress, verify, done`;

    try {
      const response = await this.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ], {
        maxTokens: 200,
        temperature: 0.3, // Lower temperature for more consistent parsing
      });

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(response.content);
        return {
          intent: parsed.intent || 'general_query',
          entities: parsed.entities || {},
          confidence: parsed.confidence || 0.5,
        };
      } catch {
        // Fallback if LLM doesn't return valid JSON
        return {
          intent: 'general_query',
          entities: { rawMessage: userMessage },
          confidence: 0.3,
        };
      }
    } catch (error) {
      console.error('Intent parsing error:', error);
      // Return fallback intent
      return {
        intent: 'general_query',
        entities: { rawMessage: userMessage },
        confidence: 0.0,
      };
    }
  }

  /**
   * Generate natural language response based on action results
   */
  async generateResponse(
    userMessage: string,
    actionResults: any[],
    conversationHistory: LLMMessage[] = []
  ): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant managing a Kanban board system.
You help users manage tasks, understand their status, and provide insights.
Be concise, friendly, and actionable in your responses.

When discussing task IDs, always reference them clearly.
When actions succeed, confirm what was done.
When actions fail, explain why and suggest alternatives.`;

    const context = `User asked: "${userMessage}"

Action results:
${JSON.stringify(actionResults, null, 2)}

Generate a helpful, natural language response summarizing what happened.`;

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4), // Include last 2 exchanges for context
        { role: 'user', content: context },
      ];

      const response = await this.chat(messages, {
        maxTokens: 500,
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      console.error('Response generation error:', error);
      // Fallback to simple response
      if (actionResults.some((r: any) => r.error)) {
        return '❌ Sorry, I encountered an error processing your request.';
      }
      return '✅ Action completed successfully.';
    }
  }

  /**
   * Get task recommendations based on context
   */
  async getTaskRecommendations(tasks: any[], context: string): Promise<string> {
    const systemPrompt = `You are an AI assistant analyzing Kanban tasks to provide recommendations.
Analyze the tasks and context, then provide actionable insights about:
- Which tasks should be prioritized
- Potential bottlenecks
- Tasks that might be stuck
- Suggested next actions

Be specific and reference task IDs.`;

    try {
      const response = await this.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: ${context}\n\nTasks:\n${JSON.stringify(tasks, null, 2)}` },
      ], {
        maxTokens: 500,
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      console.error('Task recommendations error:', error);
      return 'Unable to generate recommendations at this time.';
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();
