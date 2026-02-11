const Assignment = require('../models/Assignment.model');
const Quiz = require('../models/Quiz.model');
const Student = require('../models/Student.model');
const Marks = require('../models/Marks.model');
const Subject = require('../models/Subject.model');
const MESSAGES = require('../constants/messages');

/**
 * Get student gradebook (aggregated performance)
 */
const getStudentGradebook = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await Student.findById(studentId)
      .populate('userId', 'name email')
      .populate('subjects', 'name code')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get assignments for student's subjects
    const assignments = await Assignment.find({
      subject: { $in: student.subjects.map((s) => s._id) },
    })
      .populate('subject', 'name code')
      .lean();

    // Get quizzes for student's subjects
    const quizzes = await Quiz.find({
      subject: { $in: student.subjects.map((s) => s._id) },
      isPublished: true,
    })
      .populate('subject', 'name code')
      .lean();

    // Get exam marks
    const examMarks = await Marks.find({
      student: studentId,
    })
      .populate('subject', 'name code')
      .populate('exam', 'name type')
      .lean();

    // Process assignment submissions
    const assignmentScores = [];
    let totalAssignmentMarks = 0;
    let obtainedAssignmentMarks = 0;

    assignments.forEach((assignment) => {
      const submission = assignment.submissions.find(
        (s) => s.studentId.toString() === studentId
      );

      if (submission && submission.marks !== undefined) {
        assignmentScores.push({
          title: assignment.title,
          subject: assignment.subject,
          maxMarks: assignment.maxMarks,
          obtainedMarks: submission.marks,
          percentage: ((submission.marks / assignment.maxMarks) * 100).toFixed(2),
          submittedAt: submission.submittedAt,
        });

        totalAssignmentMarks += assignment.maxMarks;
        obtainedAssignmentMarks += submission.marks;
      }
    });

    // Process quiz attempts
    const quizScores = [];
    let totalQuizMarks = 0;
    let obtainedQuizMarks = 0;

    quizzes.forEach((quiz) => {
      const attempts = quiz.attempts.filter(
        (a) => a.studentId.toString() === studentId && a.submittedAt
      );

      if (attempts.length > 0) {
        // Get best attempt
        const bestAttempt = attempts.reduce((best, current) =>
          current.score > best.score ? current : best
        );

        quizScores.push({
          title: quiz.title,
          subject: quiz.subject,
          maxMarks: quiz.totalMarks,
          obtainedMarks: bestAttempt.score,
          percentage: bestAttempt.percentage,
          attempts: attempts.length,
          submittedAt: bestAttempt.submittedAt,
        });

        totalQuizMarks += quiz.totalMarks;
        obtainedQuizMarks += bestAttempt.score;
      }
    });

    // Process exam marks
    const examScores = [];
    let totalExamMarks = 0;
    let obtainedExamMarks = 0;

    examMarks.forEach((mark) => {
      examScores.push({
        examName: mark.exam?.name,
        examType: mark.exam?.type,
        subject: mark.subject,
        maxMarks: mark.totalMarks,
        obtainedMarks: mark.marksObtained,
        percentage: ((mark.marksObtained / mark.totalMarks) * 100).toFixed(2),
      });

      totalExamMarks += mark.totalMarks;
      obtainedExamMarks += mark.marksObtained;
    });

    // Calculate overall performance
    const totalMarks = totalAssignmentMarks + totalQuizMarks + totalExamMarks;
    const obtainedMarks = obtainedAssignmentMarks + obtainedQuizMarks + obtainedExamMarks;
    const overallPercentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

    // Subject-wise breakdown
    const subjectWiseScores = {};

    student.subjects.forEach((subject) => {
      const subjectId = subject._id.toString();
      subjectWiseScores[subjectId] = {
        subject: subject,
        assignments: assignmentScores.filter((a) => a.subject._id.toString() === subjectId),
        quizzes: quizScores.filter((q) => q.subject._id.toString() === subjectId),
        exams: examScores.filter((e) => e.subject._id.toString() === subjectId),
      };

      // Calculate subject totals
      const subjectTotal =
        subjectWiseScores[subjectId].assignments.reduce((sum, a) => sum + a.maxMarks, 0) +
        subjectWiseScores[subjectId].quizzes.reduce((sum, q) => sum + q.maxMarks, 0) +
        subjectWiseScores[subjectId].exams.reduce((sum, e) => sum + e.maxMarks, 0);

      const subjectObtained =
        subjectWiseScores[subjectId].assignments.reduce((sum, a) => sum + a.obtainedMarks, 0) +
        subjectWiseScores[subjectId].quizzes.reduce((sum, q) => sum + q.obtainedMarks, 0) +
        subjectWiseScores[subjectId].exams.reduce((sum, e) => sum + e.obtainedMarks, 0);

      subjectWiseScores[subjectId].totalMarks = subjectTotal;
      subjectWiseScores[subjectId].obtainedMarks = subjectObtained;
      subjectWiseScores[subjectId].percentage =
        subjectTotal > 0 ? ((subjectObtained / subjectTotal) * 100).toFixed(2) : 0;
    });

    res.json({
      success: true,
      data: {
        student: {
          name: student.userId.name,
          email: student.userId.email,
          rollNumber: student.rollNumber,
          registrationNumber: student.registrationNumber,
        },
        summary: {
          totalMarks,
          obtainedMarks,
          percentage: overallPercentage,
          assignmentCount: assignmentScores.length,
          quizCount: quizScores.length,
          examCount: examScores.length,
        },
        breakdown: {
          assignments: {
            scores: assignmentScores,
            total: totalAssignmentMarks,
            obtained: obtainedAssignmentMarks,
            percentage:
              totalAssignmentMarks > 0
                ? ((obtainedAssignmentMarks / totalAssignmentMarks) * 100).toFixed(2)
                : 0,
          },
          quizzes: {
            scores: quizScores,
            total: totalQuizMarks,
            obtained: obtainedQuizMarks,
            percentage:
              totalQuizMarks > 0 ? ((obtainedQuizMarks / totalQuizMarks) * 100).toFixed(2) : 0,
          },
          exams: {
            scores: examScores,
            total: totalExamMarks,
            obtained: obtainedExamMarks,
            percentage:
              totalExamMarks > 0 ? ((obtainedExamMarks / totalExamMarks) * 100).toFixed(2) : 0,
          },
        },
        subjectWise: Object.values(subjectWiseScores),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get class gradebook (Faculty view)
 */
const getClassGradebook = async (req, res, next) => {
  try {
    const { subjectId, batch, department } = req.query;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required',
      });
    }

    // Get students for this subject
    const filter = { subjects: subjectId };
    if (batch) filter.batch = batch;
    if (department) filter.department = department;

    const students = await Student.find(filter)
      .populate('userId', 'name email')
      .select('rollNumber registrationNumber userId')
      .lean();

    // Get all assignments for subject
    const assignments = await Assignment.find({ subject: subjectId }).lean();

    // Get all quizzes for subject
    const quizzes = await Quiz.find({ subject: subjectId, isPublished: true }).lean();

    // Process each student
    const gradebook = students.map((student) => {
      const studentId = student._id.toString();

      // Calculate assignment average
      const assignmentScores = assignments
        .map((assignment) => {
          const submission = assignment.submissions.find(
            (s) => s.studentId.toString() === studentId
          );
          if (submission && submission.marks !== undefined) {
            return (submission.marks / assignment.maxMarks) * 100;
          }
          return null;
        })
        .filter((score) => score !== null);

      const assignmentAvg =
        assignmentScores.length > 0
          ? (assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length).toFixed(2)
          : 0;

      // Calculate quiz average
      const quizScores = quizzes
        .map((quiz) => {
          const attempts = quiz.attempts.filter(
            (a) => a.studentId.toString() === studentId && a.submittedAt
          );
          if (attempts.length > 0) {
            const bestAttempt = attempts.reduce((best, current) =>
              current.score > best.score ? current : best
            );
            return parseFloat(bestAttempt.percentage);
          }
          return null;
        })
        .filter((score) => score !== null);

      const quizAvg =
        quizScores.length > 0
          ? (quizScores.reduce((a, b) => a + b, 0) / quizScores.length).toFixed(2)
          : 0;

      // Overall average (weighted: 40% assignments, 60% quizzes)
      const overall =
        assignmentScores.length > 0 || quizScores.length > 0
          ? (assignmentAvg * 0.4 + quizAvg * 0.6).toFixed(2)
          : 0;

      return {
        studentId: student._id,
        name: student.userId.name,
        rollNumber: student.rollNumber,
        assignmentAverage: assignmentAvg,
        assignmentCount: assignmentScores.length,
        quizAverage: quizAvg,
        quizCount: quizScores.length,
        overallAverage: overall,
      };
    });

    // Sort by overall average descending
    gradebook.sort((a, b) => parseFloat(b.overallAverage) - parseFloat(a.overallAverage));

    // Calculate class statistics
    const overallScores = gradebook.map((s) => parseFloat(s.overallAverage)).filter((s) => s > 0);
    const classStats = {
      totalStudents: students.length,
      studentsWithScores: overallScores.length,
      classAverage:
        overallScores.length > 0
          ? (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(2)
          : 0,
      highest: overallScores.length > 0 ? Math.max(...overallScores).toFixed(2) : 0,
      lowest: overallScores.length > 0 ? Math.min(...overallScores).toFixed(2) : 0,
    };

    res.json({
      success: true,
      data: {
        classStats,
        gradebook,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export gradebook to CSV format
 */
const exportGradebook = async (req, res, next) => {
  try {
    const { subjectId, batch, department } = req.query;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required',
      });
    }

    // Reuse class gradebook logic
    req.query = { subjectId, batch, department };
    await getClassGradebook(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentGradebook,
  getClassGradebook,
  exportGradebook,
};
