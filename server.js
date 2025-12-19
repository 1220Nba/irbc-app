const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// Import the Schema created previously
// Ensure Incident.js is in a 'models' subfolder
const Incident = require('./models/Incident');

// Initialize Express App
const app = express();
const PORT = 5000; // The port our backend will run on

// --- MIDDLEWARE ---
// Allow cross-origin requests (so your browser can send data to this server)
app.use(cors());
// Parse JSON data coming from forms
app.use(express.json());
// IMPORTANT: Make the 'uploads' folder accessible publicly over the web
// This allows the Admin panel to eventually view the images via URL like http://localhost:5000/uploads/image.jpg
app.use('/uploads', express.static('uploads'));


// --- MONGODB CONNECTION ---
// Replace with your actual connection string if using MongoDB Atlas cloud
const MONGODB_URI = 'mongodb+srv://<db_username>:<db_password>@cluster0-irbc-app.jjhposi.mongodb.net/?appName=Cluster0-irbc-app'; 

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));


// --- MULTER CONFIGURATION (Image Upload Engine) ---
// Define where to store files and what to name them
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to the 'uploads' folder sitting next to server.js
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent overwriting.
    // e.g., "incident-167899999-myimage.jpg"
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize upload middleware
// We add a simple filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Only JPEG and PNG image files are allowed!'), false); // Reject file
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Limit size to 5MB
    fileFilter: fileFilter
});


// --- ROUTES (API Endpoints) ---

// Test route to check if server is running
app.get('/', (req, res) => {
  res.send('IRBC Backend API is running...');
});

/**
 * POST route to submit a new incident
 * 'upload.single('incidentImage')' middleware intercepts the request,
 * saves the file, and adds 'req.file' to the request object.
 * NOTE: 'incidentImage' MUST match the 'name' attribute of the file input in your HTML form.
 */
app.post('/api/incidents', upload.single('incidentImage'), async (req, res) => {
  try {
    console.log('Received submission request...');
    
    // Check if an image was actually uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Error: Image upload is required.' });
    }

    // 1. Create a new Incident object using data from the form body (text) and req.file (image info)
    const newIncident = new Incident({
      title: req.body.title,
      details: req.body.details,
      address: req.body.address,
      landmark: req.body.landmark,
      // We construct the public URL path to the image
      imageUrl: '/uploads/' + req.file.filename
    });

    // 2. Save data to MongoDB
    const savedData = await newIncident.save();
    console.log('✅ Incident saved:', savedData._id);

    // 3. Send success response back to frontend
    res.status(201).json({
      message: 'Incident submitted successfully to Municipal Authority!',
      incidentId: savedData._id
    });

  } catch (error) {
    console.error('❌ Error saving incident:', error);
    // Send error response (e.g., validation failed, database down)
    res.status(500).json({ 
        message: 'Server error occurred while submitting.',
        error: error.message 
    });
  }
});

// ... existing app.post code ...

/**
 * GET route to retrieve ALL incidents
 * Sorted by newest first (-1)
 */
app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
});

/**
 * PATCH route to update the status of a specific incident
 * Example: Mark as "Resolved"
 */
app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // Expecting JSON like { "status": "Resolved" }
    
    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true } // Return the updated document
    );

    if (!updatedIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json(updatedIncident);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

// ... existing app.listen code ...

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});