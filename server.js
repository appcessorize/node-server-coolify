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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

const openaiApiKey = process.env.OPENAI_API_KEY;
const sunoApiKey = process.env.SUNO_API_KEY;
const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2].filter(Boolean);
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

function validateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No API key provided" });
  }

  const apiKey = authHeader.split("Bearer ")[1];

  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}

// Input validation
function validatePrompt(prompt) {
  if (typeof prompt !== "string") {
    throw new Error("Prompt must be a string");
  }
  if (prompt.length > 500) {
    throw new Error("Prompt must be 500 characters or less");
  }
  return prompt.trim();
}

// Improved OpenAI lyrics generation with retry logic
async function generateLyrics(prompt, maxRetries = 3) {
  console.log("Generating lyrics with OpenAI...");
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Generate happy and fun song lyrics for a 30 second ringtone based on the following prompt. The song should be around 30 seconds long. It should be a fun ringtone about the person calling",
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
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to generate lyrics after ${maxRetries} attempts: ${lastError.message}`
  );
}

async function convertToGarageBandAIFF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to probe input file: ${err.message}`));
      }

      const command = ffmpeg(inputPath)
        .setStartTime(3)
        .setDuration(28)
        .outputOptions([
          "-f aiff",
          "-acodec pcm_s16be",
          "-ar 44100",
          "-ac 2",
          "-map_metadata -1",
          "-write_id3v2 0",
          "-rf64 auto",
        ])
        .output(outputPath);

      let lastProgress = 0;
      command.on("progress", (progress) => {
        if (progress.percent && progress.percent - lastProgress >= 5) {
          console.log(`Converting: ${Math.round(progress.percent)}% done`);
          lastProgress = progress.percent;
        }
      });

      command
        .on("end", async () => {
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

async function generateMusic(lyrics, maxRetries = 3) {
  console.log("Generating music with Suno...");
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${SUNO_BASE_URL}/generate/music`,
        {
          title: "Ringtone",
          tags: "generated,ai,fun,ringtone,nointro",
          prompt:
            "[Make a ringtone with no intro, go straight into the lyrics][no intro]" +
            lyrics,
          mv: "chirp-v3-5",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": sunoApiKey,
          },
          timeout: 30000,
        }
      );

      const songIds = response.data.data.map((song) => song.song_id);
      console.log("Generated song IDs:", songIds);
      return songIds;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to generate music after ${maxRetries} attempts: ${lastError.message}`
  );
}

async function pollStatus(songIds, maxAttempts = 20, interval = 15000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Status check attempt ${attempt + 1}/${maxAttempts}`);
    try {
      const response = await axios.get(`${SUNO_BASE_URL}/query`, {
        params: { ids: songIds.join(",") },
        headers: {
          "Content-Type": "application/json",
          "api-key": sunoApiKey,
        },
      });

      const allComplete = response.data.every(
        (result) => result.status === "complete"
      );
      const audioUrl = response.data.find(
        (result) => result.status === "complete"
      )?.audio_url;

      if (allComplete && audioUrl) {
        console.log("Music generation complete!");
        return audioUrl;
      }

      if (attempt < maxAttempts - 1) {
        console.log(`Waiting ${interval / 1000} seconds before next check...`);
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    } catch (error) {
      console.error(`Poll attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
  }

  throw new Error("Timeout: Music generation incomplete");
}

async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 30000,
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

app.post("/generate-music-url", validateApiKey, async (req, res) => {
  console.log("Starting the generate-music-url workflow...");
  try {
    const { prompt } = req.body;
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    const validatedPrompt = validatePrompt(prompt);

    // Generate lyrics using existing function
    const lyrics = await generateLyrics(validatedPrompt);

    // Generate music using existing function
    const songIds = await generateMusic(lyrics);

    // Return URL immediately using the first song ID
    const audioUrl = `https://cdn1.suno.ai/${songIds[0]}.mp3`;
    res.json({ url: audioUrl });
  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({
      error: "Processing failed",
      message: error.message,
    });
  }
});

app.post("/generate-and-process", validateApiKey, async (req, res) => {
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

    const lyrics = await generateLyrics(validatedPrompt);
    const songIds = await generateMusic(lyrics);
    const audioUrl = await pollStatus(songIds);

    await downloadFile(audioUrl, tempInputPath);
    await convertToGarageBandAIFF(tempInputPath, tempAiffPath);

    const stats = await fs.stat(tempAiffPath);
    if (stats.size === 0) {
      throw new Error("Generated AIFF file is empty");
    }

    res.setHeader("Content-Type", "audio/x-aiff");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ringtone.aiff"'
    );

    const fileStream = fs.createReadStream(tempAiffPath);
    fileStream.pipe(res);

    fileStream.on("end", async () => {
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

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Performing graceful shutdown...");
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });
});

module.exports = app;
