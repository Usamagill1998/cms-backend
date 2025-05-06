const mongoose = require('mongoose');
const config = require('../config/config');

const ComplaintSchema = new mongoose.Schema({
  // Reference to department
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  
  // Complaint tracking number (auto-generated)
  complaintNo: {
    type: String,
    unique: true,
    required: false
  },
  
  // Reference to user who submitted the complaint
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Status of the complaint
  status: {
    type: String,
    enum: Object.values(config.complaintStatus),
    default: config.complaintStatus.PENDING
  },
  
  // Stage 1: Personal Information
  personalInfo: {
    fullName: {
      type: String,
      required: [true, 'Please add full name'],
      trim: true
    },
    mobileNo: {
      type: String,
      required: [true, 'Please add mobile number'],
      trim: true
    },
    whatsappNo: {
      type: String,
      trim: true
    },
    cnicNo: {
      type: String,
      required: [true, 'Please add CNIC number'],
      match: [
        /^\d{13}$/,
        'Please add a valid CNIC number without dashes'
      ]
    },
    email: {
      type: String,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please add a valid email'
      ]
    },
    city: {
      type: String,
      required: [true, 'Please add city of residence'],
      trim: true
    }
  },
  
  // Stage 2: Property Information (specific to Housing Projects)
  propertyInfo: {
    housingProject: {
      type: String,
      trim: true
    },
    phase: {
      type: String,
      trim: true
    },
    propertyType: {
      type: String,
      enum: ['Plot', 'Apartment', 'House', 'Flat'],
      default: 'Plot'
    },
    size: {
      type: String,
      trim: true
    },
    sizeUnit: {
      type: String,
      enum: ['Sq ft', 'Marla', 'Kanal'],
      default: 'Sq ft'
    },
    fileNo: {
      type: String,
      trim: true
    },
    plotNo: {
      type: String,
      trim: true
    },
    houseNo: {
      type: String,
      trim: true
    },
    flatNo: {
      type: String,
      trim: true
    },
    blockNo: {
      type: String,
      trim: true
    },
    totalPrice: {
      type: Number
    },
    amountPaid: {
      type: Number
    },
    balancePayable: {
      type: Number
    },
    problemType: {
      type: String,
      trim: true
    },
    otherIssue: {
      type: String,
      trim: true
    }
  },
  
  // Stage 3: Documents - References to uploaded files
  documents: {
    idCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    registrationFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    paymentReceipts: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    allotmentLetter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    cancellationLetter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    demandLetter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }
  },
  
  // Comments/updates on the complaint
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: {
        type: String,
        required: true
      },
      isInternal: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  
  // Assigned staff member (if any)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Resolution details
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    },
    resolutionSummary: {
      type: String
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update updatedAt field
ComplaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to generate complaint number if not provided
ComplaintSchema.pre('save', async function(next) {
  // Only generate complaint number for new complaints
  if (!this.isNew) {
    return next();
  }
  
  // Format: HP-YYYYMM-00001 (HP for Housing Projects)
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Get department code
  const Department = mongoose.model('Department');
  try {
    const department = await Department.findById(this.department);
    let prefix = 'HP'; // Default
    
    if (department) {
      // Get first two letters of department type
      prefix = department.type.substring(0, 2).toUpperCase();
    }
    
    // Find the latest complaint with same prefix and year-month
    const latestComplaint = await this.constructor.findOne(
      { 
        complaintNo: { 
          $regex: `^${prefix}-${year}${month}-` 
        } 
      },
      { complaintNo: 1 },
      { sort: { complaintNo: -1 } }
    );
    
    let nextNumber = '00001';
    if (latestComplaint) {
      const lastNumber = parseInt(latestComplaint.complaintNo.split('-')[2]);
      nextNumber = String(lastNumber + 1).padStart(5, '0');
    }
    
    this.complaintNo = `${prefix}-${year}${month}-${nextNumber}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);