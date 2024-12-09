// require("dotenv").config({ path: ".env.local" });

const express = require("express");
const multer = require("multer");

const cors = require("cors");

const axios = require("axios");
const FormData = require("form-data");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/outputs", express.static("outputs")); // Serve the outputs directory statically

const upload = multer({ dest: "uploads/" });

// Load API keys from environment variables

const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2];

// Healthcheck Endpoint
app.get("/health", (req, res) => {
  if (!checkEnvVariables()) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
  res.status(200).send("OK");
});

// Test Endpoint
app.get("/", (req, res) => {
  console.log("Test endpoint hit");
  res.send(
    "Server is running. updated! shorter timeout.checkstatus updated.tags/no intro/new"
  );
});

// Implement Input validation
function validatePrompt(prompt) {
  if (typeof prompt !== "string") {
    throw new Error("Prompt must be a string");
  }
  if (prompt.length > 500) {
    throw new Error("Prompt must be 500 characters or less");
  }
  return prompt.trim();
}

// API key middleware
function apiKeyAuth(req, res, next) {
  const apiKey = req.header("X-API-Key");
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ message: "Unauthenticated" });
  }
  next();
}

// Apply API key middleware to all routes except / and /healthcheck
app.use((req, res, next) => {
  if (req.path === "/" || req.path === "/health") {
    return next();
  }
  return apiKeyAuth(req, res, next);
});

// Function to generate lyrics using OpenAI

// Function to generate music using Suno

// Add FoxAI music generation function
async function generateFoxAIMusic(prompt, genre = ["pop"]) {
  console.log("Generating music with FoxAI...");
  console.log("Selected genre:", genre); // Log the genre
  try {
    const response = await axios.post(
      "https://api.foxai.me/api/v1/music/generate",
      {
        model: "foxai-v1",
        tags: ["ringtone", "no intro", ...genre],
        // tags: ["dance", "house"],
        // lyrics: lyrics,
        description: `A fun ringtone about${prompt}`,
      },
      {
        headers: {
          "api-key": process.env.FOXAI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("FoxAI Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error generating music:", error);
    throw error;
  }
}

// Add FoxAI status checking function
async function checkFoxAIStatus(songs) {
  try {
    const songIds = songs.map((song) => song.id);
    const response = await axios.get(
      `https://api.foxai.me/api/v1/music/query?ids=${songIds.join(",")}`,
      {
        headers: {
          "api-key": process.env.FOXAI_API_KEY,
        },
      }
    );

    const results = response.data;
    let allComplete = true;
    let songData = null;
    let currentStatus = "queued";

    for (const result of results) {
      console.log("Song ID:", result.id);
      console.log("Status:", result.status);

      if (result.status === "success") {
        songData = {
          audio_url: result.audio_url,
          image_url: result.image_url,
          video_url: result.video_url,
          title: result.title,
          metadata: result.metadata,
          duration: result.duration,
          created_at: result.created_at,
        };
        currentStatus = "success";
      } else if (result.err_msg) {
        console.log("Error:", result.err_msg);
        allComplete = false;
        currentStatus = "error";
      } else {
        allComplete = false;
      }
    }

    return {
      allComplete,
      songData,
      status: currentStatus,
    };
  } catch (error) {
    console.error("Error checking status:", error);
    return {
      allComplete: false,
      songData: null,
      status: "error",
    };
  }
}

// Add new endpoint for FoxAI generation
app.post("/generate-foxai-url", async (req, res) => {
  console.log("Starting the FoxAI generate-url workflow...");
  try {
    const { prompt, genre = "pop" } = req.body;
    console.log("Received request with prompt:", prompt);
    console.log("Received genre:", genre);

    const validatedPrompt = validatePrompt(prompt);
    
    // Get genre description or default to pop
    const genreDetails = genrePrompts[genre.toLowerCase()] || genrePrompts.pop;
    console.log("Using genre description:", genreDetails.description);

    // Generate music with FoxAI using the genre-specific description
    const songs = await generateFoxAIMusic(
        validatedPrompt, 
        genreDetails.description
    );

    // Wait for first available URL
    console.log("Waiting for generation to complete...");
    let songData = null;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts && !songData) {
      const {
        allComplete,
        songData: data,
        status,
      } = await checkFoxAIStatus(songs);

      if (data) {
        songData = data;
        break;
      }

      attempts++;
      if (attempts < maxAttempts) {
        console.log("Waiting 5 seconds before next check...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!songData) {
      throw new Error("Timeout: Music generation incomplete");
    }

    // Return the complete song data to the client
    console.log("Returning song data to client...");
    res.json({
      audio_url: songData.audio_url,
      image_url: songData.image_url,
      video_url: songData.video_url,
      title: songData.title,
      metadata: songData.metadata,
      duration: songData.duration,
      created_at: songData.created_at,
    });
  } catch (error) {
    console.error("Error during processing:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "An error occurred during processing.",
        message: error.message,
      });
    }
  }
});
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`You can access the server at http://localhost:${PORT}`);
  // console.log(
  //   'If deployed, replace "localhost" with your server\'s IP or domain'
  // );

  // Log the actual port the server is listening on
  const address = server.address();
  console.log(`Server is listening on port: ${address.port}`);

  console.log("Routes registered:");
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(r.route.path);
    }
  });
  console.log("Environment variables loaded:");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log(
      `Port ${PORT} is already in use. Please choose a different port!`
    );
  } else {
    console.log("An error occurred:", e);
  }
});
