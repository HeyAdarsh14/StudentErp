const Assignment = require('../models/Assignment.model');
const Student = require('../models/Student.model');
const MESSAGES = require('../constants/messages');

/** Create a new assignment (faculty/admin) */
const createAssignment = async (req, res, next) => {
  try {
    const payload = { ...req.body, assignedBy: req.user.id };
    const assignment = await Assignment.create(payload);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

/** List assignments (query by subject/department/batch) */
const listAssignments = async (req, res, next) => {
  try {
    const { subject, department, batch, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (department) filter.department = department;
    if (batch) filter.batch = batch;

    const assignments = await Assignment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

/** Get assignment by id */
const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) return res.status(404).json({ success: false, message: MESSAGES.NOT_FOUND });
    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

/** Update assignment (faculty/admin) */
const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!assignment) return res.status(404).json({ success: false, message: MESSAGES.NOT_FOUND });
    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

/** Soft delete assignment */
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id }, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: MESSAGES.NOT_FOUND });
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    next(error);
  }
};

/** Student submit assignment */
const submitAssignment = async (req, res, next) => {
  try {
    const { content, attachments } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(400).json({ success: false, message: 'Student profile not found' });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: MESSAGES.NOT_FOUND });

    assignment.submissions.push({
      studentId: student._id,
      submittedAt: new Date(),
      content,
      attachments: attachments || [],
    });

    await assignment.save();

    res.status(201).json({ success: true, message: 'Submission received' });
  } catch (error) {
    next(error);
  }
};

/** Grade a submission (faculty) */
const gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { marks, feedback } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: MESSAGES.NOT_FOUND });

    const sub = assignment.submissions.id(submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    sub.marks = marks;
    sub.feedback = feedback;
    sub.gradedBy = req.user.id;
    sub.gradedAt = new Date();

    await assignment.save();

    res.json({ success: true, message: 'Submission graded' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
};
