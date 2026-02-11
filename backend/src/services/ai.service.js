const OpenAI = require('openai');
const { OPENAI_API_KEY, NODE_ENV } = require('../config/env');
const logger = require('../utils/logger');

let openai = null;

/**
 * Initialize OpenAI client
 */
const initializeOpenAI = () => {
  if (!OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured. AI features will be disabled.');
    return null;
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }

  return openai;
};

/**
 * Generate chat completion
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Response from OpenAI
 */
exports.generateChatCompletion = async (messages, options = {}) => {
  const client = initializeOpenAI();

  // Simulation mode for development
  if (NODE_ENV === 'development' && !client) {
    logger.info('🤖 [SIMULATION] Chat completion request:', {
      messages: messages.slice(-1),
    });

    return {
      message: {
        role: 'assistant',
        content:
          'This is a simulated response. OpenAI API key is not configured. In production, this would be a real AI response based on the context of your ERP system.',
      },
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80,
      },
      model: 'gpt-3.5-turbo-simulation',
    };
  }

  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 500,
      stream = false,
    } = options;

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    });

    return {
      message: {
        role: response.choices[0].message.role,
        content: response.choices[0].message.content,
      },
      usage: response.usage,
      model: response.model,
      finishReason: response.choices[0].finish_reason,
    };
  } catch (error) {
    logger.error('Error in generateChatCompletion:', error);
    throw error;
  }
};

/**
 * Generate embeddings for text
 * @param {String} text - Text to generate embeddings for
 * @returns {Promise<Array>} Embedding vector
 */
exports.generateEmbedding = async (text) => {
  const client = initializeOpenAI();

  if (NODE_ENV === 'development' && !client) {
    // Return mock embedding
    return new Array(1536).fill(0).map(() => Math.random());
  }

  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error in generateEmbedding:', error);
    throw error;
  }
};

/**
 * Analyze resume and score it
 * @param {String} resumeText - Resume content
 * @param {String} jobDescription - Job description to compare against
 * @returns {Promise<Object>} Resume analysis
 */
exports.analyzeResume = async (resumeText, jobDescription = '') => {
  const prompt = `Analyze the following resume and provide a detailed evaluation:

${jobDescription ? `Job Description:\n${jobDescription}\n\n` : ''}Resume:
${resumeText}

Please provide:
1. Overall score (0-100)
2. Strengths (list 3-5 points)
3. Weaknesses (list 3-5 points)
4. Suggestions for improvement (list 3-5 points)
5. Key skills identified
6. Experience level (Fresher/Junior/Mid/Senior)
${jobDescription ? '7. Job fit score (0-100)' : ''}

Format the response as JSON.`;

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert resume reviewer and career counselor. Provide constructive, detailed feedback.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await exports.generateChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 800,
    });

    // Parse JSON response
    const content = response.message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: return raw content if JSON parsing fails
    return {
      score: 70,
      raw: content,
    };
  } catch (error) {
    logger.error('Error in analyzeResume:', error);
    throw error;
  }
};

/**
 * Summarize notice/document
 * @param {String} text - Text to summarize
 * @param {Number} maxLength - Max length of summary
 * @returns {Promise<String>} Summary
 */
exports.summarizeText = async (text, maxLength = 150) => {
  const messages = [
    {
      role: 'system',
      content: `You are a helpful assistant that creates concise summaries. Limit summaries to ${maxLength} words.`,
    },
    {
      role: 'user',
      content: `Please summarize the following text:\n\n${text}`,
    },
  ];

  try {
    const response = await exports.generateChatCompletion(messages, {
      temperature: 0.5,
      maxTokens: Math.ceil(maxLength * 1.5),
    });

    return response.message.content.trim();
  } catch (error) {
    logger.error('Error in summarizeText:', error);
    throw error;
  }
};

/**
 * Extract intent from user query
 * @param {String} query - User query
 * @param {String} context - Current context/module
 * @returns {Promise<Object>} Intent and confidence
 */
exports.extractIntent = async (query, context = '') => {
  const intents = [
    'view_attendance',
    'view_marks',
    'check_fees',
    'view_timetable',
    'view_notices',
    'search_faculty',
    'search_student',
    'request_leave',
    'view_assignments',
    'check_placement',
    'general_query',
  ];

  const messages = [
    {
      role: 'system',
      content: `You are an intent classifier for a college ERP system. Given a user query, determine the most likely intent from: ${intents.join(', ')}. ${context ? `Current context: ${context}` : ''} Respond with JSON containing "intent" and "confidence" (0-1).`,
    },
    {
      role: 'user',
      content: query,
    },
  ];

  try {
    const response = await exports.generateChatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 50,
    });

    const content = response.message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        intent: result.intent || 'general_query',
        confidence: result.confidence || 0.5,
      };
    }

    return {
      intent: 'general_query',
      confidence: 0.3,
    };
  } catch (error) {
    logger.error('Error in extractIntent:', error);
    return {
      intent: 'general_query',
      confidence: 0.1,
    };
  }
};

/**
 * Generate smart search query
 * @param {String} naturalLanguageQuery - User's natural language query
 * @returns {Promise<Object>} Structured search parameters
 */
exports.generateSearchQuery = async (naturalLanguageQuery) => {
  const messages = [
    {
      role: 'system',
      content:
        'You are a query parser for a college ERP system. Convert natural language queries into structured search parameters. Respond with JSON containing "entity" (student/faculty/course/notice/etc), "filters" (object with key-value pairs), and "sortBy" field.',
    },
    {
      role: 'user',
      content: `Parse this query: ${naturalLanguageQuery}`,
    },
  ];

  try {
    const response = await exports.generateChatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 200,
    });

    const content = response.message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      entity: 'general',
      filters: {},
      sortBy: 'relevance',
    };
  } catch (error) {
    logger.error('Error in generateSearchQuery:', error);
    return {
      entity: 'general',
      filters: {},
      sortBy: 'relevance',
    };
  }
};

/**
 * Predict student performance
 * @param {Object} studentData - Student academic data
 * @returns {Promise<Object>} Performance prediction
 */
exports.predictPerformance = async (studentData) => {
  const prompt = `Based on the following student data, predict their future academic performance and provide recommendations:

Current CGPA: ${studentData.cgpa}
Attendance: ${studentData.attendance}%
Backlogs: ${studentData.backlogs}
Recent Marks Trend: ${studentData.recentTrend || 'stable'}
Participation: ${studentData.participation || 'moderate'}

Provide:
1. Predicted CGPA for next semester (with confidence level)
2. Risk level (Low/Medium/High)
3. Key concerns (if any)
4. Actionable recommendations
5. Suggested interventions

Format as JSON.`;

  const messages = [
    {
      role: 'system',
      content:
        'You are an educational data analyst. Make predictions based on academic patterns.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await exports.generateChatCompletion(messages, {
      temperature: 0.4,
      maxTokens: 500,
    });

    const content = response.message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      predictedCGPA: studentData.cgpa,
      confidence: 0.5,
      riskLevel: 'Medium',
      recommendations: ['Continue monitoring performance'],
    };
  } catch (error) {
    logger.error('Error in predictPerformance:', error);
    throw error;
  }
};

module.exports = exports;
