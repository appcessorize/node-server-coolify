const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const archiver = require("archiver");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Load API keys from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const sunoApiKey = process.env.SUNO_API_KEY;
const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2];

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
  return missingVars.length === 0;
}

if (!checkEnvVariables()) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const SUNO_BASE_URL = "https://api.sunoaiapi.com/api/v1/gateway";

// Healthcheck Endpoint
app.get("/healthcheck", (req, res) => {
  if (!checkEnvVariables()) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
  res.status(200).send("OK");
});

// Test Endpoint
app.get("/", (req, res) => {
  console.log("Test endpoint hit");
  res.send("Server is running");
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
  if (req.path === "/" || req.path === "/healthcheck") {
    return next();
  }
  return apiKeyAuth(req, res, next);
});

// Function to generate lyrics using OpenAI
async function generateLyrics(prompt) {
  console.log("Generating lyrics with OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate song lyrics based on the following prompt. The song should be around 30 seconds long. It should be a ringtone about the person calling",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("OpenAI Response:", JSON.stringify(response, null, 2));
    const lyrics = response.choices[0].message.content;
    console.log("Generated Lyrics:", lyrics);
    return lyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}

// Function to generate music using Suno
async function generateMusic(lyrics) {
  console.log("Generating music with Suno...");
  try {
    const response = await axios.post(
      `${SUNO_BASE_URL}/generate/music`,
      {
        title: "ringtone",
        tags: "generated, ai",
        prompt:
          "Make a song with no intro, go straight into the lyrics. " + lyrics,
        mv: "chirp-v3-5",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": sunoApiKey,
        },
      }
    );

    const songIds = response.data.data.map((song) => song.song_id);
    console.log("Generated song IDs:", songIds);
    return songIds;
  } catch (error) {
    console.error("Error generating music:", error);
    throw error;
  }
}

// Function to check the status of generated songs
async function checkStatus(songIds) {
  try {
    const response = await axios.get(`${SUNO_BASE_URL}/query`, {
      params: { ids: songIds.join(",") },
      headers: {
        "Content-Type": "application/json",
        "api-key": sunoApiKey,
      },
    });

    const results = response.data;
    let allComplete = true;
    let audioUrl = null;

    results.forEach((result) => {
      console.log("Song ID:", result.id);
      console.log("Status:", result.status);
      if (result.status === "complete") {
        console.log("Audio URL:", result.audio_url);
        audioUrl = result.audio_url;
      } else if (result.status === "error") {
        console.log("Error:", result.meta_data.error_message);
        allComplete = false;
      } else {
        allComplete = false;
      }
      console.log("---");
    });

    return { allComplete, audioUrl };
  } catch (error) {
    console.error("Error checking status:", error);
    return { allComplete: false, audioUrl: null };
  }
}

// Function to poll status until complete or max attempts reached
async function pollStatus(songIds) {
  const interval = 15000; // 15 seconds
  const maxAttempts = 20;
  let attempts = 0;

  while (attempts < maxAttempts) {
    console.log(`Attempt ${attempts + 1} to check status...`);
    const { allComplete, audioUrl } = await checkStatus(songIds);

    if (allComplete && audioUrl) {
      console.log("All songs are complete!");
      return audioUrl;
    }

    attempts++;
    if (attempts < maxAttempts) {
      console.log(`Waiting ${interval / 1000} seconds before next check...`);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  console.log("Max attempts reached. Some songs may not be complete.");
  throw new Error("Timeout: Music generation incomplete");
}

// Function to download audio file
async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Function to replace file in .band package
async function replaceFileInBand(bandFilePath, newFilePath, targetPath) {
  console.log(`Replacing file in .band package...`);
  console.log(`Source: ${newFilePath}`);
  console.log(`Destination: ${targetPath}`);
  await fs.ensureDir(path.dirname(targetPath));
  await fs.copy(newFilePath, targetPath, { overwrite: true });
  console.log(`File replaced successfully in .band package`);
}

// Main route for processing
app.post("/generate-and-process", async (req, res) => {
  console.log("Starting the generate-and-process workflow...");
  let tempInputPath, outputPath;
  try {
    const { prompt } = req.body;
    const validatedPrompt = validatePrompt(prompt);

    const outputDir = path.join(__dirname, "temp_outputs");
    tempInputPath = path.join(outputDir, "temp_input.mp3");
    outputPath = path.join(outputDir, "ling 2.aiff");
    const bandFilePath = path.join(__dirname, "test.band");
    const targetPath = path.join(bandFilePath, "Media", "ling 2.aiff");

    console.log("Ensuring temporary output directory exists...");
    await fs.ensureDir(outputDir);

    // Step 1: Generate lyrics with OpenAI
    console.log("Step 1: Generating lyrics...");
    const lyrics = await generateLyrics(validatedPrompt);

    // Step 2: Generate music with Suno using the lyrics
    console.log("Step 2: Generating music...");
    const songIds = await generateMusic(lyrics);

    // Wait for music generation to complete and get audio URL
    console.log("Waiting for music generation to complete...");
    const audioUrl = await pollStatus(songIds);

    // Download the generated audio file
    console.log("Downloading generated audio...");
    await downloadFile(audioUrl, tempInputPath);

    // Step 3: Convert audio to AIFF and trim
    console.log("Step 3: Converting and trimming audio...");
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(3)
        .setDuration(28)
        .output(outputPath)
        .audioCodec("pcm_s16be")
        .audioChannels(2)
        .audioFrequency(44100)
        .on("progress", (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on("end", resolve)
        .on("error", reject)
        .run();
    });
    console.log("Audio converted to AIFF, trimmed, and processed successfully");

    // Step 4: Replace file in .band package
    console.log("Step 4: Replacing file in .band package...");
    await replaceFileInBand(bandFilePath, outputPath, targetPath);

    // Zip the modified .band file
    console.log("Zipping .band package...");
    const archive = archiver("zip", { zlib: { level: 9 } });
    const zipStream = fs.createWriteStream("modified_test.band.zip");

    archive.directory(bandFilePath, false);
    archive.pipe(zipStream);

    await new Promise((resolve, reject) => {
      archive.on("error", reject);
      zipStream.on("close", resolve);
      archive.finalize();
    });

    // Send the zipped .band file to the client
    console.log("Sending zipped .band file...");
    res.download(
      "modified_test.band.zip",
      "modified_test.band.zip",
      async (err) => {
        if (err) {
          console.error("Error sending file:", err);
          if (!res.headersSent) {
            res.status(500).send("An error occurred while sending the file.");
          }
        }
        console.log("Zipped .band file sent successfully");
      }
    );
  } catch (error) {
    console.error("Error during processing:", error);
    if (!res.headersSent) {
      res.status(500).send("An error occurred during processing.");
    }
  } finally {
    // Clean up
    try {
      if (tempInputPath) await fs.remove(tempInputPath);
      if (outputPath && (await fs.pathExists(outputPath)))
        await fs.remove(outputPath);
      if (await fs.pathExists("modified_test.band.zip"))
        await fs.remove("modified_test.band.zip");
      console.log("Cleanup completed.");
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`You can access the server at http://localhost:${PORT}`);
  console.log(
    'If deployed, replace "localhost" with your server\'s IP or domain'
  );

  // Log the actual port the server is listening on
  const address = server.address();
  console.log(`Server is listening on port: ${address.port}`);

  console.log("Routes registered:");
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(r.route.path);
    }
  });
  console.log("Environment variables loaded:", {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    SUNO_API_KEY: !!process.env.SUNO_API_KEY,
    API_KEY_1: !!process.env.API_KEY_1,
    API_KEY_2: !!process.env.API_KEY_2,
  });
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log(
      `Port ${PORT} is already in use. Please choose a different port.`
    );
  } else {
    console.log("An error occurred:", e);
  }
});
