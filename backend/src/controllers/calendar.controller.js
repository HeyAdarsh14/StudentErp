const AcademicCalendar = require('../models/AcademicCalendar.model');
const MESSAGES = require('../constants/messages');

/**
 * Create calendar event
 */
const createEvent = async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const event = await AcademicCalendar.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Calendar event created',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all events with filters
 */
const getEvents = async (req, res, next) => {
  try {
    const { academicYear, semester, eventType, department, startDate, endDate, month, year } =
      req.query;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (eventType) filter.eventType = eventType;
    if (department) filter.department = department;

    // Date range filter
    if (startDate && endDate) {
      filter.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) },
        },
      ];
    }

    // Month filter
    if (month && year) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      filter.$or = [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } },
        { startDate: { $lte: monthStart }, endDate: { $gte: monthEnd } },
      ];
    }

    const events = await AcademicCalendar.find(filter)
      .populate('department', 'name code')
      .sort({ startDate: 1 })
      .lean();

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single event
 */
const getEvent = async (req, res, next) => {
  try {
    const event = await AcademicCalendar.findById(req.params.id)
      .populate('department', 'name code')
      .populate('createdBy', 'name')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event
 */
const updateEvent = async (req, res, next) => {
  try {
    const event = await AcademicCalendar.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Event updated',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await AcademicCalendar.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Event deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get holidays for a date range
 */
const getHolidays = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const holidays = await AcademicCalendar.find({
      isHoliday: true,
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      ],
    })
      .sort({ startDate: 1 })
      .lean();

    res.json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming events
 */
const getUpcomingEvents = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const events = await AcademicCalendar.find({
      startDate: { $gte: new Date() },
    })
      .populate('department', 'name')
      .sort({ startDate: 1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getHolidays,
  getUpcomingEvents,
};
