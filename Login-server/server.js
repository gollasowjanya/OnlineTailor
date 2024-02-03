const express = require('express');
const connectDB = require('./config/db');
const verificationRoutes = require('./api/verification');
const GalleryItem = require('./models/GalleryItem');
const cors = require("cors");

// Connect to the database
connectDB();

// Create an Express application
const app = express();

// Apply CORS middleware
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// Parse JSON bodies
app.use(express.json());

// Define routes
const UserRouter = require('./api/User');
app.use('/user', UserRouter);
app.use('/verify', verificationRoutes);


app.get('/gallery', async (req, res) => {
  try {
    // Fetch all gallery items from the database
    const galleryItems = await GalleryItem.find();

    // Send the fetched data as a response
    res.json(galleryItems);
  } catch (error) {
    // Handle errors
    console.error('Error fetching gallery items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Define the port
const port = process.env.PORT || 7000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
