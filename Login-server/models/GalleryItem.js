const mongoose = require('mongoose');

// Define the schema for the GalleryItem collection
const galleryItemSchema = new mongoose.Schema({
    imgSrc: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    price: {
        type: String,
        required: true
    }
});

// Create the GalleryItem model using the schema
const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema);

module.exports = GalleryItem;
