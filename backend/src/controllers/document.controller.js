const Document = require('../models/Document.model');
const { uploadDocument, deleteFromCloudinary } = require('../services/fileUpload.service');
const MESSAGES = require('../constants/messages');

// Upload document
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { ownerId, ownerType, documentType, title, description, expiryDate } = req.body;

    // Upload to Cloudinary
    const folder = `documents/${ownerType}/${ownerId}`;
    const result = await uploadDocument(req.file, folder);

    const document = await Document.create({
      owner: ownerId,
      ownerType,
      documentType,
      title,
      description,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// Get all documents
exports.getAllDocuments = async (req, res, next) => {
  try {
    const { owner, ownerType, documentType, verificationStatus } = req.query;

    const query = { isDeleted: false };
    if (owner) query.owner = owner;
    if (ownerType) query.ownerType = ownerType;
    if (documentType) query.documentType = documentType;
    if (verificationStatus) query.verificationStatus = verificationStatus;

    const documents = await Document.find(query)
      .populate('owner', 'name email')
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

// Get document by ID
exports.getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'name email contactNumber')
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// Verify document
exports.verifyDocument = async (req, res, next) => {
  try {
    const { verificationStatus } = req.body;

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    document.verificationStatus = verificationStatus;
    document.verifiedBy = req.user.id;
    document.verifiedAt = new Date();

    await document.save();

    res.json({
      success: true,
      message: `Document ${verificationStatus} successfully`,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// Delete document
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(document.publicId);

    // Soft delete
    document.isDeleted = true;
    document.deletedAt = new Date();
    document.deletedBy = req.user.id;
    await document.save();

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
