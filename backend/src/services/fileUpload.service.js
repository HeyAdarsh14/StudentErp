const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const { Readable } = require('stream');

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (file, folder = 'erp') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error(`Cloudinary upload error: ${error.message}`);
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
            });
          }
        }
      );

      // Create a readable stream from buffer
      const bufferStream = Readable.from(file.buffer);
      bufferStream.pipe(uploadStream);
    });
  } catch (error) {
    logger.error(`File upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload multiple files
 */
const uploadMultipleFiles = async (files, folder = 'erp') => {
  try {
    const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    logger.error(`Multiple file upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      logger.info(`File deleted from Cloudinary: ${publicId}`);
      return true;
    } else {
      logger.warn(`Failed to delete file from Cloudinary: ${publicId}`);
      return false;
    }
  } catch (error) {
    logger.error(`File deletion error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload image (with transformations)
 */
const uploadImage = async (file, folder = 'erp/images', options = {}) => {
  try {
    const { width, height, crop = 'limit' } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: 'image',
        transformation: [],
      };

      if (width || height) {
        uploadOptions.transformation.push({
          width,
          height,
          crop,
          quality: 'auto',
        });
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
              width: result.width,
              height: result.height,
            });
          }
        }
      );

      const bufferStream = Readable.from(file.buffer);
      bufferStream.pipe(uploadStream);
    });
  } catch (error) {
    logger.error(`Image upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload profile image
 */
const uploadProfileImage = async (file, userId) => {
  try {
    return await uploadImage(file, `erp/profiles/${userId}`, {
      width: 400,
      height: 400,
      crop: 'fill',
    });
  } catch (error) {
    logger.error(`Profile image upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload document (PDF)
 */
const uploadDocument = async (file, folder = 'erp/documents') => {
  try {
    return await uploadToCloudinary(file, folder);
  } catch (error) {
    logger.error(`Document upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Get file URL from public ID
 */
const getFileUrl = (publicId, options = {}) => {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      ...options,
    });
  } catch (error) {
    logger.error(`Error generating file URL: ${error.message}`);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleFiles,
  deleteFromCloudinary,
  uploadImage,
  uploadProfileImage,
  uploadDocument,
  getFileUrl,
};
