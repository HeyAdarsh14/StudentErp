const Timetable = require('../models/Timetable.model');
const Subject = require('../models/Subject.model');
const Faculty = require('../models/Faculty.model');
const Student = require('../models/Student.model');
const Department = require('../models/Department.model');
const MESSAGES = require('../constants/messages');

/**
 * Detect conflicts in timetable
 */
const detectConflicts = async (slot) => {
  const conflicts = [];

  // Check faculty availability
  const facultyConflicts = await Timetable.find({
    faculty: slot.faculty,
    dayOfWeek: slot.dayOfWeek,
    startTime: { $lt: slot.endTime },
    endTime: { $gt: slot.startTime },
    _id: { $ne: slot._id },
  })
    .populate('subject', 'name')
    .populate('room', 'name');

  if (facultyConflicts.length > 0) {
    conflicts.push({
      type: 'faculty',
      message: `Faculty is already scheduled during this time`,
      conflictingSlots: facultyConflicts,
    });
  }

  // Check room availability
  if (slot.room) {
    const roomConflicts = await Timetable.find({
      room: slot.room,
      dayOfWeek: slot.dayOfWeek,
      startTime: { $lt: slot.endTime },
      endTime: { $gt: slot.startTime },
      _id: { $ne: slot._id },
    })
      .populate('subject', 'name')
      .populate('faculty', 'name');

    if (roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: `Room is already booked during this time`,
        conflictingSlots: roomConflicts,
      });
    }
  }

  // Check student group conflicts
  const studentConflicts = await Timetable.find({
    department: slot.department,
    year: slot.year,
    section: slot.section,
    dayOfWeek: slot.dayOfWeek,
    startTime: { $lt: slot.endTime },
    endTime: { $gt: slot.startTime },
    _id: { $ne: slot._id },
  })
    .populate('subject', 'name')
    .populate('faculty', 'name');

  if (studentConflicts.length > 0) {
    conflicts.push({
      type: 'student',
      message: `Student group already has a class during this time`,
      conflictingSlots: studentConflicts,
    });
  }

  return conflicts;
};

/**
 * Generate timetable automatically
 */
const autoGenerateTimetable = async (req, res, next) => {
  try {
    const { department, year, section, semester } = req.body;

    // Get subjects for this semester
    const subjects = await Subject.find({
      department,
      year,
      semester,
    })
      .populate('faculty', 'name')
      .lean();

    if (subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subjects found for this semester',
      });
    }

    // Time slots (9 AM to 5 PM, 1 hour each)
    const timeSlots = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '15:00' }, // After lunch
      { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '17:00' },
    ];

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const generatedSlots = [];
    let currentSubjectIndex = 0;

    // Simple round-robin allocation
    for (const day of daysOfWeek) {
      for (const slot of timeSlots) {
        // Skip lunch hour
        if (slot.startTime === '12:00') continue;

        const subject = subjects[currentSubjectIndex % subjects.length];

        const timetableSlot = {
          subject: subject._id,
          faculty: subject.faculty?._id || subject.faculty,
          department,
          year,
          section,
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          semester,
          classType: currentSubjectIndex % 3 === 0 ? 'Practical' : 'Theory',
        };

        // Check conflicts before adding
        const conflicts = await detectConflicts(timetableSlot);

        if (conflicts.length === 0) {
          generatedSlots.push(timetableSlot);
        }

        currentSubjectIndex++;
      }
    }

    // Delete existing timetable for this group
    await Timetable.deleteMany({ department, year, section });

    // Insert new timetable
    const timetable = await Timetable.insertMany(generatedSlots);

    res.json({
      success: true,
      message: 'Timetable generated successfully',
      data: {
        totalSlots: timetable.length,
        timetable: await Timetable.find({ department, year, section })
          .populate('subject', 'name code')
          .populate('faculty', 'name')
          .populate('room', 'name roomNumber')
          .lean(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create manual timetable slot
 */
const createTimetableSlot = async (req, res, next) => {
  try {
    const slotData = req.body;

    // Check conflicts
    const conflicts = await detectConflicts(slotData);

    if (conflicts.length > 0 && !req.body.forceCreate) {
      return res.status(409).json({
        success: false,
        message: 'Conflicts detected',
        conflicts,
      });
    }

    const slot = await Timetable.create(slotData);

    const populatedSlot = await Timetable.findById(slot._id)
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .populate('room', 'name roomNumber')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Timetable slot created',
      data: populatedSlot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get timetable for a group
 */
const getTimetable = async (req, res, next) => {
  try {
    const { department, year, section, dayOfWeek } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (year) filter.year = year;
    if (section) filter.section = section;
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

    const timetable = await Timetable.find(filter)
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .populate('room', 'name roomNumber')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    // Group by day
    const groupedByDay = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    timetable.forEach((slot) => {
      if (groupedByDay[slot.dayOfWeek]) {
        groupedByDay[slot.dayOfWeek].push(slot);
      }
    });

    res.json({
      success: true,
      data: {
        timetable: groupedByDay,
        totalSlots: timetable.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get faculty timetable
 */
const getFacultyTimetable = async (req, res, next) => {
  try {
    const { facultyId } = req.params;

    const timetable = await Timetable.find({ faculty: facultyId })
      .populate('subject', 'name code')
      .populate('department', 'name')
      .populate('room', 'name roomNumber')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    // Calculate workload
    const workloadHours = timetable.length; // Each slot is 1 hour

    // Group by day
    const groupedByDay = {};
    timetable.forEach((slot) => {
      if (!groupedByDay[slot.dayOfWeek]) {
        groupedByDay[slot.dayOfWeek] = [];
      }
      groupedByDay[slot.dayOfWeek].push(slot);
    });

    res.json({
      success: true,
      data: {
        timetable: groupedByDay,
        workloadHours,
        totalSlots: timetable.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update timetable slot
 */
const updateTimetableSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check conflicts for updated slot
    const conflicts = await detectConflicts({ ...updates, _id: id });

    if (conflicts.length > 0 && !req.body.forceUpdate) {
      return res.status(409).json({
        success: false,
        message: 'Conflicts detected',
        conflicts,
      });
    }

    const slot = await Timetable.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .populate('room', 'name roomNumber');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Timetable slot updated',
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete timetable slot
 */
const deleteTimetableSlot = async (req, res, next) => {
  try {
    const { id } = req.params;

    const slot = await Timetable.findByIdAndDelete(id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Timetable slot deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check slot availability
 */
const checkAvailability = async (req, res, next) => {
  try {
    const { faculty, room, department, year, section, dayOfWeek, startTime, endTime } = req.query;

    const conflicts = await detectConflicts({
      faculty,
      room,
      department,
      year: parseInt(year),
      section,
      dayOfWeek,
      startTime,
      endTime,
    });

    res.json({
      success: true,
      data: {
        available: conflicts.length === 0,
        conflicts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Swap two timetable slots
 */
const swapSlots = async (req, res, next) => {
  try {
    const { slot1Id, slot2Id } = req.body;

    const slot1 = await Timetable.findById(slot1Id);
    const slot2 = await Timetable.findById(slot2Id);

    if (!slot1 || !slot2) {
      return res.status(404).json({
        success: false,
        message: 'One or both slots not found',
      });
    }

    // Swap timing and day
    const temp = {
      dayOfWeek: slot1.dayOfWeek,
      startTime: slot1.startTime,
      endTime: slot1.endTime,
    };

    slot1.dayOfWeek = slot2.dayOfWeek;
    slot1.startTime = slot2.startTime;
    slot1.endTime = slot2.endTime;

    slot2.dayOfWeek = temp.dayOfWeek;
    slot2.startTime = temp.startTime;
    slot2.endTime = temp.endTime;

    await slot1.save();
    await slot2.save();

    res.json({
      success: true,
      message: 'Slots swapped successfully',
      data: {
        slot1: await Timetable.findById(slot1Id).populate('subject faculty room'),
        slot2: await Timetable.findById(slot2Id).populate('subject faculty room'),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  autoGenerateTimetable,
  createTimetableSlot,
  getTimetable,
  getFacultyTimetable,
  updateTimetableSlot,
  deleteTimetableSlot,
  checkAvailability,
  swapSlots,
};
