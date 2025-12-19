const mongoose = require('mongoose');

// Define the blueprint for an Incident
const incidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // This field must be present
    trim: true      // Removes whitespace from ends
  },
  details: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
    required: false // Optional field
  },
  imageUrl: {
    type: String,
    required: true // We need the path to the image
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'], // Only these values are allowed
    default: 'Pending' // When a user submits, it starts as Pending automatically
  },
  adminNotes: {
    type: String, // For the administrator to write internal comments
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically captures the exact time of submission
  }
});

// Create the model
const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;