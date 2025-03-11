// First, install the AWS SDK for S3 (which works with R2)
// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// Configure R2 client
const r2Client = new S3Client({
  region: "auto", // R2 uses 'auto' for region
  endpoint:
    process.env.R2_ENDPOINT || "https://youraccount.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "ringtones";
const URL_EXPIRATION = 60 * 60 * 24; // 24 hours in seconds

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
   * @returns {Promise<{path: string, contentType: string}>} - The path to the processed file and its content type
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
    let contentType = "";

    if (outputFormat === "m4a") {
      codecOptions = {
        codec: "aac",
        bitrate: "256k",
        channels: 2,
        sampleRate: 44100,
      };
      contentType = "audio/mp4";
    } else if (outputFormat === "mp3") {
      codecOptions = {
        codec: "libmp3lame",
        bitrate: "256k",
        channels: 2,
      };
      contentType = "audio/mpeg";
    } else if (outputFormat === "aiff") {
      codecOptions = {
        codec: "pcm_s16be",
        channels: 2,
        sampleRate: 44100,
      };
      contentType = "audio/aiff";
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
            // Return the path and content type
            resolve({
              path: tempOutputPath,
              contentType,
            });
          } catch (err) {
            console.error(`Error after processing: ${err.message}`);
            reject(err);
          }
        })
        .on("error", async (err) => {
          console.error(`Processing error: ${err.message}`);
          // Clean up temp files
          await fs.unlink(tempOutputPath).catch(() => {});
          reject(err);
        })
        .run();
    });
  }

  /**
   * Upload a file to Cloudflare R2 storage
   * @param {string} filePath - Path to the local file
   * @param {string} contentType - MIME type of the file
   * @param {string} fileName - Name to use for the object in R2
   * @returns {Promise<string>} - The presigned URL to access the file
   */
  static async uploadToR2(filePath, contentType, fileName) {
    try {
      const fileData = await fs.readFile(filePath);

      const key = `ringtones/${fileName}`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileData,
        ContentType: contentType,
      });

      const response = await r2Client.send(command);
      console.log("Upload successful:", response);

      // Create a presigned URL for temporary access
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(r2Client, getCommand, {
        expiresIn: URL_EXPIRATION,
      });

      // Clean up the local file
      await fs.unlink(filePath).catch((err) => {
        console.error(`Error removing temporary file: ${err.message}`);
      });

      return presignedUrl;
    } catch (error) {
      console.error(`Error uploading to R2: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process an audio file from a URL, upload to R2, and return a temporary URL
   * @param {string} audioUrl - URL of the audio file
   * @param {object} options - Processing options
   * @returns {Promise<{url: string, contentType: string}>} - The temporary URL and content type
   */
  static async processAudioAndUploadToR2(audioUrl, options = {}) {
    const {
      startTime = 0,
      duration = 30,
      format = "m4a",
      contactName = "",
    } = options;

    try {
      // Download the file to a temporary location
      const downloadedPath = await this.downloadFile(audioUrl);

      // Process the file
      const processed = await this.processAudio(
        downloadedPath,
        format,
        startTime,
        duration
      );

      // Clean up the downloaded file
      await fs.unlink(downloadedPath).catch(() => {});

      // Generate a unique filename
      const safeContactName = contactName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 20);
      const fileName = `ringtone_${safeContactName}_${Date.now()}.${format}`;

      // Upload to R2 and get a presigned URL
      const presignedUrl = await this.uploadToR2(
        processed.path,
        processed.contentType,
        fileName
      );

      return {
        url: presignedUrl,
        contentType: processed.contentType,
      };
    } catch (error) {
      console.error(`Error in processAudioAndUploadToR2: ${error.message}`);
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
