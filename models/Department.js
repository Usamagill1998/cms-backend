const mongoose = require('mongoose');
const config = require('../config/config');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a department name'],
    trim: true,
    maxlength: [100, 'Department name cannot be more than 100 characters']
  },
  nameUrdu: {
    type: String,
    trim: true,
    maxlength: [100, 'Urdu name cannot be more than 100 characters']
  },
  type: {
    type: String,
    enum: Object.values(config.departmentTypes),
    default: config.departmentTypes.HOUSING
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  descriptionUrdu: {
    type: String,
    maxlength: [500, 'Urdu description cannot be more than 500 characters']
  },
  contactEmail: {
    type: String,
    match: [
      /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
      'Please add a valid email'
    ]
  },
  contactPhone: {
    type: String,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  address: {
    type: String,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: 'default-icon.svg'
  },
  color: {
    type: String,
    default: '#00ACED' // Default color
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updatedAt field
DepartmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Department', DepartmentSchema);