// db.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas!");
    console.log("🔧 Database ready for VIP wallet collection");
  })
  .catch((err) => {
    console.error("❌ MongoDB Atlas connection error:", err);
    process.exit(1);
  });

module.exports = mongoose;
