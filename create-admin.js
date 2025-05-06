const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/complaint-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  try {
    // Delete existing admin user if any
    await User.deleteOne({ email: 'admin@example.com' });
    
    // Create a new admin user with plain text password
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'admin123', // Plain text password
      role: 'admin',
      isActive: true
    });
    
    console.log('Admin user created with plain text password:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})
.catch(err => {
  console.error('MongoDB Connection Error:', err);
});