const ChatMessage = require('../models/ChatMessage.model');
const Recommendation = require('../models/Recommendation.model');
const Student = require('../models/Student.model');
const Notice = require('../models/Notice.model');
const aiService = require('../services/ai.service');
const recommendationService = require('../services/recommendation.service');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Chat with AI assistant
 */
const chatWithAI = async (req, res, next) => {
  try {
    const { _id: userId, role: userRole } = req.user;
    const { message, sessionId: providedSessionId, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Generate or use existing session ID
    const sessionId = providedSessionId || uuidv4();

    // Get conversation history
    const history = await ChatMessage.getConversationHistory(sessionId, 5);

    // Build context from user role and module
    const systemContext = `You are a helpful AI assistant for a College ERP system. The user is a ${userRole}. ${context?.currentModule ? `They are currently in the ${context.currentModule} module.` : ''} Provide accurate, helpful responses about college-related queries including attendance, marks, fees, timetable, notices, placements, and general information. Be concise but informative.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemContext },
      ...history.reverse().map((msg) => ({
        role: msg.role,
        content: msg.message,
      })),
      { role: 'user', content: message },
    ];

    // Extract intent
    const intentData = await aiService.extractIntent(
      message,
      context?.currentModule
    );

    // Get AI response
    const startTime = Date.now();
    const response = await aiService.generateChatCompletion(messages);
    const responseTime = Date.now() - startTime;

    // Save user message
    await ChatMessage.create({
      user: userId,
      sessionId,
      message,
      role: 'user',
      context,
    });

    // Save assistant response
    const assistantMessage = await ChatMessage.create({
      user: userId,
      sessionId,
      message: response.message.content,
      role: 'assistant',
      metadata: {
        model: response.model,
        tokensUsed: response.usage?.total_tokens,
        responseTime,
        intent: intentData.intent,
        confidence: intentData.confidence,
      },
      context,
    });

    res.json({
      success: true,
      data: {
        message: response.message.content,
        sessionId,
        messageId: assistantMessage._id,
        intent: intentData.intent,
        confidence: intentData.confidence,
      },
    });
  } catch (error) {
    logger.error('Error in chatWithAI:', error);
    next(error);
  }
};

/**
 * Get chat history
 */
const getChatHistory = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const { sessionId, limit = 20 } = req.query;

    if (sessionId) {
      // Get specific session history
      const messages = await ChatMessage.find({
        sessionId,
        user: userId,
        isDeleted: false,
      })
        .sort({ createdAt: 1 })
        .limit(parseInt(limit));

      return res.json({
        success: true,
        data: { sessionId, messages },
      });
    }

    // Get user's recent sessions
    const sessions = await ChatMessage.getUserSessions(userId);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    logger.error('Error in getChatHistory:', error);
    next(error);
  }
};

/**
 * Provide feedback on AI response
 */
const provideFeedback = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { helpful, rating, comment } = req.body;

    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    message.feedback = {
      helpful,
      rating,
      comment,
    };
    await message.save();

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error) {
    logger.error('Error in provideFeedback:', error);
    next(error);
  }
};

/**
 * Get recommendations for user
 */
const getRecommendations = async (req, res, next) => {
  try {
    const { _id: userId, role } = req.user;
    const { type, status, includeExpired } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (includeExpired) filters.includeExpired = includeExpired === 'true';

    const recommendations = await Recommendation.getUserRecommendations(
      userId,
      filters
    );

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  } catch (error) {
    logger.error('Error in getRecommendations:', error);
    next(error);
  }
};

/**
 * Generate recommendations for student
 */
const generateRecommendations = async (req, res, next) => {
  try {
    const { _id: userId, role } = req.user;
    const { studentId } = req.params;

    // Only students can generate for themselves, admins/faculty can generate for any student
    if (role === 'student') {
      const student = await Student.findOne({ user: userId });
      if (!student || student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'You can only generate recommendations for yourself',
        });
      }
    }

    const recommendations = await recommendationService.generateAllRecommendations(
      studentId
    );

    res.json({
      success: true,
      message: 'Recommendations generated successfully',
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  } catch (error) {
    logger.error('Error in generateRecommendations:', error);
    next(error);
  }
};

/**
 * Update recommendation status
 */
const updateRecommendationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { _id: userId } = req.user;

    const recommendation = await Recommendation.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found',
      });
    }

    // Use model methods for status updates
    switch (status) {
      case 'viewed':
        await recommendation.markAsViewed();
        break;
      case 'accepted':
        await recommendation.accept();
        break;
      case 'rejected':
        await recommendation.reject();
        break;
      case 'completed':
        await recommendation.complete();
        break;
      default:
        recommendation.status = status;
        await recommendation.save();
    }

    res.json({
      success: true,
      message: 'Recommendation status updated',
      data: recommendation,
    });
  } catch (error) {
    logger.error('Error in updateRecommendationStatus:', error);
    next(error);
  }
};

/**
 * Analyze resume
 */
const analyzeResume = async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text is required',
      });
    }

    const analysis = await aiService.analyzeResume(resumeText, jobDescription);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Error in analyzeResume:', error);
    next(error);
  }
};

/**
 * Summarize notice/document
 */
const summarizeDocument = async (req, res, next) => {
  try {
    const { text, maxLength } = req.body;
    const { noticeId } = req.params;

    let textToSummarize = text;

    // If noticeId provided, fetch notice
    if (noticeId && !text) {
      const notice = await Notice.findById(noticeId);
      if (!notice) {
        return res.status(404).json({
          success: false,
          message: 'Notice not found',
        });
      }
      textToSummarize = notice.content;
    }

    if (!textToSummarize) {
      return res.status(400).json({
        success: false,
        message: 'Text or noticeId is required',
      });
    }

    const summary = await aiService.summarizeText(
      textToSummarize,
      maxLength || 150
    );

    res.json({
      success: true,
      data: {
        summary,
        originalLength: textToSummarize.length,
        summaryLength: summary.length,
      },
    });
  } catch (error) {
    logger.error('Error in summarizeDocument:', error);
    next(error);
  }
};

/**
 * Smart search across entities
 */
const smartSearch = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Parse query using AI
    const parsedQuery = await aiService.generateSearchQuery(query);

    // TODO: Execute search based on parsed query
    // This would involve querying the appropriate models based on entity type

    res.json({
      success: true,
      data: {
        query: parsedQuery,
        message: 'Query parsed successfully. Implement entity-specific search.',
      },
    });
  } catch (error) {
    logger.error('Error in smartSearch:', error);
    next(error);
  }
};

/**
 * Predict student performance
 */
const predictPerformance = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Prepare student data
    const studentData = {
      cgpa: student.academicInfo?.cgpa || 0,
      backlogs: student.academicInfo?.backlogs || 0,
      attendance: 75, // TODO: Calculate actual attendance
      recentTrend: 'stable',
      participation: 'moderate',
    };

    const prediction = await aiService.predictPerformance(studentData);

    res.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.personalInfo?.name,
          registrationNumber: student.registrationNumber,
        },
        prediction,
      },
    });
  } catch (error) {
    logger.error('Error in predictPerformance:', error);
    next(error);
  }
};

/**
 * Get AI statistics (admin only)
 */
const getAIStatistics = async (req, res, next) => {
  try {
    const [
      totalChats,
      totalRecommendations,
      activeRecommendations,
      avgResponseTime,
    ] = await Promise.all([
      ChatMessage.countDocuments({ isDeleted: false }),
      Recommendation.countDocuments({ isDeleted: false }),
      Recommendation.countDocuments({
        status: { $in: ['pending', 'viewed'] },
        isDeleted: false,
      }),
      ChatMessage.aggregate([
        {
          $match: {
            role: 'assistant',
            'metadata.responseTime': { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$metadata.responseTime' },
          },
        },
      ]),
    ]);

    // Recommendation stats by type
    const recommendationsByType = await Recommendation.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
    ]);

    // Most common intents
    const topIntents = await ChatMessage.aggregate([
      {
        $match: {
          role: 'assistant',
          'metadata.intent': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$metadata.intent',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        chatStatistics: {
          totalChats,
          avgResponseTime: avgResponseTime[0]?.avgTime || 0,
        },
        recommendationStatistics: {
          total: totalRecommendations,
          active: activeRecommendations,
          byType: recommendationsByType,
        },
        topIntents,
      },
    });
  } catch (error) {
    logger.error('Error in getAIStatistics:', error);
    next(error);
  }
};

module.exports = {
  chatWithAI,
  getChatHistory,
  provideFeedback,
  getRecommendations,
  generateRecommendations,
  updateRecommendationStatus,
  analyzeResume,
  summarizeDocument,
  smartSearch,
  predictPerformance,
  getAIStatistics,
};
