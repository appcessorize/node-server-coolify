const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

class AudioProcessor {
  /**
   * Downloads a file from a URL to a temporary local path
   * @param {string} url - The URL of the file to download
   * @returns {Promise<string>} - The path to the downloaded file
   */
  static async downloadFile(url) {
    // Create a unique temporary filename
    const tempDir = path.join(__dirname, "temp_files");
    await fs.ensureDir(tempDir);

    const tempFile = path.join(
      tempDir,
      `download-${uuidv4()}${path.extname(url) || ".ogg"}`
    );
    console.log(`Downloading file from ${url} to ${tempFile}`);

    try {
      const writer = fs.createWriteStream(tempFile);
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          console.log(`Download completed: ${tempFile}`);
          resolve(tempFile);
        });
        writer.on("error", (err) => {
          console.error(`Download error: ${err.message}`);
          fs.unlink(tempFile).catch(() => {}); // Remove file if download failed
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Error downloading file: ${error.message}`);
      fs.unlink(tempFile).catch(() => {}); // Remove file if download failed
      throw error;
    }
  }

  /**
   * Trims and converts an audio file in one operation
   * @param {string} inputPath - Path to the input audio file
   * @param {string} outputFormat - Desired output format (m4a, mp3, etc.)
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @returns {Promise<Buffer>} - The processed audio as a buffer
   */
  static async processAudio(
    inputPath,
    outputFormat = "m4a",
    startTime = 0,
    duration = 30
  ) {
    console.log(
      `Processing audio from ${startTime}s for ${duration}s to ${outputFormat} format`
    );

    // Prepare codec and options based on format
    let codecOptions = {};

    if (outputFormat === "m4a") {
      codecOptions = {
        codec: "aac",
        bitrate: "256k",
        channels: 2,
        sampleRate: 44100,
      };
    } else if (outputFormat === "mp3") {
      codecOptions = {
        codec: "libmp3lame",
        bitrate: "256k",
        channels: 2,
      };
    } else if (outputFormat === "aiff") {
      codecOptions = {
        codec: "pcm_s16be",
        channels: 2,
        sampleRate: 44100,
      };
    }

    // Create a temporary output file
    const tempDir = path.join(__dirname, "temp_files");
    await fs.ensureDir(tempDir);
    const tempOutputPath = path.join(
      tempDir,
      `processed-${uuidv4()}.${outputFormat}`
    );

    return new Promise((resolve, reject) => {
      // Process the audio file
      const command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioCodec(codecOptions.codec)
        .audioBitrate(codecOptions.bitrate)
        .audioChannels(codecOptions.channels);

      if (codecOptions.sampleRate) {
        command.audioFrequency(codecOptions.sampleRate);
      }

      command
        .output(tempOutputPath)
        .on("start", (commandLine) => {
          console.log(`Processing started: ${commandLine}`);
        })
        .on("progress", (progress) => {
          console.log(`Processing progress: ${Math.floor(progress.percent)}%`);
        })
        .on("end", async () => {
          console.log(`Processing completed: ${tempOutputPath}`);
          try {
            // Read the file as a buffer
            const buffer = await fs.readFile(tempOutputPath);
            // Clean up
            await fs.unlink(tempOutputPath).catch(() => {});
            await fs.unlink(inputPath).catch(() => {});
            resolve(buffer);
          } catch (err) {
            console.error(`Error reading processed file: ${err.message}`);
            reject(err);
          }
        })
        .on("error", async (err) => {
          console.error(`Processing error: ${err.message}`);
          // Clean up temp files
          await fs.unlink(tempOutputPath).catch(() => {});
          await fs.unlink(inputPath).catch(() => {});
          reject(err);
        })
        .run();
    });
  }

  /**
   * Process an audio file from a URL and return the processed data as a buffer
   * @param {string} audioUrl - URL of the audio file
   * @param {object} options - Processing options
   * @returns {Promise<{buffer: Buffer, contentType: string}>} - The processed audio buffer and content type
   */
  static async processAudioFromUrlToBuffer(audioUrl, options = {}) {
    const { startTime = 0, duration = 30, format = "m4a" } = options;

    try {
      // Get content type based on format
      const contentType =
        format === "m4a"
          ? "audio/mp4"
          : format === "mp3"
          ? "audio/mpeg"
          : format === "aiff"
          ? "audio/aiff"
          : "application/octet-stream";

      // Download the file to a temporary location
      const downloadedPath = await this.downloadFile(audioUrl);

      // Process the file
      const audioBuffer = await this.processAudio(
        downloadedPath,
        format,
        startTime,
        duration
      );

      return {
        buffer: audioBuffer,
        contentType,
      };
    } catch (error) {
      console.error(`Error processing audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up any temporary files in the temp_files directory
   * over a specified age (in milliseconds)
   */
  static async cleanupTempFiles(maxAge = 1800000) {
    // Default 30 minutes
    try {
      const tempDir = path.join(__dirname, "temp_files");

      // Check if directory exists
      if (!(await fs.pathExists(tempDir))) {
        return;
      }

      const now = Date.now();
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        // Remove files older than maxAge
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Removed old temp file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up temp files: ${error.message}`);
    }
  }
}

module.exports = AudioProcessor;
