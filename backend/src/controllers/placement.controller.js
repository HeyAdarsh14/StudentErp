const Company = require('../models/Company.model');
const JobPosting = require('../models/JobPosting.model');
const PlacementApplication = require('../models/PlacementApplication.model');
const Student = require('../models/Student.model');
const asyncHandler = require('express-async-handler');
const { deleteFromCloudinary } = require('../services/fileUpload.service');
const { sendEmail } = require('../services/email.service');

/**
 * ============================================
 * COMPANY MANAGEMENT
 * ============================================
 */

// @desc    Create new company
// @route   POST /api/placement/companies
// @access  Private (PlacementOfficer, Admin)
exports.createCompany = asyncHandler(async (req, res) => {
  const company = await Company.create({
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Company created successfully',
    data: company,
  });
});

// @desc    Get all companies
// @route   GET /api/placement/companies
// @access  Private (PlacementOfficer, Admin, Faculty)
exports.getCompanies = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    industry,
    isVerified,
    isBlacklisted,
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'contactPerson.name': { $regex: search, $options: 'i' } },
      { 'contactPerson.email': { $regex: search, $options: 'i' } },
    ];
  }

  if (industry) query.industry = industry;
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';
  if (isBlacklisted !== undefined)
    query.isBlacklisted = isBlacklisted === 'true';

  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(query)
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Company.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: companies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single company
// @route   GET /api/placement/companies/:id
// @access  Private
exports.getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
    .populate('verifiedBy', 'name email')
    .populate({
      path: 'activeJobs',
      match: { isActive: true, isDeleted: false },
      select: 'title jobType package.minSalary package.maxSalary vacancies applicationDeadline',
    });

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  res.json({
    success: true,
    data: company,
  });
});

// @desc    Update company
// @route   PUT /api/placement/companies/:id
// @access  Private (PlacementOfficer, Admin)
exports.updateCompany = asyncHandler(async (req, res) => {
  let company = await Company.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  company = await Company.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: 'Company updated successfully',
    data: company,
  });
});

// @desc    Verify company
// @route   PUT /api/placement/companies/:id/verify
// @access  Private (PlacementOfficer, Admin)
exports.verifyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  company.isVerified = true;
  company.verifiedBy = req.user._id;
  company.verificationDate = new Date();
  await company.save();

  res.json({
    success: true,
    message: 'Company verified successfully',
    data: company,
  });
});

// @desc    Blacklist/unblacklist company
// @route   PUT /api/placement/companies/:id/blacklist
// @access  Private (Admin)
exports.toggleBlacklist = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const company = await Company.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  company.isBlacklisted = !company.isBlacklisted;
  if (company.isBlacklisted) {
    company.blacklistReason = reason;
  } else {
    company.blacklistReason = undefined;
  }

  await company.save();

  res.json({
    success: true,
    message: `Company ${
      company.isBlacklisted ? 'blacklisted' : 'removed from blacklist'
    } successfully`,
    data: company,
  });
});

// @desc    Delete company
// @route   DELETE /api/placement/companies/:id
// @access  Private (Admin)
exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  await company.softDelete(req.user._id);

  res.json({
    success: true,
    message: 'Company deleted successfully',
  });
});

/**
 * ============================================
 * JOB POSTING MANAGEMENT
 * ============================================
 */

// @desc    Create job posting
// @route   POST /api/placement/jobs
// @access  Private (PlacementOfficer, Admin)
exports.createJobPosting = asyncHandler(async (req, res) => {
  const jobPosting = await JobPosting.create({
    ...req.body,
    postedBy: req.user._id,
  });

  await jobPosting.populate('company', 'name logo industry');

  res.status(201).json({
    success: true,
    message: 'Job posting created successfully',
    data: jobPosting,
  });
});

// @desc    Get all job postings
// @route   GET /api/placement/jobs
// @access  Private
exports.getJobPostings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    jobType,
    company,
    isActive,
    minSalary,
    department,
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { jobRole: { $regex: search, $options: 'i' } },
    ];
  }

  if (jobType) query.jobType = jobType;
  if (company) query.company = company;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (minSalary) query['package.minSalary'] = { $gte: parseInt(minSalary) };
  if (department) query.departments = department;

  // For students, show only active jobs with valid deadline
  if (req.user.role === 'Student') {
    query.isActive = true;
    query.applicationDeadline = { $gte: new Date() };
  }

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    JobPosting.find(query)
      .populate('company', 'name logo industry headquarters')
      .populate('departments', 'name code')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    JobPosting.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: jobs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single job posting
// @route   GET /api/placement/jobs/:id
// @access  Private
exports.getJobPosting = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.id)
    .populate('company')
    .populate('departments', 'name code')
    .populate('postedBy', 'name email');

  if (!job) {
    res.status(404);
    throw new Error('Job posting not found');
  }

  // If student, check eligibility
  let eligibility = null;
  if (req.user.role === 'Student') {
    const student = await Student.findOne({ user: req.user._id });
    if (student) {
      eligibility = job.checkEligibility(student);
    }
  }

  res.json({
    success: true,
    data: job,
    eligibility,
  });
});

// @desc    Update job posting
// @route   PUT /api/placement/jobs/:id
// @access  Private (PlacementOfficer, Admin)
exports.updateJobPosting = asyncHandler(async (req, res) => {
  let job = await JobPosting.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job posting not found');
  }

  job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('company', 'name logo');

  res.json({
    success: true,
    message: 'Job posting updated successfully',
    data: job,
  });
});

// @desc    Toggle job active status
// @route   PUT /api/placement/jobs/:id/toggle
// @access  Private (PlacementOfficer, Admin)
exports.toggleJobStatus = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job posting not found');
  }

  job.isActive = !job.isActive;
  await job.save();

  res.json({
    success: true,
    message: `Job posting ${job.isActive ? 'activated' : 'deactivated'} successfully`,
    data: job,
  });
});

// @desc    Delete job posting
// @route   DELETE /api/placement/jobs/:id
// @access  Private (PlacementOfficer, Admin)
exports.deleteJobPosting = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job posting not found');
  }

  await job.softDelete(req.user._id);

  res.json({
    success: true,
    message: 'Job posting deleted successfully',
  });
});

/**
 * ============================================
 * APPLICATION MANAGEMENT
 * ============================================
 */

// @desc    Apply for job
// @route   POST /api/placement/applications
// @access  Private (Student)
exports.applyForJob = asyncHandler(async (req, res) => {
  const { jobPosting, resume, coverLetter, additionalDocuments, answers } =
    req.body;

  // Get student
  const student = await Student.findOne({ user: req.user._id }).populate(
    'department'
  );
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  // Get job posting
  const job = await JobPosting.findById(jobPosting).populate('company');
  if (!job) {
    res.status(404);
    throw new Error('Job posting not found');
  }

  // Check if job is active
  if (!job.isActive) {
    res.status(400);
    throw new Error('Job posting is not active');
  }

  // Check deadline
  if (job.isExpired()) {
    res.status(400);
    throw new Error('Application deadline has passed');
  }

  // Check eligibility
  const eligibilityResult = job.checkEligibility(student);

  // Check if already applied
  const existingApplication = await PlacementApplication.findOne({
    student: student._id,
    jobPosting,
  });

  if (existingApplication) {
    res.status(400);
    throw new Error('You have already applied for this job');
  }

  // Create application
  const application = await PlacementApplication.create({
    student: student._id,
    jobPosting,
    company: job.company._id,
    resume,
    coverLetter,
    additionalDocuments,
    answers,
    eligibilityCheck: {
      passed: eligibilityResult.eligible,
      errors: eligibilityResult.errors,
    },
  });

  // Update job statistics
  job.totalApplications += 1;
  await job.save();

  await application.populate([
    { path: 'student', select: 'personalInfo academicInfo' },
    { path: 'jobPosting', select: 'title jobType package' },
    { path: 'company', select: 'name logo' },
  ]);

  // Send confirmation email
  try {
    await sendEmail({
      to: req.user.email,
      subject: `Application Submitted - ${job.title}`,
      text: `Your application for ${job.title} at ${job.company.name} has been submitted successfully.`,
      html: `<p>Your application for <strong>${job.title}</strong> at <strong>${job.company.name}</strong> has been submitted successfully.</p>
             <p>Application Status: ${application.status}</p>
             <p>We will notify you about further updates.</p>`,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: application,
  });
});

// @desc    Get applications
// @route   GET /api/placement/applications
// @access  Private
exports.getApplications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    jobPosting,
    company,
    student,
  } = req.query;

  const query = {};

  // Role-based filtering
  if (req.user.role === 'Student') {
    const studentDoc = await Student.findOne({ user: req.user._id });
    if (!studentDoc) {
      res.status(404);
      throw new Error('Student profile not found');
    }
    query.student = studentDoc._id;
  }

  if (status) query.status = status;
  if (jobPosting) query.jobPosting = jobPosting;
  if (company) query.company = company;
  if (student) query.student = student;

  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    PlacementApplication.find(query)
      .populate('student', 'personalInfo academicInfo contactInfo')
      .populate('jobPosting', 'title jobType package applicationDeadline')
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    PlacementApplication.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single application
// @route   GET /api/placement/applications/:id
// @access  Private
exports.getApplication = asyncHandler(async (req, res) => {
  const application = await PlacementApplication.findById(req.params.id)
    .populate('student')
    .populate('jobPosting')
    .populate('company')
    .populate('timeline.changedBy', 'name email');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Authorization check
  if (req.user.role === 'Student') {
    const student = await Student.findOne({ user: req.user._id });
    if (student._id.toString() !== application.student._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this application');
    }
  }

  res.json({
    success: true,
    data: application,
  });
});

// @desc    Update application status
// @route   PUT /api/placement/applications/:id/status
// @access  Private (PlacementOfficer, Admin)
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const application = await PlacementApplication.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const oldStatus = application.status;
  await application.updateStatus(status, req.user._id, notes);

  // Update job statistics
  const job = await JobPosting.findById(application.jobPosting);
  if (job) {
    // Decrement old status count
    if (oldStatus === 'Shortlisted') job.shortlistedCount -= 1;
    if (oldStatus === 'Selected') job.selectedCount -= 1;
    if (oldStatus === 'Rejected') job.rejectedCount -= 1;

    // Increment new status count
    if (status === 'Shortlisted') job.shortlistedCount += 1;
    if (status === 'Selected') job.selectedCount += 1;
    if (status === 'Rejected') job.rejectedCount += 1;

    await job.save();
  }

  await application.populate([
    { path: 'student', select: 'personalInfo contactInfo' },
    { path: 'jobPosting', select: 'title' },
    { path: 'company', select: 'name' },
  ]);

  // Send notification email to student
  try {
    const student = application.student;
    await sendEmail({
      to: student.contactInfo.email,
      subject: `Application Status Update - ${application.jobPosting.title}`,
      text: `Your application status has been updated to: ${status}`,
      html: `<p>Your application for <strong>${application.jobPosting.title}</strong> at <strong>${application.company.name}</strong> has been updated.</p>
             <p><strong>New Status:</strong> ${status}</p>
             ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}`,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.json({
    success: true,
    message: 'Application status updated successfully',
    data: application,
  });
});

// @desc    Schedule interview
// @route   POST /api/placement/applications/:id/interview
// @access  Private (PlacementOfficer, Admin)
exports.scheduleInterview = asyncHandler(async (req, res) => {
  const application = await PlacementApplication.findById(
    req.params.id
  ).populate([
    { path: 'student', select: 'personalInfo contactInfo' },
    { path: 'jobPosting', select: 'title' },
    { path: 'company', select: 'name' },
  ]);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  await application.scheduleInterview(req.body);

  // Send interview notification
  try {
    const student = application.student;
    await sendEmail({
      to: student.contactInfo.email,
      subject: `Interview Scheduled - ${application.jobPosting.title}`,
      text: `Your interview has been scheduled`,
      html: `<p>Congratulations! Your interview for <strong>${application.jobPosting.title}</strong> at <strong>${application.company.name}</strong> has been scheduled.</p>
             <p><strong>Round:</strong> ${req.body.round}</p>
             <p><strong>Date & Time:</strong> ${new Date(
               req.body.scheduledAt
             ).toLocaleString()}</p>
             <p><strong>Type:</strong> ${req.body.type}</p>
             ${
               req.body.meetingLink
                 ? `<p><strong>Meeting Link:</strong> <a href="${req.body.meetingLink}">${req.body.meetingLink}</a></p>`
                 : ''
             }
             ${
               req.body.location
                 ? `<p><strong>Location:</strong> ${req.body.location}</p>`
                 : ''
             }
             <p>All the best!</p>`,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.json({
    success: true,
    message: 'Interview scheduled successfully',
    data: application,
  });
});

// @desc    Make offer
// @route   POST /api/placement/applications/:id/offer
// @access  Private (PlacementOfficer, Admin)
exports.makeOffer = asyncHandler(async (req, res) => {
  const application = await PlacementApplication.findById(
    req.params.id
  ).populate([
    { path: 'student', select: 'personalInfo contactInfo' },
    { path: 'jobPosting', select: 'title' },
    { path: 'company', select: 'name' },
  ]);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  await application.makeOffer(req.body);

  // Update company statistics
  const company = await Company.findById(application.company);
  if (company) {
    company.totalHires += 1;
    await company.save();
  }

  // Send offer notification
  try {
    const student = application.student;
    await sendEmail({
      to: student.contactInfo.email,
      subject: `Offer Letter - ${application.jobPosting.title}`,
      text: `Congratulations! You have received an offer`,
      html: `<p>Congratulations! You have been selected for <strong>${application.jobPosting.title}</strong> at <strong>${application.company.name}</strong>.</p>
             <p><strong>Package:</strong> ₹${req.body.package.ctc} LPA</p>
             <p><strong>Joining Date:</strong> ${new Date(
               req.body.joiningDate
             ).toLocaleDateString()}</p>
             <p><strong>Location:</strong> ${req.body.location}</p>
             <p>Please log in to your portal to accept or reject the offer.</p>`,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  res.json({
    success: true,
    message: 'Offer made successfully',
    data: application,
  });
});

// @desc    Accept/Reject offer
// @route   PUT /api/placement/applications/:id/offer/respond
// @access  Private (Student)
exports.respondToOffer = asyncHandler(async (req, res) => {
  const { action, reason } = req.body; // action: 'accept' or 'reject'

  const application = await PlacementApplication.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Verify student owns this application
  const student = await Student.findOne({ user: req.user._id });
  if (student._id.toString() !== application.student.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (action === 'accept') {
    await application.acceptOffer();
  } else if (action === 'reject') {
    await application.rejectOffer(reason);
  } else {
    res.status(400);
    throw new Error('Invalid action');
  }

  res.json({
    success: true,
    message: `Offer ${action}ed successfully`,
    data: application,
  });
});

// @desc    Withdraw application
// @route   PUT /api/placement/applications/:id/withdraw
// @access  Private (Student)
exports.withdrawApplication = asyncHandler(async (req, res) => {
  const application = await PlacementApplication.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Verify student owns this application
  const student = await Student.findOne({ user: req.user._id });
  if (student._id.toString() !== application.student.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  application.status = 'Withdrawn';
  await application.save();

  // Update job statistics
  const job = await JobPosting.findById(application.jobPosting);
  if (job) {
    job.totalApplications -= 1;
    await job.save();
  }

  res.json({
    success: true,
    message: 'Application withdrawn successfully',
    data: application,
  });
});

/**
 * ============================================
 * STATISTICS & ANALYTICS
 * ============================================
 */

// @desc    Get placement statistics
// @route   GET /api/placement/statistics
// @access  Private (PlacementOfficer, Admin, Faculty)
exports.getPlacementStatistics = asyncHandler(async (req, res) => {
  const { year, department } = req.query;

  const filter = {};
  if (year) filter['student.currentYear'] = parseInt(year);
  if (department) filter['student.department'] = department;

  const [
    totalCompanies,
    verifiedCompanies,
    activeJobs,
    totalApplications,
    selectedApplications,
    averagePackageResult,
    highestPackageResult,
    companiesByIndustry,
    applicationsByStatus,
    monthlyPlacements,
  ] = await Promise.all([
    Company.countDocuments({ isDeleted: false }),
    Company.countDocuments({ isVerified: true, isDeleted: false }),
    JobPosting.countDocuments({ isActive: true, isDeleted: false }),
    PlacementApplication.countDocuments({ isDeleted: false }),
    PlacementApplication.countDocuments({
      status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
      isDeleted: false,
    }),
    PlacementApplication.aggregate([
      {
        $match: {
          'offer.isOffered': true,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgPackage: { $avg: '$offer.package.ctc' },
        },
      },
    ]),
    PlacementApplication.aggregate([
      {
        $match: {
          'offer.isOffered': true,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          maxPackage: { $max: '$offer.package.ctc' },
        },
      },
    ]),
    Company.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    PlacementApplication.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PlacementApplication.aggregate([
      {
        $match: {
          status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
  ]);

  const stats = {
    companies: {
      total: totalCompanies,
      verified: verifiedCompanies,
      byIndustry: companiesByIndustry,
    },
    jobs: {
      active: activeJobs,
    },
    applications: {
      total: totalApplications,
      selected: selectedApplications,
      placementRate: totalApplications
        ? ((selectedApplications / totalApplications) * 100).toFixed(2)
        : 0,
      byStatus: applicationsByStatus,
    },
    packages: {
      average:
        averagePackageResult[0]?.avgPackage?.toFixed(2) || 0,
      highest: highestPackageResult[0]?.maxPackage || 0,
    },
    trends: {
      monthlyPlacements,
    },
  };

  res.json({
    success: true,
    data: stats,
  });
});

// @desc    Get student placement profile
// @route   GET /api/placement/profile
// @access  Private (Student)
exports.getStudentPlacementProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  const [applications, offers] = await Promise.all([
    PlacementApplication.find({ student: student._id })
      .populate('jobPosting', 'title jobType package')
      .populate('company', 'name logo')
      .sort({ createdAt: -1 }),
    PlacementApplication.find({
      student: student._id,
      'offer.isOffered': true,
    })
      .populate('jobPosting', 'title')
      .populate('company', 'name logo'),
  ]);

  const stats = {
    totalApplications: applications.length,
    pending: applications.filter((a) =>
      ['Applied', 'Under Review'].includes(a.status)
    ).length,
    shortlisted: applications.filter((a) => a.status === 'Shortlisted').length,
    selected: applications.filter((a) =>
      ['Selected', 'Offer Accepted'].includes(a.status)
    ).length,
    rejected: applications.filter((a) => a.status === 'Rejected').length,
  };

  res.json({
    success: true,
    data: {
      student,
      applications,
      offers,
      stats,
    },
  });
});

module.exports = exports;
