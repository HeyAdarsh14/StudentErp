const Recommendation = require('../models/Recommendation.model');
const Student = require('../models/Student.model');
const Marks = require('../models/Marks.model');
const Attendance = require('../models/Attendance.model');
const PlacementApplication = require('../models/PlacementApplication.model');
const Subject = require('../models/Subject.model');
const logger = require('../utils/logger');

/**
 * Generate course recommendations for a student
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} Course recommendations
 */
exports.generateCourseRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student) throw new Error('Student not found');

    // Get student's marks to identify strong/weak areas
    const marks = await Marks.find({ student: studentId, isDeleted: false })
      .populate('subject')
      .lean();

    // Calculate average marks per subject category
    const categoryPerformance = {};
    marks.forEach((mark) => {
      const category = mark.subject?.category || 'General';
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = { total: 0, count: 0 };
      }
      categoryPerformance[category].total += mark.marksObtained;
      categoryPerformance[category].count += 1;
    });

    const recommendations = [];

    // Recommend courses in strong areas (to excel further)
    for (const [category, data] of Object.entries(categoryPerformance)) {
      const avgPercentage = (data.total / data.count / 100) * 100;

      if (avgPercentage >= 75) {
        recommendations.push({
          user: student.user,
          type: 'course',
          title: `Advanced ${category} Course`,
          description: `Based on your excellent performance (${avgPercentage.toFixed(1)}%) in ${category}, we recommend taking advanced courses in this area.`,
          reason: `Strong performance in ${category} with ${avgPercentage.toFixed(1)}% average`,
          score: Math.min(95, avgPercentage + 10),
          factors: [
            { name: 'Performance', weight: 0.7, value: avgPercentage },
            { name: 'Consistency', weight: 0.3, value: data.count >= 3 ? 90 : 70 },
          ],
          priority: 'high',
          tags: [category, 'skill-development', 'advanced'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      } else if (avgPercentage < 60) {
        // Recommend remedial courses for weak areas
        recommendations.push({
          user: student.user,
          type: 'course',
          title: `${category} Fundamentals - Remedial Course`,
          description: `We noticed you're facing challenges in ${category} (${avgPercentage.toFixed(1)}%). This course will help strengthen your foundation.`,
          reason: `Below-average performance in ${category} needs improvement`,
          score: 100 - avgPercentage, // Higher score for weaker areas (more urgent)
          factors: [
            { name: 'Performance Gap', weight: 0.8, value: 60 - avgPercentage },
            { name: 'Urgency', weight: 0.2, value: 85 },
          ],
          priority: 'urgent',
          tags: [category, 'remedial', 'foundation'],
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        });
      }
    }

    return recommendations;
  } catch (error) {
    logger.error('Error in generateCourseRecommendations:', error);
    return [];
  }
};

/**
 * Generate internship recommendations
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} Internship recommendations
 */
exports.generateInternshipRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId)
      .populate('department')
      .lean();
    if (!student) throw new Error('Student not found');

    const cgpa = student.academicInfo?.cgpa || 0;
    const skills = student.academicInfo?.skills || [];
    const currentYear = student.currentYear;

    const recommendations = [];

    // Recommend based on department and performance
    const internshipTypes = {
      'Computer Science': ['Software Development', 'Data Science', 'Web Development'],
      'Electrical': ['Power Systems', 'Electronics', 'Embedded Systems'],
      'Mechanical': ['CAD Design', 'Manufacturing', 'Robotics'],
      'Civil': ['Construction Management', 'Structural Design', 'Urban Planning'],
    };

    const deptName = student.department?.name || 'General';
    const relevantTypes = internshipTypes[deptName] || ['General'];

    relevantTypes.forEach((type, index) => {
      const score = cgpa * 10 + (skills.length * 2) - (index * 5);

      recommendations.push({
        user: student.user,
        type: 'internship',
        title: `${type} Internship Opportunity`,
        description: `${type} internship matching your ${deptName} background. ${cgpa >= 7.5 ? 'Your strong academics make you a great fit!' : 'Build practical experience in this field.'}`,
        reason: `Aligns with ${deptName} curriculum and your ${cgpa >= 7 ? 'strong' : 'developing'} academic profile`,
        score: Math.min(100, score),
        factors: [
          { name: 'CGPA', weight: 0.4, value: cgpa * 10 },
          { name: 'Department Fit', weight: 0.3, value: 90 },
          { name: 'Year Level', weight: 0.2, value: currentYear >= 3 ? 90 : 60 },
          { name: 'Skills', weight: 0.1, value: skills.length * 10 },
        ],
        priority: currentYear >= 3 ? 'high' : 'medium',
        tags: [type, deptName, currentYear >= 3 ? 'immediate' : 'future'],
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      });
    });

    return recommendations;
  } catch (error) {
    logger.error('Error in generateInternshipRecommendations:', error);
    return [];
  }
};

/**
 * Generate skill recommendations
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} Skill recommendations
 */
exports.generateSkillRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId)
      .populate('department')
      .lean();
    if (!student) throw new Error('Student not found');

    const currentSkills = student.academicInfo?.skills || [];
    const department = student.department?.name || 'General';

    // Industry-relevant skills by department
    const skillSets = {
      'Computer Science': [
        'Python',
        'JavaScript',
        'React',
        'Node.js',
        'Docker',
        'AWS',
        'Machine Learning',
        'SQL',
      ],
      Electrical: [
        'MATLAB',
        'PLC Programming',
        'AutoCAD',
        'Circuit Design',
        'IoT',
      ],
      Mechanical: ['SolidWorks', 'ANSYS', 'CNC Programming', '3D Printing', 'CAM'],
      Civil: ['AutoCAD Civil 3D', 'Revit', 'Primavera', 'STAAD Pro', 'GIS'],
    };

    const recommendedSkills = skillSets[department] || [
      'Communication',
      'Leadership',
      'Project Management',
    ];

    // Filter out skills student already has
    const missingSkills = recommendedSkills.filter(
      (skill) => !currentSkills.includes(skill)
    );

    const recommendations = missingSkills.slice(0, 5).map((skill, index) => ({
      user: student.user,
      type: 'skill',
      title: `Learn ${skill}`,
      description: `${skill} is highly valued in ${department} field. ${index < 2 ? 'Top priority for your profile!' : 'Expand your skillset with this.'}`,
      reason: `Industry-relevant skill for ${department} professionals`,
      score: 90 - index * 10,
      factors: [
        { name: 'Industry Demand', weight: 0.5, value: 90 - index * 5 },
        { name: 'Career Impact', weight: 0.3, value: 85 },
        { name: 'Current Gap', weight: 0.2, value: 95 },
      ],
      priority: index < 2 ? 'high' : 'medium',
      tags: [skill, department, 'career-development'],
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    }));

    return recommendations;
  } catch (error) {
    logger.error('Error in generateSkillRecommendations:', error);
    return [];
  }
};

/**
 * Generate study material recommendations
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} Study material recommendations
 */
exports.generateStudyMaterialRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student) throw new Error('Student not found');

    // Get recent marks to identify weak subjects
    const recentMarks = await Marks.find({
      student: studentId,
      isDeleted: false,
    })
      .populate('subject')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recommendations = [];

    // Group marks by subject
    const subjectPerformance = {};
    recentMarks.forEach((mark) => {
      const subjectId = mark.subject?._id.toString();
      const subjectName = mark.subject?.name || 'Unknown';

      if (!subjectPerformance[subjectId]) {
        subjectPerformance[subjectId] = {
          name: subjectName,
          marks: [],
        };
      }
      subjectPerformance[subjectId].marks.push(mark.marksObtained);
    });

    // Recommend materials for subjects with low performance
    for (const [subjectId, data] of Object.entries(subjectPerformance)) {
      const avgMarks =
        data.marks.reduce((sum, m) => sum + m, 0) / data.marks.length;

      if (avgMarks < 70) {
        recommendations.push({
          user: student.user,
          type: 'study_material',
          title: `${data.name} - Study Resources`,
          description: `Curated study materials and practice problems for ${data.name} to improve your understanding. Includes video lectures, notes, and solved examples.`,
          reason: `Current performance (${avgMarks.toFixed(1)}%) indicates need for additional resources`,
          score: 100 - avgMarks,
          factors: [
            { name: 'Performance Gap', weight: 0.7, value: 70 - avgMarks },
            { name: 'Recent Trend', weight: 0.3, value: 75 },
          ],
          priority: avgMarks < 50 ? 'urgent' : 'high',
          tags: [data.name, 'study-material', 'improvement'],
          metadata: {
            relatedTo: [subjectId],
            relatedModel: 'Subject',
          },
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
        });
      }
    }

    return recommendations;
  } catch (error) {
    logger.error('Error in generateStudyMaterialRecommendations:', error);
    return [];
  }
};

/**
 * Generate all recommendations for a student
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} All recommendations
 */
exports.generateAllRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    // Generate all types of recommendations in parallel
    const [courses, internships, skills, materials] = await Promise.all([
      exports.generateCourseRecommendations(studentId),
      exports.generateInternshipRecommendations(studentId),
      exports.generateSkillRecommendations(studentId),
      exports.generateStudyMaterialRecommendations(studentId),
    ]);

    const allRecommendations = [
      ...courses,
      ...internships,
      ...skills,
      ...materials,
    ];

    // Save to database
    if (allRecommendations.length > 0) {
      await Recommendation.insertMany(allRecommendations);
    }

    return allRecommendations;
  } catch (error) {
    logger.error('Error in generateAllRecommendations:', error);
    throw error;
  }
};

/**
 * Generate career path recommendations
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Array>} Career path recommendations
 */
exports.generateCareerRecommendations = async (studentId) => {
  try {
    const student = await Student.findById(studentId)
      .populate('department')
      .lean();
    if (!student) throw new Error('Student not found');

    const cgpa = student.academicInfo?.cgpa || 0;
    const skills = student.academicInfo?.skills || [];
    const department = student.department?.name || 'General';

    // Check if student has placement
    const hasPlacement = await PlacementApplication.findOne({
      student: studentId,
      status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
    });

    if (hasPlacement) {
      return []; // Don't recommend if already placed
    }

    const careerPaths = {
      'Computer Science': [
        {
          title: 'Software Engineer',
          description:
            'Core development role in product companies. High demand and excellent growth.',
        },
        {
          title: 'Data Scientist',
          description:
            'Work with ML/AI and big data. Requires strong analytical skills.',
        },
        {
          title: 'Full Stack Developer',
          description:
            'Build end-to-end applications. Versatile role with startup opportunities.',
        },
      ],
      Electrical: [
        {
          title: 'Power Systems Engineer',
          description: 'Design and maintain electrical power systems.',
        },
        {
          title: 'Embedded Systems Developer',
          description: 'Work on IoT and hardware-software integration.',
        },
      ],
    };

    const paths = careerPaths[department] || [];

    const recommendations = paths.map((path, index) => ({
      user: student.user,
      type: 'career_path',
      title: path.title,
      description: path.description,
      reason: `Aligned with your ${department} background and ${cgpa >= 7.5 ? 'strong' : 'developing'} academic profile (CGPA: ${cgpa})`,
      score: Math.max(60, cgpa * 10 - index * 5),
      factors: [
        { name: 'Department Fit', weight: 0.4, value: 95 },
        { name: 'CGPA', weight: 0.3, value: cgpa * 10 },
        { name: 'Skills', weight: 0.2, value: skills.length * 10 },
        { name: 'Market Demand', weight: 0.1, value: 90 - index * 10 },
      ],
      priority: index === 0 ? 'high' : 'medium',
      tags: [path.title, department, 'career-planning'],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }));

    return recommendations;
  } catch (error) {
    logger.error('Error in generateCareerRecommendations:', error);
    return [];
  }
};

module.exports = exports;
