const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const router = express.Router();

require('dotenv').config();

const rateLimit = require('express-rate-limit'); // Added for rate limiting

const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 1. Define allowed MIME types and forbidden extensions
const allowedMime = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska"
];
const forbiddenExt = [".exe", ".php", ".js", ".bat", ".sh", ".py"];

// 2. Multer: limit file size, check type
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error("File type not allowed (images/videos only)"));
    }
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (forbiddenExt.includes(ext)) {
      return cb(new Error("File extension not allowed"));
    }
    cb(null, true);
  }
});

// =========== RATE LIMITER ===========
// Limit: 3 uploads (or AI generations) per minute per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { error: "Too many uploads, try again in a minute." }
});
// =====================================

// ==== SECURE FILE UPLOAD ====
router.post("/upload", uploadLimiter, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // File OK, upload to Cloudflare
    const formData = new FormData();
    // Name the file with a timestamp to avoid injection
    const safeName = Date.now() + "-" + (req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_"));
    formData.append("file", req.file.buffer, safeName);

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    if (response.data && response.data.success) {
      const imageUrl = response.data.result.variants[0];
      return res.json({ imageUrl });
    } else {
      return res.status(500).json({ error: "Cloudflare upload failed", details: response.data });
    }
  } catch (err) {
    res.status(400).json({ error: err.message || "Upload error" });
  }
});

// ==== GENERATE AI IMAGE + UPLOAD TO CLOUDFLARE ====
router.post("/generate-ai", uploadLimiter, express.json(), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });
    if (typeof prompt !== "string" || prompt.length > 250) {
      return res.status(400).json({ error: "Prompt too long or invalid" });
    }

    // Generate the image with OpenAI (size 1024x1024)
    const dalleRes = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const openaiUrl = dalleRes.data.data[0].url;

    // Direct upload via URL to Cloudflare
    const formData = new FormData();
    formData.append("url", openaiUrl);

    const cfRes = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    if (cfRes.data && cfRes.data.success) {
      const cfImageUrl = cfRes.data.result.variants[0];
      return res.json({ imageUrl: cfImageUrl });
    } else {
      return res.status(500).json({ error: "Cloudflare upload failed", details: cfRes.data });
    }
  } catch (err) {
    res.status(500).json({ error: "AI generation/upload failed", details: err.message });
  }
});

module.exports = router;
