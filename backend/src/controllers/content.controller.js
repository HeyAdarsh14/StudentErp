const Content = require('../models/Content.model');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Upload/Create content (Faculty/Admin)
 */
const createContent = async (req, res, next) => {
  try {
    const { uploadedBy } = req.body;
    
    // If uploadedBy not provided, use current user's faculty profile
    let facultyId = uploadedBy;
    if (!facultyId) {
      const faculty = await Faculty.findOne({ userId: req.user.id });
      if (!faculty) {
        return res.status(400).json({
          success: false,
          message: 'Faculty profile not found',
        });
      }
      facultyId = faculty._id;
    }

    const contentData = {
      ...req.body,
      uploadedBy: facultyId,
    };

    const content = await Content.create(contentData);

    res.status(201).json({
      success: true,
      message: 'Content uploaded successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List content with filters and search
 */
const listContent = async (req, res, next) => {
  try {
    const {
      subject,
      department,
      batch,
      contentType,
      category,
      tags,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isPublished: true };

    if (subject) filter.subject = subject;
    if (department) filter.department = department;
    if (batch) filter.batch = batch;
    if (contentType) filter.contentType = contentType;
    if (category) filter.category = category;
    if (tags) filter.tags = { $in: tags.split(',') };

    // Search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const content = await Content.find(filter)
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name')
      .populate({
        path: 'uploadedBy',
        populate: { path: 'userId', select: 'name' },
      })
      .select('-views -downloads -versions') // Exclude large arrays
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Content.countDocuments(filter);

    res.json({
      success: true,
      data: content,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single content by ID
 */
const getContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name')
      .populate({
        path: 'uploadedBy',
        populate: { path: 'userId', select: 'name email' },
      })
      .lean();

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    // Track view (async, don't wait)
    Content.findById(req.params.id)
      .then((doc) => {
        if (doc) {
          doc.addView(req.user.id);
          doc.save().catch((err) => logger.error(`View tracking error: ${err.message}`));
        }
      })
      .catch((err) => logger.error(`Content fetch error: ${err.message}`));

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update content (Faculty/Admin)
 */
const updateContent = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete content (Soft delete)
 */
const deleteContent = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track download
 */
const trackDownload = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    content.addDownload(req.user.id);
    await content.save();

    res.json({
      success: true,
      message: 'Download tracked',
      data: {
        fileUrl: content.fileUrl,
        fileName: content.fileName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get content statistics (Faculty/Admin)
 */
const getContentStats = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('views.userId', 'name')
      .populate('downloads.userId', 'name')
      .lean();

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    const stats = {
      title: content.title,
      totalViews: content.views?.length || 0,
      totalDownloads: content.downloads?.length || 0,
      recentViews: content.views?.slice(-10).reverse() || [],
      recentDownloads: content.downloads?.slice(-10).reverse() || [],
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload new version (Faculty/Admin)
 */
const uploadNewVersion = async (req, res, next) => {
  try {
    const { fileUrl, fileName, fileSize, changeLog } = req.body;

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    const faculty = await Faculty.findOne({ userId: req.user.id });
    if (!faculty) {
      return res.status(400).json({
        success: false,
        message: 'Faculty profile not found',
      });
    }

    content.createNewVersion({ fileUrl, fileName, fileSize }, faculty._id, changeLog);
    await content.save();

    res.json({
      success: true,
      message: 'New version uploaded successfully',
      data: {
        version: content.version,
        fileUrl: content.fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get version history (Faculty/Admin)
 */
const getVersionHistory = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('versions.uploadedBy', 'name')
      .select('versions version title')
      .lean();

    if (!content) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: {
        title: content.title,
        currentVersion: content.version,
        history: content.versions || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get content by subject (for student dashboard)
 */
const getContentBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const content = await Content.find({
      subject: subjectId,
      isPublished: true,
    })
      .select('title description contentType category createdAt fileSize')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const grouped = {
      'lecture-note': [],
      video: [],
      presentation: [],
      pdf: [],
      document: [],
      link: [],
      other: [],
    };

    content.forEach((item) => {
      if (grouped[item.contentType]) {
        grouped[item.contentType].push(item);
      }
    });

    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContent,
  listContent,
  getContent,
  updateContent,
  deleteContent,
  trackDownload,
  getContentStats,
  uploadNewVersion,
  getVersionHistory,
  getContentBySubject,
};
