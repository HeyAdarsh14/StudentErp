const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    feeStructure: {
      tuitionFee: {
        type: Number,
        default: 0,
      },
      libraryFee: {
        type: Number,
        default: 0,
      },
      laboratoryFee: {
        type: Number,
        default: 0,
      },
      examFee: {
        type: Number,
        default: 0,
      },
      sportsFee: {
        type: Number,
        default: 0,
      },
      developmentFee: {
        type: Number,
        default: 0,
      },
      hostelFee: {
        type: Number,
        default: 0,
      },
      transportFee: {
        type: Number,
        default: 0,
      },
      miscellaneous: {
        type: Number,
        default: 0,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue', 'waived'],
      default: 'pending',
    },
    payments: [
      {
        transactionId: String,
        paymentMethod: {
          type: String,
          enum: ['cash', 'card', 'upi', 'net_banking', 'cheque', 'online'],
        },
        amount: Number,
        paymentDate: Date,
        receiptNumber: String,
        receiptUrl: String,
        bankDetails: {
          bankName: String,
          accountNumber: String,
          ifscCode: String,
          chequeNumber: String,
          chequeDate: Date,
        },
        paymentGateway: {
          gateway: String,
          gatewayTransactionId: String,
          gatewayResponse: mongoose.Schema.Types.Mixed,
        },
        status: {
          type: String,
          enum: ['pending', 'success', 'failed', 'refunded'],
          default: 'pending',
        },
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        remarks: String,
      },
    ],
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
      value: Number,
      reason: String,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      appliedAmount: Number,
    },
    lateFee: {
      amount: Number,
      appliedDate: Date,
    },
    scholarship: {
      name: String,
      amount: Number,
      provider: String,
      certificateUrl: String,
    },
    remarks: {
      type: String,
    },
    sendReminders: {
      type: Boolean,
      default: true,
    },
    remindersSent: [
      {
        sentAt: Date,
        method: {
          type: String,
          enum: ['email', 'sms', 'notification'],
        },
        status: String,
      },
    ],
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
feeSchema.index({ student: 1, academicYear: 1, semester: 1 });
feeSchema.index({ status: 1, dueDate: 1 });
feeSchema.index({ dueDate: 1 });

// Calculate due amount before saving
feeSchema.pre('save', function (next) {
  let totalDiscount = 0;
  
  if (this.discount && this.discount.value) {
    if (this.discount.type === 'percentage') {
      totalDiscount = (this.totalAmount * this.discount.value) / 100;
    } else {
      totalDiscount = this.discount.value;
    }
    this.discount.appliedAmount = totalDiscount;
  }

  let totalScholarship = 0;
  if (this.scholarship && this.scholarship.amount) {
    totalScholarship = this.scholarship.amount;
  }

  let lateFee = 0;
  if (this.lateFee && this.lateFee.amount) {
    lateFee = this.lateFee.amount;
  }

  const adjustedTotal = this.totalAmount - totalDiscount - totalScholarship + lateFee;
  this.dueAmount = adjustedTotal - this.paidAmount;

  // Update status based on payment
  if (this.dueAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partially_paid';
  } else if (new Date() > this.dueDate) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }

  next();
});

// Query middleware
feeSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
