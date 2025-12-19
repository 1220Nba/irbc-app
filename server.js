require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Import the Incident Model
const Incident = require('./models/Incident');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CONFIGURATION ---

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary Config (Get these from your .env file)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage Engine (Connects Uploads to Cloudinary)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'civic-app-uploads',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });


// --- 2. AUTHENTICATION MIDDLEWARE ---

// Protects admin routes. Checks if the request header matches the password in .env
const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (authHeader === process.env.ADMIN_PASSWORD) {
        next(); // Password matches, proceed
    } else {
        res.status(403).json({ message: 'Unauthorized: Invalid Password' });
    }
};


// --- 3. DATABASE CONNECTION ---

// Uses the connection string from .env (or falls back to local for testing)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/irbc_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));


// --- 4. API ROUTES ---

// Test Route
app.get('/', (req, res) => {
    res.send('IRBC Backend is Running...');
});

/**
 * PUBLIC ROUTE: Submit a new incident
 * - Uploads image to Cloudinary
 * - Saves text data to MongoDB
 */
app.post('/api/incidents', upload.single('incidentImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Error: Image upload is required.' });
        }

        const newIncident = new Incident({
            title: req.body.title,
            details: req.body.details,
            address: req.body.address,
            landmark: req.body.landmark,
            imageUrl: req.file.path // Cloudinary URL is stored in 'path'
        });

        const savedData = await newIncident.save();
        res.status(201).json({ 
            message: 'Incident submitted successfully!', 
            incidentId: savedData._id 
        });

    } catch (error) {
        console.error('❌ Error saving incident:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * PROTECTED ROUTE: Get all incidents
 * - Requires Admin Password
 */
app.get('/api/incidents', requireAuth, async (req, res) => {
    try {
        const incidents = await Incident.find().sort({ createdAt: -1 });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching incidents', error: error.message });
    }
});

/**
 * PROTECTED ROUTE: Update status
 * - Requires Admin Password
 */
app.patch('/api/incidents/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedIncident = await Incident.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        if (!updatedIncident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        res.json(updatedIncident);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
});


// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});