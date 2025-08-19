// Test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB connection...');
console.log('📝 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connection successful!");
    
    // Test creating a simple document
    const VipSupporter = require('./models/VipSupporter');
    console.log("📋 VipSupporter model loaded successfully");
    
    mongoose.connection.close();
    console.log("🔒 Connection closed");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });