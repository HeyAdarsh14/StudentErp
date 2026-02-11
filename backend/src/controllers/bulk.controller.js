const csv = require('csv-parser');
const fs = require('fs');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const User = require('../models/User.model');
const { hashPassword, generateRandomString, generateUniqueId } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../services/email.service');
const MESSAGES = require('../constants/messages');

// Bulk import students from CSV
exports.bulkImportStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded',
      });
    }

    const students = [];
    const errors = [];
    let rowNumber = 1;

    const stream = fs
      .createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        rowNumber++;
        try {
          // Validate required fields
          if (!row.name || !row.email || !row.department || !row.year) {
            errors.push({
              row: rowNumber,
              error: 'Missing required fields',
              data: row,
            });
            return;
          }

          students.push({
            name: row.name.trim(),
            email: row.email.trim().toLowerCase(),
            contactNumber: row.contactNumber?.trim() || '',
            gender: row.gender?.toLowerCase() || 'other',
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            department: row.department.trim(),
            year: parseInt(row.year),
            section: row.section?.toUpperCase() || 'A',
            rollNumber: row.rollNumber?.trim() || '',
            fatherName: row.fatherName?.trim() || '',
            motherName: row.motherName?.trim() || '',
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: error.message,
            data: row,
          });
        }
      });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    // Process students
    const created = [];
    const failed = [];

    for (const studentData of students) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: studentData.email });
        if (existingUser) {
          failed.push({
            email: studentData.email,
            error: 'User already exists',
          });
          continue;
        }

        // Create user
        const tempPassword = generateRandomString(10);
        const hashedPassword = await hashPassword(tempPassword);

        const user = await User.create({
          name: studentData.name,
          email: studentData.email,
          password: hashedPassword,
          role: 'student',
          contactNumber: studentData.contactNumber,
          gender: studentData.gender,
          dateOfBirth: studentData.dateOfBirth,
        });

        // Create student
        const registrationNumber = generateUniqueId('STU');
        const student = await Student.create({
          userId: user._id,
          registrationNumber,
          rollNumber: studentData.rollNumber || registrationNumber,
          department: studentData.department,
          year: studentData.year,
          section: studentData.section,
          parentInfo: {
            father: { name: studentData.fatherName },
            mother: { name: studentData.motherName },
          },
        });

        // Send welcome email
        try {
          await sendWelcomeEmail(user, tempPassword);
        } catch (emailError) {
          console.error('Email error:', emailError);
        }

        created.push({
          registrationNumber,
          name: user.name,
          email: user.email,
        });
      } catch (error) {
        failed.push({
          email: studentData.email,
          error: error.message,
        });
      }
    }

    // Delete uploaded CSV file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Bulk import completed. Created: ${created.length}, Failed: ${failed.length}`,
      data: {
        created,
        failed,
        csvErrors: errors,
      },
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// Bulk import faculty from CSV
exports.bulkImportFaculty = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded',
      });
    }

    const facultyList = [];
    const errors = [];
    let rowNumber = 1;

    const stream = fs
      .createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        rowNumber++;
        try {
          if (!row.name || !row.email || !row.department) {
            errors.push({
              row: rowNumber,
              error: 'Missing required fields',
              data: row,
            });
            return;
          }

          facultyList.push({
            name: row.name.trim(),
            email: row.email.trim().toLowerCase(),
            contactNumber: row.contactNumber?.trim() || '',
            gender: row.gender?.toLowerCase() || 'other',
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            department: row.department.trim(),
            designation: row.designation?.trim() || 'Assistant Professor',
            qualification: row.qualification?.trim() || '',
            specialization: row.specialization?.trim() || '',
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: error.message,
            data: row,
          });
        }
      });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const created = [];
    const failed = [];

    for (const facultyData of facultyList) {
      try {
        const existingUser = await User.findOne({ email: facultyData.email });
        if (existingUser) {
          failed.push({
            email: facultyData.email,
            error: 'User already exists',
          });
          continue;
        }

        const tempPassword = generateRandomString(10);
        const hashedPassword = await hashPassword(tempPassword);

        const user = await User.create({
          name: facultyData.name,
          email: facultyData.email,
          password: hashedPassword,
          role: 'faculty',
          contactNumber: facultyData.contactNumber,
          gender: facultyData.gender,
          dateOfBirth: facultyData.dateOfBirth,
        });

        const employeeId = generateUniqueId('FAC');
        const faculty = await Faculty.create({
          userId: user._id,
          employeeId,
          department: facultyData.department,
          designation: facultyData.designation,
          specialization: facultyData.specialization,
          qualification: facultyData.qualification ? [facultyData.qualification] : [],
        });

        try {
          await sendWelcomeEmail(user, tempPassword);
        } catch (emailError) {
          console.error('Email error:', emailError);
        }

        created.push({
          employeeId,
          name: user.name,
          email: user.email,
        });
      } catch (error) {
        failed.push({
          email: facultyData.email,
          error: error.message,
        });
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Bulk import completed. Created: ${created.length}, Failed: ${failed.length}`,
      data: {
        created,
        failed,
        csvErrors: errors,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
