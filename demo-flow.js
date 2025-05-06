const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');
const User = require('./models/User');
const config = require('./config/config');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/complaint-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

const demoAdminFlow = async () => {
  try {
    console.log('=== ADMIN FLOW DEMONSTRATION ===');
    
    // 1. Check what departments exist
    const allDepartments = await Department.find({});
    console.log('\n=== AVAILABLE DEPARTMENTS ===');
    
    let department;
    
    if (allDepartments.length === 0) {
      console.log('No departments found. Creating a new one...');
      
      // Create a new department
      department = await Department.create({
        name: 'Housing Department',
        nameUrdu: 'محکمہ ہاؤسنگ',
        type: 'housing_projects', // Use the exact string from your config
        description: 'Manages all housing project complaints',
        contactEmail: 'housing@example.com',
        contactPhone: '123-456-7890',
        isActive: true
      });
      
      console.log(`Created new department: ${department.name} (${department._id})`);
    } else {
      console.log('Existing departments:');
      allDepartments.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name} (${dept._id}) - Type: ${dept.type}`);
      });
      
      // Use the first department
      department = allDepartments[0];
      console.log(`\nUsing department: ${department.name} (${department._id})`);
    }
    
    // 2. Find or create HOD
    let hod = await User.findOne({ role: 'hod' });
    if (!hod) {
      console.log('Creating new HOD...');
      hod = await User.create({
        name: 'Department HOD',
        email: 'hod@example.com',
        password: 'hod123',
        phone: '111-222-3333',
        role: 'hod',
        assignedDepartment: department._id,
        isActive: true
      });
    } else {
      // Update HOD's department if needed
      if (!hod.assignedDepartment || hod.assignedDepartment.toString() !== department._id.toString()) {
        hod.assignedDepartment = department._id;
        await hod.save();
        console.log(`Updated HOD's department assignment`);
      }
    }
    console.log(`HOD: ${hod.name} (${hod._id})`);
    
    // 3. Find or create staff
    let staff = await User.findOne({ role: 'staff' });
    if (!staff) {
      console.log('Creating new staff member...');
      staff = await User.create({
        name: 'Department Staff',
        email: 'staff@example.com',
        password: 'staff123',
        phone: '444-555-6666',
        role: 'staff',
        assignedDepartment: department._id,
        isActive: true
      });
    } else {
      // Update staff's department if needed
      if (!staff.assignedDepartment || staff.assignedDepartment.toString() !== department._id.toString()) {
        staff.assignedDepartment = department._id;
        await staff.save();
        console.log(`Updated staff's department assignment`);
      }
    }
    console.log(`Staff: ${staff.name} (${staff._id})`);
    
    // 4. Create a new complaint or find the latest one
    let complaint = await Complaint.findOne().sort('-createdAt');
    
    if (!complaint) {
      console.log('Creating new complaint...');
      complaint = await Complaint.create({
        department: department._id,
        complaintNo: `HO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-00001`,
        status: 'pending',
        personalInfo: {
          fullName: 'John Citizen',
          mobileNo: '777-888-9999',
          whatsappNo: '777-888-9999',
          cnicNo: '1234567890123',
          email: 'user@example.com',
          city: 'Lahore'
        },
        propertyInfo: {
          housingProject: 'Green Valley',
          phase: 'Phase 1',
          propertyType: 'House',
          size: '10',
          sizeUnit: 'Marla',
          fileNo: 'F-123',
          plotNo: 'P-456',
          problemType: 'Overcharging',
          otherIssue: 'Being charged extra fees not mentioned in the contract'
        },
        comments: [
          {
            text: 'Complaint received and registered',
            isInternal: false,
            createdAt: new Date()
          }
        ]
      });
    } else {
      // Update complaint's department if needed
      if (!complaint.department || complaint.department.toString() !== department._id.toString()) {
        complaint.department = department._id;
        await complaint.save();
        console.log(`Updated complaint's department assignment`);
      }
    }
    
    console.log(`Complaint: ${complaint.complaintNo} (${complaint._id})`);
    console.log(`Complaint department: ${complaint.department}`);
    console.log(`Department ID: ${department._id}`);
    
    // 5. HOD views the complaint
    console.log('\n=== HOD VIEWS COMPLAINT ===');
    console.log(`Complaint #${complaint.complaintNo}`);
    console.log(`Status: ${complaint.status}`);
    console.log(`Problem: ${complaint.propertyInfo.problemType}`);
    console.log(`Housing Project: ${complaint.propertyInfo.housingProject}`);
    
    // 6. HOD assigns complaint to staff
    console.log('\n=== HOD ASSIGNS COMPLAINT TO STAFF ===');
    complaint.assignedTo = staff._id;
    complaint.comments.push({
      text: `Complaint assigned to ${staff.name}`,
      isInternal: true,
      createdAt: new Date()
    });
    await complaint.save();
    console.log(`Complaint assigned to ${staff.name}`);
    
    // 7. Staff views assigned complaint
    console.log('\n=== STAFF VIEWS ASSIGNED COMPLAINT ===');
    const assignedComplaint = await Complaint.findOne({ assignedTo: staff._id })
      .populate('department', 'name')
      .populate('assignedTo', 'name');
    
    if (assignedComplaint) {
      console.log(`Complaint #${assignedComplaint.complaintNo}`);
      console.log(`Department: ${assignedComplaint.department.name}`);
      console.log(`Assigned to: ${assignedComplaint.assignedTo.name}`);
      console.log(`Status: ${assignedComplaint.status}`);
    } else {
      console.log('No complaints assigned to this staff member');
    }
    
    // 8. Staff updates complaint status to in-progress
    console.log('\n=== STAFF UPDATES COMPLAINT STATUS TO IN-PROGRESS ===');
    complaint.status = 'in_progress';
    complaint.comments.push({
      user: staff._id,
      text: 'Started investigating the overcharging issue',
      isInternal: false,
      createdAt: new Date()
    });
    await complaint.save();
    console.log(`Complaint status updated to: ${complaint.status}`);
    
    // 9. Staff resolves the complaint
    console.log('\n=== STAFF RESOLVES THE COMPLAINT ===');
    complaint.status = 'resolved';
    complaint.resolution = {
      resolvedBy: staff._id,
      resolvedAt: new Date(),
      resolutionSummary: 'Overcharging issue resolved. Extra fees waived and refund processed.'
    };
    complaint.comments.push({
      user: staff._id,
      text: 'Overcharging issue resolved. Extra fees waived and refund processed.',
      isInternal: false,
      createdAt: new Date()
    });
    await complaint.save();
    console.log(`Complaint status updated to: ${complaint.status}`);
    
    // 10. Admin views statistics
    console.log('\n=== ADMIN VIEWS COMPLAINT STATISTICS ===');
    const stats = {
      total: await Complaint.countDocuments(),
      resolved: await Complaint.countDocuments({ status: 'resolved' }),
      pending: await Complaint.countDocuments({ status: 'pending' }),
      inProgress: await Complaint.countDocuments({ status: 'in_progress' })
    };
    
    console.log('Complaint Statistics:');
    console.log(`- Total: ${stats.total}`);
    console.log(`- Resolved: ${stats.resolved}`);
    console.log(`- Pending: ${stats.pending}`);
    console.log(`- In Progress: ${stats.inProgress}`);
    
    console.log('\n=== ADMIN FLOW DEMONSTRATION COMPLETED ===');
    console.log('The complaint management admin flow has been demonstrated successfully.');
    console.log('You can now implement the frontend to interact with these backend APIs.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

demoAdminFlow();