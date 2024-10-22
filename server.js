const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Added size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Environment variables configuration
const openaiApiKey = process.env.OPENAI_API_KEY;
const sunoApiKey = process.env.SUNO_API_KEY;
const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2].filter(Boolean); // Filter out undefined keys
const SUNO_BASE_URL = "https://api.sunoaiapi.com/api/v1/gateway";

const requiredEnvVars = [
  "OPENAI_API_KEY",
  "SUNO_API_KEY",
  "API_KEY_1",
  "API_KEY_2",
];

function checkEnvVariables() {
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingVars.length > 0) {
    console.error("Missing environment variables:", missingVars);
    return false;
  }
  return true;
}

if (!checkEnvVariables()) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });

// Enhanced audio conversion function with GarageBand-specific settings
async function convertToGarageBandAIFF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to probe input file: ${err.message}`));
      }

      // Create the FFmpeg command with specific GarageBand settings
      const command = ffmpeg(inputPath)
        .setStartTime(3)
        .setDuration(28)
        .outputOptions([
          "-f aiff", // Force AIFF format
          "-acodec pcm_s16be", // 16-bit PCM big-endian (GarageBand requirement)
          "-ar 44100", // 44.1kHz sample rate (GarageBand requirement)
          "-ac 2", // Stereo (GarageBand requirement)
          "-map_metadata -1", // Strip metadata
          "-write_id3v2 0", // No ID3 tags
          "-rf64 auto", // Support for large files
        ])
        .output(outputPath);

      // Add progress monitoring
      let lastProgress = 0;
      command.on("progress", (progress) => {
        if (progress.percent && progress.percent - lastProgress >= 5) {
          console.log(`Converting: ${Math.round(progress.percent)}% done`);
          lastProgress = progress.percent;
        }
      });

      // Handle completion
      command
        .on("end", async () => {
          // Verify the output file
          try {
            await verifyAiffFile(outputPath);
            console.log("FFmpeg conversion completed and verified");
            resolve();
          } catch (verifyError) {
            reject(new Error(`Verification failed: ${verifyError.message}`));
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg conversion error:", err);
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .run();
    });
  });
}

// New function to verify AIFF file
async function verifyAiffFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to probe AIFF file: ${err.message}`));
      }

      const audio = metadata.streams.find((s) => s.codec_type === "audio");
      if (!audio) {
        return reject(new Error("No audio stream found in output file"));
      }

      // Verify GarageBand requirements
      const issues = [];
      if (audio.sample_rate !== 44100) {
        issues.push(
          `Invalid sample rate: ${audio.sample_rate}Hz (expected 44100Hz)`
        );
      }
      if (audio.channels !== 2) {
        issues.push(`Invalid channel count: ${audio.channels} (expected 2)`);
      }
      if (audio.bits_per_sample !== 16) {
        issues.push(
          `Invalid bit depth: ${audio.bits_per_sample} (expected 16)`
        );
      }

      if (issues.length > 0) {
        return reject(
          new Error(`AIFF verification failed: ${issues.join(", ")}`)
        );
      }

      resolve();
    });
  });
}

// Enhanced music generation with retries
async function generateMusic(lyrics, maxRetries = 3) {
  console.log("Generating music with Suno...");
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${SUNO_BASE_URL}/generate/music`,
        {
          title: "ringtone",
          tags: "generated,ai,fun,ringtone,nointro",
          prompt:
            "[Make a song with no intro, go straight into the lyrics]" + lyrics,
          mv: "chirp-v3-5",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": sunoApiKey,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const songIds = response.data.data.map((song) => song.song_id);
      console.log("Generated song IDs:", songIds);
      return songIds;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to generate music after ${maxRetries} attempts: ${lastError.message}`
  );
}

// The rest of your code remains the same, but with these important updates:

// Update your main route handler to include proper cleanup and error handling
app.post("/generate-and-process", async (req, res) => {
  console.log("Starting the generate-and-process workflow...");
  const tempFiles = [];

  try {
    const { prompt } = req.body;
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    const validatedPrompt = validatePrompt(prompt);

    const outputDir = path.join(__dirname, "temp_outputs");
    await fs.ensureDir(outputDir);

    const tempInputPath = path.join(outputDir, `temp_input_${Date.now()}.mp3`);
    const tempAiffPath = path.join(outputDir, `ringtone_${Date.now()}.aiff`);
    tempFiles.push(tempInputPath, tempAiffPath);

    // Your existing generation code...
    const lyrics = await generateLyrics(validatedPrompt);
    const songIds = await generateMusic(lyrics);
    const audioUrl = await pollStatus(songIds);

    await downloadFile(audioUrl, tempInputPath);
    await convertToGarageBandAIFF(tempInputPath, tempAiffPath);

    // Verify file size
    const stats = await fs.stat(tempAiffPath);
    if (stats.size === 0) {
      throw new Error("Generated AIFF file is empty");
    }

    // Set appropriate headers
    res.setHeader("Content-Type", "audio/x-aiff");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ringtone.aiff"'
    );

    // Stream the file instead of loading it into memory
    const fileStream = fs.createReadStream(tempAiffPath);
    fileStream.pipe(res);

    fileStream.on("end", async () => {
      // Cleanup after successful streaming
      await cleanup(tempFiles);
    });

    fileStream.on("error", async (err) => {
      console.error("Error streaming file:", err);
      await cleanup(tempFiles);
      if (!res.headersSent) {
        res.status(500).send("Error sending file");
      }
    });
  } catch (error) {
    console.error("Processing error:", error);
    await cleanup(tempFiles);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Processing failed",
        details: error.message,
      });
    }
  }
});

// Helper function for cleanup
async function cleanup(files) {
  for (const file of files) {
    try {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
        console.log(`Cleaned up: ${file}`);
      }
    } catch (err) {
      console.error(`Error cleaning up ${file}:`, err);
    }
  }
}

// Server initialization with proper error handling
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment check: ${checkEnvVariables() ? "OK" : "Failed"}`);
});

server.on("error", (e) => {
  console.error("Server error:", e);
  if (e.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please choose a different port!`
    );
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Performing graceful shutdown...");
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });
});

module.exports = app;
