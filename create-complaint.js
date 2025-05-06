const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const moment = require('moment');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const User = require('./models/User');
const config = require('./config/config');

// Set faker locale to English
faker.locale = 'en';

// Set the department ID specified by user
const DEPARTMENT_ID = '67f10f0f517efcb1744df426';
const TOTAL_COMPLAINTS = 10000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/complaint-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Array of housing projects
const housingProjects = [
  'Green Valley',
  'Blue Heights',
  'Bahria Town',
  'DHA City',
  'Lake City',
  'Park View',
  'River Gardens',
  'Gulberg Residencia',
  'Eden Gardens',
  'Palm City'
];

// Array of problem types
const problemTypes = [
  'Overcharging',
  'Construction Issues',
  'Legal Documentation',
  'Delayed Possession',
  'Poor Infrastructure',
  'Water Supply',
  'Electricity Issues',
  'Plot Allocation',
  'Boundary Disputes',
  'Security Concerns',
  'Payment Issues',
  'Sewage Problems',
  'Road Issues',
  'Title Problems',
  'Other'
];

// Array of cities
const cities = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Multan',
  'Faisalabad',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala'
];

// Array of phases
const phases = [
  'Phase 1',
  'Phase 2',
  'Phase 3',
  'Phase 4',
  'Phase 5',
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Extension'
];

// Array of property types
const propertyTypes = [
  'Plot',
  'Apartment',
  'House',
  'Flat'
];

// Array of size units
const sizeUnits = [
  'Sq ft',
  'Marla',
  'Kanal'
];

// Define complaint statuses if config is not available
const complaintStatus = config.complaintStatus || {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected'
};

// Generate random status with weighted distribution
const getRandomStatus = () => {
  const weights = {
    [complaintStatus.PENDING]: 0.3,
    [complaintStatus.IN_PROGRESS]: 0.3,
    [complaintStatus.RESOLVED]: 0.2,
    [complaintStatus.CLOSED]: 0.1,
    [complaintStatus.REJECTED]: 0.1
  };
  
  const random = Math.random();
  let sum = 0;
  
  for (const status in weights) {
    sum += weights[status];
    if (random < sum) return status;
  }
  
  return complaintStatus.PENDING;
};

// Generate random date between two dates
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random CNIC number (13 digits)
const generateCNIC = () => {
  let cnic = '';
  for (let i = 0; i < 13; i++) {
    cnic += Math.floor(Math.random() * 10);
  }
  return cnic;
};

// Generate a unique complaint number
const generateComplaintNo = (index, departmentType) => {
  const year = moment().format('YYYY');
  const month = moment().format('MM');
  // Use department type prefix (first 2 letters uppercase)
  const prefix = (departmentType && departmentType.length >= 2) 
    ? departmentType.substring(0, 2).toUpperCase() 
    : 'HP';
  return `${prefix}-${year}${month}-${String(index).padStart(5, '0')}`;
};

// Generate random money amount
const generateAmount = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
};

// Generate a sample complaint
const generateComplaint = async (index, department, staffUsers, hodUsers) => {
  const status = getRandomStatus();
  const createdAt = randomDate(new Date(2023, 0, 1), new Date());
  
  // Ensure problem type is defined
  const problemType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
  
  // Generate property info with realistic values
  const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  const totalPrice = generateAmount(500, 5000); // 500,000 to 5,000,000
  const amountPaid = Math.floor(Math.random() * totalPrice);
  const balancePayable = totalPrice - amountPaid;
  
  // Determine which property number field to use based on property type
  let plotNo = null;
  let houseNo = null;
  let flatNo = null;
  let blockNo = Math.random() > 0.5 ? `Block-${Math.floor(Math.random() * 20) + 1}` : null;
  
  if (propertyType === 'Plot') {
    plotNo = `P-${Math.floor(Math.random() * 10000)}`;
  } else if (propertyType === 'House') {
    houseNo = `H-${Math.floor(Math.random() * 5000)}`;
  } else if (propertyType === 'Flat' || propertyType === 'Apartment') {
    flatNo = `F-${Math.floor(Math.random() * 3000)}`;
  }
  
  // Create base complaint object
  const complaint = {
    department: DEPARTMENT_ID,
    complaintNo: generateComplaintNo(index, department.type),
    status: status,
    createdAt: createdAt,
    updatedAt: createdAt,
    personalInfo: {
      fullName: faker.person.fullName(),
      mobileNo: faker.phone.number('0###-#######'),
      whatsappNo: faker.phone.number('0###-#######'),
      cnicNo: generateCNIC(),
      email: faker.internet.email(),
      city: cities[Math.floor(Math.random() * cities.length)]
    },
    propertyInfo: {
      housingProject: housingProjects[Math.floor(Math.random() * housingProjects.length)],
      phase: phases[Math.floor(Math.random() * phases.length)],
      propertyType: propertyType,
      size: String(Math.floor(Math.random() * 20) + 5),
      sizeUnit: sizeUnits[Math.floor(Math.random() * sizeUnits.length)],
      fileNo: `F-${Math.floor(Math.random() * 10000)}`,
      plotNo: plotNo,
      houseNo: houseNo,
      flatNo: flatNo,
      blockNo: blockNo,
      totalPrice: totalPrice,
      amountPaid: amountPaid,
      balancePayable: balancePayable,
      problemType: problemType,
      otherIssue: problemType === 'Other' ? 
        faker.lorem.sentence() : 
        ''
    },
    comments: [
      {
        text: 'Complaint received and registered',
        isInternal: false,
        createdAt: createdAt
      }
    ]
  };
  
  // Random assignment to staff (35% of complaints)
  if (staffUsers.length > 0 && Math.random() < 0.35) {
    const randomStaff = staffUsers[Math.floor(Math.random() * staffUsers.length)];
    complaint.assignedTo = randomStaff._id;
    
    // Add assignment comment
    const assignmentDate = new Date(createdAt);
    assignmentDate.setDate(assignmentDate.getDate() + Math.floor(Math.random() * 3) + 1);
    
    complaint.comments.push({
      user: hodUsers.length > 0 ? hodUsers[0]._id : null,
      text: `Complaint assigned to ${randomStaff.name}`,
      isInternal: true,
      createdAt: assignmentDate
    });
  }
  
  // Add follow-up comments with later dates if the complaint is not 'pending'
  if (status !== complaintStatus.PENDING) {
    const followUpDate = new Date(createdAt);
    followUpDate.setDate(followUpDate.getDate() + Math.floor(Math.random() * 5) + 1);
    
    complaint.comments.push({
      user: complaint.assignedTo,
      text: 'Complaint is being investigated',
      isInternal: false,
      createdAt: followUpDate
    });
    
    // Add another progress comment (50% chance)
    if (Math.random() < 0.5) {
      const secondFollowUpDate = new Date(followUpDate);
      secondFollowUpDate.setDate(secondFollowUpDate.getDate() + Math.floor(Math.random() * 3) + 1);
      
      complaint.comments.push({
        user: complaint.assignedTo,
        text: `Progress update: ${faker.lorem.sentence()}`,
        isInternal: Math.random() < 0.3, // 30% chance it's internal
        createdAt: secondFollowUpDate
      });
    }
  }
  
  // Add resolution details if the complaint is 'resolved' or 'closed'
  if (status === complaintStatus.RESOLVED || status === complaintStatus.CLOSED) {
    const resolutionDate = new Date(createdAt);
    resolutionDate.setDate(resolutionDate.getDate() + Math.floor(Math.random() * 15) + 5);
    
    const resolvedBy = complaint.assignedTo || 
                      (staffUsers.length > 0 ? staffUsers[Math.floor(Math.random() * staffUsers.length)]._id : null);
    
    complaint.comments.push({
      user: resolvedBy,
      text: `Issue has been ${status === complaintStatus.RESOLVED ? 'resolved' : 'closed'}`,
      isInternal: false,
      createdAt: resolutionDate
    });
    
    complaint.resolution = {
      resolvedBy: resolvedBy,
      resolvedAt: resolutionDate,
      resolutionSummary: status === complaintStatus.RESOLVED ? 
        `${problemType} issue resolved successfully. ${faker.lorem.sentence()}` : 
        `Complaint closed. ${faker.lorem.sentence()}`
    };
  }
  
  // Add rejection comment if the complaint is 'rejected'
  if (status === complaintStatus.REJECTED) {
    const rejectionDate = new Date(createdAt);
    rejectionDate.setDate(rejectionDate.getDate() + Math.floor(Math.random() * 5) + 1);
    
    const rejectedBy = complaint.assignedTo || 
                      (hodUsers.length > 0 ? hodUsers[0]._id : null);
    
    complaint.comments.push({
      user: rejectedBy,
      text: `Complaint rejected: ${faker.lorem.sentence()}`,
      isInternal: false,
      createdAt: rejectionDate
    });
  }
  
  return complaint;
};

const generateComplaints = async () => {
  try {
    console.log('=== GENERATING SAMPLE COMPLAINTS ===');
    
    // Check if department exists
    const departmentExists = await Department.findById(DEPARTMENT_ID);
    if (!departmentExists) {
      console.error(`Department with ID ${DEPARTMENT_ID} not found. Please check the ID.`);
      process.exit(1);
    }
    
    console.log(`Department found: ${departmentExists.name}`);
    console.log(`Department type: ${departmentExists.type}`);
    
    // Get staff users for this department for assignment
    const staffUsers = await User.find({ 
      role: 'staff', 
      assignedDepartment: DEPARTMENT_ID,
      isActive: true
    });
    console.log(`Found ${staffUsers.length} staff users for assignment`);
    
    // Get HOD users for this department
    const hodUsers = await User.find({ 
      role: 'hod', 
      assignedDepartment: DEPARTMENT_ID,
      isActive: true
    });
    console.log(`Found ${hodUsers.length} HOD users for department`);
    
    // Get the current highest complaint number for this department to avoid duplicates
    const latestComplaint = await Complaint.findOne(
      { department: DEPARTMENT_ID },
      { complaintNo: 1 },
      { sort: { complaintNo: -1 } }
    );
    
    console.log(`Latest complaint found: ${latestComplaint ? latestComplaint.complaintNo : 'None'}`);
    
    // Define our starting index for complaint numbers
    let startingIndex = 0;
    if (latestComplaint && latestComplaint.complaintNo) {
      const parts = latestComplaint.complaintNo.split('-');
      if (parts.length === 3) {
        startingIndex = parseInt(parts[2], 10);
      }
    }
    console.log(`Starting complaint index: ${startingIndex}`);
    
    console.log(`Generating ${TOTAL_COMPLAINTS} complaints for department...`);
    
    // Create complaints in batches to avoid memory issues
    const BATCH_SIZE = 100; // Reduced batch size to avoid potential issues
    const totalBatches = Math.ceil(TOTAL_COMPLAINTS / BATCH_SIZE);
    
    let totalInserted = 0;
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * BATCH_SIZE;
      const end = Math.min((batch + 1) * BATCH_SIZE, TOTAL_COMPLAINTS);
      const batchCount = end - start;
      
      console.log(`Generating batch ${batch + 1}/${totalBatches} (${start + 1} to ${end})...`);
      
      const complaints = [];
      for (let i = start; i < end; i++) {
        const complaint = await generateComplaint(startingIndex + i + 1, departmentExists, staffUsers, hodUsers);
        complaints.push(complaint);
      }
      
      // Use save instead of insertMany to ensure middleware runs properly
      // or use insertMany with specific options
      try {
        const result = await Complaint.insertMany(complaints, { ordered: false });
        totalInserted += result.length;
        console.log(`Inserted batch ${batch + 1}: ${result.length} complaints (total: ${totalInserted})`);
      } catch (err) {
        // If some inserts failed but others succeeded, continue
        if (err.code === 11000) {
          console.warn(`Some duplicates were found in batch ${batch + 1}, but continuing...`);
          if (err.result && err.result.insertedCount) {
            totalInserted += err.result.insertedCount;
            console.warn(`${err.result.insertedCount} documents were inserted successfully.`);
          }
        } else {
          throw err;
        }
      }
    }
    
    // Generate statistics
    const stats = {
      total: await Complaint.countDocuments({ department: DEPARTMENT_ID }),
      resolved: await Complaint.countDocuments({ 
        department: DEPARTMENT_ID, 
        status: complaintStatus.RESOLVED 
      }),
      pending: await Complaint.countDocuments({ 
        department: DEPARTMENT_ID, 
        status: complaintStatus.PENDING 
      }),
      inProgress: await Complaint.countDocuments({ 
        department: DEPARTMENT_ID, 
        status: complaintStatus.IN_PROGRESS 
      }),
      closed: await Complaint.countDocuments({ 
        department: DEPARTMENT_ID, 
        status: complaintStatus.CLOSED 
      }),
      rejected: await Complaint.countDocuments({ 
        department: DEPARTMENT_ID, 
        status: complaintStatus.REJECTED 
      })
    };
    
    console.log('\n=== COMPLAINTS GENERATED SUCCESSFULLY ===');
    console.log('Total complaints inserted in this run:', totalInserted);
    console.log('Complaint Statistics:');
    console.log(`- Total: ${stats.total}`);
    console.log(`- Resolved: ${stats.resolved}`);
    console.log(`- Pending: ${stats.pending}`);
    console.log(`- In Progress: ${stats.inProgress}`);
    console.log(`- Closed: ${stats.closed}`);
    console.log(`- Rejected: ${stats.rejected}`);
    
    console.log('\nThe database has been populated with sample complaints.');
    console.log('You can now use this data for testing and development.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the generation script
generateComplaints();