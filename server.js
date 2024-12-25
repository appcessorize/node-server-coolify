// require("dotenv").config({ path: ".env.local" });

const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const OpenAI = require("openai");
const axios = require("axios");
const FormData = require("form-data");
// const genrePrompts = require("./genrePrompts");
const app = express();
app.set("trust proxy", 1); // Trust first proxy
app.use(cors());
app.use(express.json());
app.use("/outputs", express.static("outputs")); // Serve the outputs directory statically

const upload = multer({ dest: "uploads/" });

// Load API keys from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const sunoApiKey = process.env.SUNO_API_KEY;
const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2];
const MINIMAXI_API_KEY = process.env.MINIMAXI_API_KEY;
const requiredEnvVars = [
  "OPENAI_API_KEY",
  "SUNO_API_KEY",
  "API_KEY_1",
  "API_KEY_2",
  "MINIMAXI_API_KEY",
];

const rateLimit = require("express-rate-limit");

// Create a custom limiter for the FoxAI route
const foxAILimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each IP to 100 requests per hour
  message: {
    error: "Too many requests from this IP, please try again after an hour",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const genrePrompts = {
  pop: [
    "Dua Lipa",
    "The Chainsmokers",
    "Bright",
    "Energetic",
    "Upbeat",
    "Playful",
    "Uplifting",
    "Modern",
    "Short loop",
    "Catchy",
    "Hook-driven",
    "Synthesizers",
    "Electronic Beats",
    "Chime Effects",
    "Fast",
    "120-140 BPM",
    "Crisp",
    "Clear",
    "Bright tones",
    "ringtone",
  ],
  rock: [
    "Foo Fighters",
    "Green Day",
    "Powerful",
    "Dynamic",
    "Raw",
    "Energetic",
    "Bold",
    "Intense",
    "Short loop",
    "Guitar-driven",
    "Electric Guitars",
    "Bass",
    "Drums",
    "Power Chords",
    "Medium-Fast",
    "110-130 BPM",
    "Full",
    "Distorted",
    "Rich",
    "ringtone",
  ],
  country: [
    "Luke Combs",
    "Morgan Wallen",
    "Heartfelt",
    "Traditional",
    "Warm",
    "Down-to-earth",
    "Sincere",
    "Friendly",
    "Short loop",
    "Nashville-style",
    "Melodic",
    "Acoustic Guitar",
    "Steel Guitar",
    "Fiddle",
    "Medium",
    "95-115 BPM",
    "Natural",
    "Clean",
    "ringtone",
  ],

  opera: [
    "Andrea Bocelli",
    "Sarah Brightman",
    "Dramatic",
    "Grand",
    "Emotional",
    "Powerful",
    "Majestic",
    "Passionate",
    "Short loop",
    "Orchestral",
    "Strings",
    "Orchestra",
    "Piano",
    "Variable",
    "70-90 BPM",
    "Rich",
    "Dynamic",
    "Theatrical",
    "ringtone",
  ],
  "hip-hop": [
    "Drake",
    "Metro Boomin",
    "Modern",
    "Rhythmic",
    "Bold",
    "Confident",
    "Street",
    "Cool",
    "Short loop",
    "Beat-focused",
    "Trap-influenced",
    "808s",
    "Hi-Hats",
    "Synth Bass",
    "Trap Drums",
    "Medium",
    "85-95 BPM",
    "Heavy Bass",
    "Clear Highs",
    "Punchy",
    "ringtone",
  ],
  "r&b": [
    "The Weeknd",
    "SZA",
    "Smooth",
    "Groovy",
    "Modern",
    "Sultry",
    "Emotional",
    "Cool",
    "Short loop",
    "Groove-based",
    "Melodic",
    "Electric Piano",
    "Smooth Bass",
    "Modern Drums",
    "Medium",
    "90-100 BPM",
    "Warm",
    "Rich",
    "Polished",
    "ringtone",
  ],
  jazz: [
    "Robert Glasper",
    "Kamasi Washington",
    "Sophisticated",
    "Smooth",
    "Complex",
    "Cool",
    "Relaxed",
    "Short loop",
    "Jazz-progression",
    "Melodic",
    "Piano",
    "Double Bass",
    "Jazz Drums",
    "Brass",
    "Medium",
    "120-130 BPM",
    "Warm",
    "Natural",
    "Balanced",
    "ringtone",
  ],
  christmas: [
    "Michael Bublé",
    "Mariah Carey",
    "Festive",
    "Cheerful",
    "Traditional",
    "Warm",
    "Joyful",
    "Celebratory",
    "Short loop",
    "Holiday-style",
    "Melodic",
    "Sleigh Bells",
    "Orchestra",
    "Piano",
    "Medium",
    "110-120 BPM",
    "Bright",
    "Rich",
    "Magical",
    "ringtone",
  ],

  choir: [
    "Pentatonix",
    "London Symphony Chorus",
    "Harmonious",
    "Powerful",
    "Majestic",
    "Ethereal",
    "Grand",
    "Uplifting",
    "Short loop",
    "Choral-style",
    "Vocal Harmony",
    "A Cappella",
    "Choir Voices",
    "Reverb",
    "Medium-Slow",
    "80-100 BPM",
    "Rich",
    "Full",
    "Spacious",
    "ringtone",
  ],

  kids: [
    "Disney Music",
    "Kidz Bop",
    "Playful",
    "Fun",
    "Bouncy",
    "Cheerful",
    "Energetic",
    "Light",
    "Short loop",
    "Child-friendly",
    "Simple Melody",
    "Bright Synths",
    "Fun Percussion",
    "Sound Effects",
    "Medium-Fast",
    "115-125 BPM",
    "Clear",
    "Bright",
    "Whimsical",
    "ringtone",
  ],

  swing: [
    "Michael Bublé",
    "Tony Bennett",
    "Swinging",
    "Classic",
    "Jazzy",
    "Upbeat",
    "Smooth",
    "Sophisticated",
    "Short loop",
    "Swing-rhythm",
    "Big Band",
    "Brass Section",
    "Walking Bass",
    "Jazz Drums",
    "Medium-Fast",
    "120-140 BPM",
    "Warm",
    "Rich",
    "Dynamic",
    "ringtone",
  ],
  electronic: [
    "Calvin Harris",
    "Zedd",
    "Modern",
    "Energetic",
    "Polished",
    "Uplifting",
    "Exciting",
    "Dynamic",
    "Short loop",
    "Build-up focused",
    "Drop-based",
    "Synthesizers",
    "Digital Drums",
    "Effects",
    "Fast",
    "125-135 BPM",
    "Clean",
    "Powerful",
    "Wide",
    "ringtone",
  ],
  blues: [
    "Gary Clark Jr",
    "Joe Bonamassa",
    "Soulful",
    "Raw",
    "Authentic",
    "Emotional",
    "Deep",
    "Genuine",
    "Short loop",
    "Blues-progression",
    "Guitar-focused",
    "Blues Guitar",
    "Bass",
    "Blues Harp",
    "Medium",
    "85-95 BPM",
    "Warm",
    "Dynamic",
    "ringtone",
  ],
  reggae: [
    "Chronixx",
    "Koffee",
    "Laid-back",
    "Groovy",
    "Tropical",
    "Relaxed",
    "Positive",
    "Sunny",
    "Short loop",
    "Offbeat-focused",
    "Dub-style",
    "Reggae Guitar",
    "Bass",
    "Drums",
    "Organ",
    "Medium",
    "90-100 BPM",
    "Deep Bass",
    "Spacious",
    "Warm",
    "ringtone",
  ],
  metal: [
    "Metallica",
    "Avenged Sevenfold",
    "Heavy",
    "Aggressive",
    "Intense",
    "Powerful",
    "Dark",
    "Energetic",
    "Short loop",
    "Riff-based",
    "Metal Guitars",
    "Double Bass Drums",
    "Heavy Bass",
    "Fast",
    "140-160 BPM",
    "Distorted",
    "ringtone",
  ],
  folk: [
    "Mumford & Sons",
    "The Lumineers",
    "Organic",
    "Natural",
    "Intimate",
    "Rustic",
    "Warm",
    "Authentic",
    "Short loop",
    "Folk-progression",
    "Acoustic",
    "Acoustic Guitar",
    "Banjo",
    "Folk Percussion",
    "Medium",
    "100-120 BPM",
    "Clear",
    "ringtone",
  ],
  latin: [
    "Bad Bunny",
    "J Balvin",
    "Rhythmic",
    "Tropical",
    "Vibrant",
    "Energetic",
    "Dancing",
    "Fun",
    "Short loop",
    "Latin-rhythm",
    "Dance",
    "Latin Percussion",
    "Tropical Bass",
    "Brass",
    "Medium-Fast",
    "95-105 BPM",
    "Rich",
    "Warm",
    "Dynamic",
    "ringtone",
  ],
  indie: [
    "Arctic Monkeys",
    "Tame Impala",
    "Alternative",
    "Creative",
    "Unique",
    "Dreamy",
    "Cool",
    "Modern",
    "Short loop",
    "Indie-style",
    "Atmospheric",
    "Indie Guitars",
    "Synths",
    "Alternative Drums",
    "Medium",
    "110-120 BPM",
    "Lo-fi",
    "Textured",
    "Artistic",
    "ringtone",
  ],
  funk: [
    "Anderson .Paak",
    "Vulfpeck",
    "Groovy",
    "Funky",
    "Dynamic",
    "Fun",
    "Energetic",
    "Playful",
    "Short loop",
    "Funk-groove",
    "Rhythmic",
    "Funk Guitar",
    "Bass",
    "Drums",
    "Horns",
    "Medium-Fast",
    "95-115 BPM",
    "Punchy",
    "Warm",
    "ringtone",
  ],
  soul: [
    "Leon Bridges",
    "John Legend",
    "Soulful",
    "Emotional",
    "Rich",
    "Heartfelt",
    "Warm",
    "Sincere",
    "Short loop",
    "Soul-progression",
    "Melodic",
    "Electric Piano",
    "Soul Bass",
    "Horns",
    "Medium",
    "85-95 BPM",
    "Vintage",
    "ringtone",
  ],
  disco: [
    "Dua Lipa",
    "Doja Cat",
    "Groovy",
    "Fun",
    "Retro",
    "Uplifting",
    "Dancing",
    "Joyful",
    "Short loop",
    "Disco-groove",
    "Dance",
    "Disco Strings",
    "Funky Bass",
    "Four-on-floor",
    "Medium-Fast",
    "115-125 BPM",
    "Bright",
    "Rich",
    "Dynamic",
    "ringtone",
  ],
  punk: [
    "Green Day",
    "Blink-182",
    "Fast",
    "Raw",
    "Energetic",
    "Rebellious",
    "Intense",
    "Bold",
    "Short loop",
    "Punk-progression",
    "Power Chords",
    "Fast Drums",
    "Punk Bass",
    "160-180 BPM",
    "Punchy",
    "ringtone",
  ],
  gospel: [
    "Kirk Franklin",
    "Tye Tribbett",
    "Uplifting",
    "Powerful",
    "Spirited",
    "Joyful",
    "Inspiring",
    "Energetic",
    "Short loop",
    "Gospel-progression",
    "Piano",
    "Hammond Organ",
    "Gospel Choir",
    "Medium",
    "100-120 BPM",
    "Rich",
    "Full",
    "ringtone",
  ],

  "k-pop": [
    "BTS",
    "BLACKPINK",
    "Polished",
    "Dynamic",
    "Modern",
    "Energetic",
    "Fun",
    "Bright",
    "Short loop",
    "K-pop-style",
    "Hook-based",
    "Synths",
    "K-pop Beats",
    "Effects",
    "Fast",
    "120-140 BPM",
    "Crisp",
    "Powerful",
    "Clean",
    "ringtone",
  ],

  edm: [
    "Martin Garrix",
    "Avicii",
    "Energetic",
    "Big",
    "Festival",
    "Euphoric",
    "Exciting",
    "Powerful",
    "Short loop",
    "Build-drop",
    "EDM Synths",
    "Big Drums",
    "Effects",
    "Fast",
    "128-140 BPM",
    "Massive",
    "Clean",
    "Wide",
    "ringtone",
  ],
  techno: [
    "Charlotte de Witte",
    "Amelie Lens",
    "Dark",
    "Driving",
    "Hypnotic",
    "Industrial",
    "Raw",
    "Underground",
    "Short loop",
    "Techno-groove",
    "Pattern-based",
    "Techno Drums",
    "Dark Synths",
    "Effects",
    "Fast",
    "130-140 BPM",
    "Powerful",
    "ringtone",
  ],
  house: [
    "Disclosure",
    "Chris Lake",
    "Groovy",
    "Rhythmic",
    "Smooth",
    "Uplifting",
    "Energetic",
    "Positive",
    "Short loop",
    "House-groove",
    "Four-on-floor",
    "House Beats",
    "Bass",
    "Synths",
    "Medium-Fast",
    "120-128 BPM",
    "Clean",
    "Warm",
    "Deep",
    "ringtone",
  ],
  dubstep: [
    "Skrillex",
    "Excision",
    "Heavy",
    "Intense",
    "Dynamic",
    "Aggressive",
    "Energetic",
    "Dark",
    "Short loop",
    "Drop-focused",
    "Bass-heavy",
    "Wobble Bass",
    "Heavy Drums",
    "Effects",
    "Medium",
    "140-150 BPM",
    "Massive",
    "Complex",
    "ringtone",
  ],

  funny: [
    "Weird Al",
    "Jack Black",
    "Playful",
    "Humorous",
    "Fun",
    "Silly",
    "Light-hearted",
    "Amusing",
    "Short loop",
    "Comedy-style",
    "Quirky",
    "Funny Sounds",
    "Cartoonish Effects",
    "Quirky Synths",
    "Variable",
    "100-140 BPM",
    "Clear",
    "Bright",
    "ringtone",
  ],
};
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
function validateMusicIdeasPrompt(prompt) {
  if (typeof prompt !== "string") {
    throw new Error("Prompt must be a string");
  }
  if (prompt.length > 5000) {
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
async function generateLyrics(prompt) {
  console.log("Generating lyrics with OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate very short, fun song lyrics (6 lines maximum) for a ringtone based on the following prompt. Keep it brief and catchy.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("OpenAI Response:", JSON.stringify(response, null, 2));
    const lyrics = response.choices[0].message.content;
    console.log("NEW Generated Lyrics:", lyrics);
    return lyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}
// Function to generate lyrics using OpenAI
async function generateMiniMaxiLyrics(prompt) {
  console.log("Generating lyrics with OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate fun song lyrics (8 lines maximum) for a ringtone based on the following prompt. Keep it brief and catchy.Make the lyric excellent and memorable. Make it a fun ringtone. dont include any other instructions such as (chorus) or [GENRES: etc] just return the lyrics. Generate happy and fun song lyrics for a 30 second ringtone based on the following prompt. The song should be around 30 seconds long. It should be a fun ringtone about the person calling",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("OpenAI Response:", JSON.stringify(response, null, 2));
    const lyrics = response.choices[0].message.content;
    console.log("NEW Generated Lyrics:", lyrics);
    return lyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}

async function generateMusicIdeasLyrics(prompt) {
  console.log("Generating lyrics with OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate happy and fun song lyrics for a song based on the following prompt.",
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
    console.log("NEW Generated Lyrics:", lyrics);
    return lyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}
async function generateDailySongLyrics(prompt) {
  console.log("Generating lyrics with OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate happy and fun song lyrics for a song based on the following prompt.  It should be a fun song about the listeners upcoming day. it uses the following info from their calendar, the weather, headlines from the BBC. please make the lyrics fun and engaging",
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
    console.log("NEW Generated Lyrics:", lyrics);
    return lyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}

async function generateDailySongMusic(lyrics) {
  console.log("Generating music with Suno...");
  try {
    const response = await axios.post(
      `${SUNO_BASE_URL}/generate/music`,
      {
        title: "my daily song",
        tags: "Energetic, Catchy, Fun,Pop, Electronic",
        prompt:
          "[GENRES: Pop, Electronic][SOUNDS LIKE: Energetic, Catchy, Fun][STYLE: Upbeat, Cheerful][[MOOD: Playful, Friendly, Memorable][[INSTRUMENTATION: Synth, Light percussion][[TEMPO: Medium, 120 BPM][[PRODUCTION: Crisp, Bright, Polished][DYNAMICS: Quick rhythm, Steady pulse][[EMOTIONS: Joy, Friendship, Energy][STRUCTURE:start with chorus] [make a song that sets the listener up for their day]" +
          lyrics,
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
// Function to generate music using Suno
async function generateMusic(lyrics) {
  console.log("Generating music with Suno...");
  try {
    const response = await axios.post(
      `${SUNO_BASE_URL}/generate/music`,
      {
        title: "friends ringtone",
        tags: "Energetic, Catchy, Fun,Pop, Electronic",
        prompt:
          "[GENRES: Pop, Electronic][SOUNDS LIKE: Energetic, Catchy, Fun][STYLE: Upbeat, Cheerful][[MOOD: Playful, Friendly, Memorable][[INSTRUMENTATION: Synth, Light percussion][[TEMPO: Medium, 120 BPM][[PRODUCTION: Crisp, Bright, Polished][DYNAMICS: Quick rhythm, Steady pulse][[EMOTIONS: Joy, Friendship, Energy][STRUCTURE:start with chorus]" +
          lyrics,
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

async function generateMusicIdeasMusic(lyrics) {
  console.log("Generating music with Suno...");
  try {
    const response = await axios.post(
      `${SUNO_BASE_URL}/generate/music`,
      {
        title: "Song",
        tags: "Energetic, Catchy, Fun,Duet, Broadway",
        prompt:
          "[GENRES: Broadway, Musical Theater][vocal add ons][Duet][Duet with Male and female singer]" +
          lyrics,
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
// Function to check the status of generated songs
async function checkStatus(songIds, returnFirstAvailable = false) {
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
    let currentStatus = "queued";

    for (const result of results) {
      console.log("Song ID:", result.id);
      console.log("Status:", result.status);

      // Update status based on current song
      if (result.status === "streaming" && currentStatus === "queued") {
        currentStatus = "streaming";
      }

      if (result.status === "complete") {
        console.log("Audio URL:", result.audio_url);
        audioUrl = result.audio_url;
        currentStatus = "complete";
        if (returnFirstAvailable) {
          console.log("First available URL found:", audioUrl);
          return { allComplete: true, audioUrl, status: currentStatus };
        }
      } else if (result.status === "error") {
        console.log("Error:", result.meta_data.error_message);
        allComplete = false;
        currentStatus = "error";
      } else {
        allComplete = false;
      }
      console.log("---");
    }

    // Log overall status
    console.log("Current overall status:", currentStatus);

    return {
      allComplete,
      audioUrl,
      status: currentStatus,
    };
  } catch (error) {
    console.error("Error checking status:", error);
    return {
      allComplete: false,
      audioUrl: null,
      status: "error",
    };
  }
}

// Function to poll status until complete or max attempts reached
async function pollStatus(songIds, returnFirstAvailable = false) {
  const interval = returnFirstAvailable ? 5000 : 15000; // 5 seconds for URL, 15 seconds for processing
  const maxAttempts = returnFirstAvailable ? 60 : 20; // 60 attempts for URL (5 mins total), 20 for processing (5 mins total)
  let attempts = 0;

  while (attempts < maxAttempts) {
    console.log(`Attempt ${attempts + 1} to check status...`);
    const { allComplete, audioUrl, status } = await checkStatus(
      songIds,
      returnFirstAvailable
    );

    if (audioUrl && (returnFirstAvailable || allComplete)) {
      console.log(
        returnFirstAvailable
          ? "First song is complete!"
          : "All songs are complete!"
      );
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

// Function to poll status until complete or max attempts reached
async function pollStatus(songIds, returnFirstAvailable = false) {
  // Use different polling settings based on the endpoint
  const interval = returnFirstAvailable ? 5000 : 15000; // 5 seconds for URL, 15 seconds for processing
  const maxAttempts = returnFirstAvailable ? 60 : 20; // 60 attempts for URL (5 mins total), 20 for processing (5 mins total)
  let attempts = 0;

  while (attempts < maxAttempts) {
    console.log(`Attempt ${attempts + 1} to check status...`);
    const { allComplete, audioUrl } = await checkStatus(
      songIds,
      returnFirstAvailable
    );

    if (audioUrl && (returnFirstAvailable || allComplete)) {
      console.log(
        returnFirstAvailable
          ? "First song is complete!"
          : "All songs are complete!"
      );
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
app.post("/generate-daily-song-url", async (req, res) => {
  console.log("Starting the generate-url workflow...");
  try {
    const { prompt } = req.body;
    const validatedPrompt = validatePrompt(prompt);

    // Step 1: Generate lyrics with OpenAI
    console.log("Step 1: Generating lyrics...");
    const lyrics = await generateDailySongLyrics(validatedPrompt);

    // Step 2: Generate music with Suno using the lyrics
    console.log("Step 2: Generating music...");
    const songIds = await generateDailySongMusic(lyrics);

    // Wait for first available URL
    console.log("Waiting for first available URL...");
    const audioUrl = await pollStatus(songIds, true);

    // Return the URL to the client
    console.log("Returning audio URL to client...");
    res.json({ url: audioUrl });
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
// Generate URL endpoint
app.post("/generate-url", async (req, res) => {
  console.log("Starting the generate-url workflow...");
  try {
    const { prompt } = req.body;
    const validatedPrompt = validatePrompt(prompt);

    // Step 1: Generate lyrics with OpenAI
    console.log("Step 1: Generating lyrics...");
    const lyrics = await generateLyrics(validatedPrompt);

    // Step 2: Generate music with Suno using the lyrics
    console.log("Step 2: Generating music...");
    const songIds = await generateMusic(lyrics);

    // Wait for first available URL
    console.log("Waiting for first available URL...");
    const audioUrl = await pollStatus(songIds, true);

    // Return the URL to the client
    console.log("Returning audio URL to client...");
    res.json({ url: audioUrl });
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

app.post("/generate-url-music-ideas", async (req, res) => {
  console.log("Starting the generate-url workflow...");
  try {
    const { prompt } = req.body;
    const validatedPrompt = validateMusicIdeasPrompt(prompt);

    // Step 1: Generate lyrics with OpenAI
    console.log("Step 1: Generating lyrics...");
    const lyrics = await generateMusicIdeasLyrics(validatedPrompt);

    // Step 2: Generate music with Suno using the lyrics
    console.log("Step 2: Generating music...");
    const songIds = await generateMusicIdeasMusic(lyrics);

    // Wait for first available URL
    console.log("Waiting for first available URL...");
    const audioUrl = await pollStatus(songIds, true);

    // Return the URL to the client
    console.log("Returning audio URL to client...");
    res.json({ url: audioUrl });
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
// Add this function to your existing server code
async function generateMiniMaxiMusic(params) {
  try {
    console.log("\n=== Starting Music Generation ===");
    console.log("Request Parameters:", params);

    const formData = new FormData();
    formData.append("refer_voice", params.voiceId);
    formData.append("refer_instrumental", params.instrumentalId);
    formData.append("lyrics", params.lyrics);
    formData.append("model", "music-01");
    formData.append(
      "audio_setting",
      JSON.stringify({
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      })
    );

    console.log("\nMaking music generation request...");
    const response = await axios({
      method: "post",
      url: "https://api.minimaxi.chat/v1/music_generation",
      headers: {
        Authorization: `Bearer ${MINIMAXI_API_KEY}`,
        ...formData.getHeaders(),
      },
      data: formData,
    });

    // Add detailed logging of the response
    console.log("\nFull API Response:", JSON.stringify(response.data, null, 2));
    console.log("\nResponse Structure:");
    console.log("Status:", response.status);
    console.log("Headers:", response.headers);
    console.log("Data keys:", Object.keys(response.data));
    if (response.data.data) {
      console.log("Data.data keys:", Object.keys(response.data.data));
    }

    if (response.data && response.data.data && response.data.data.audio) {
      return {
        message: "Music generated successfully",
        audioHex: response.data.data.audio,
        extraInfo: response.data.extra_info,
        lyrics: params.lyrics,
      };
    } else {
      // Add more detailed error information
      const errorMsg = `No audio data in response. Response structure: ${JSON.stringify(
        response.data
      )}`;
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("\n=== Error in Music Generation ===");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    }
    throw error;
  }
}

// Add a validation function for MiniMaxi lyrics
function validateMiniMaxiLyrics(lyrics) {
  const maxLength = 500; // Adjust this value based on MiniMaxi's requirements
  if (lyrics.length > maxLength) {
    // Truncate lyrics if too long
    return lyrics.substring(0, maxLength);
  }
  return lyrics;
}

// Update the generate-mini-maxi endpoint
app.post("/generate-mini-maxi", async (req, res) => {
  console.log("Starting the MiniMaxi music generation workflow...");
  try {
    const { prompt } = req.body;
    const validatedPrompt = validatePrompt(prompt);

    // Step 1: Generate lyrics with OpenAI
    console.log("Step 1: Generating lyrics...");
    let lyrics = await generateMiniMaxiLyrics(validatedPrompt + "##\n");

    // Validate and truncate lyrics if necessary
    lyrics = validateMiniMaxiLyrics(lyrics);
    console.log("Validated lyrics length:", lyrics.length);
    console.log("Final lyrics:", lyrics);

    // Step 2: Prepare MiniMaxi generation parameters
    const miniMaxiParams = {
      voiceId: "vocal-2024112413150824-aj4GKzSM",
      instrumentalId: "instrumental-2024112413150824-UE4jIGJY",
      lyrics: lyrics,
    };

    // Step 3: Generate music with MiniMaxi
    console.log("Step 2: Generating music with MiniMaxi...");
    const result = await generateMiniMaxiMusic(miniMaxiParams);

    // Return the result to the client
    console.log("Returning music generation result to client...");
    res.status(200).json({
      message: result.message,
      audioHex: result.audioHex,
      extraInfo: result.extraInfo,
      lyrics: result.lyrics,
    });
  } catch (error) {
    console.error("Error during MiniMaxi music generation:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "An error occurred during MiniMaxi music generation",
        message: error.message,
      });
    }
  } finally {
    // Log completion of request
    console.log("MiniMaxi request completed");
  }
});
app.post("/generate-and-process", async (req, res) => {
  console.log("Starting the generate-and-process workflow...");
  let tempInputPath, outputPath;
  try {
    const { prompt } = req.body;
    const validatedPrompt = validatePrompt(prompt);

    const outputDir = path.join(__dirname, "temp_outputs");
    tempInputPath = path.join(outputDir, "temp_input.mp3");
    outputPath = path.join(outputDir, "ling 2.aiff");

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

    // Send the AIFF file to the client
    console.log("Sending AIFF file...");
    res.download(outputPath, "ling 2.aiff", async (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).send("An error occurred while sending the file.");
        }
      }
      console.log("AIFF file sent successfully");

      // Clean up
      try {
        await fs.remove(tempInputPath);
        await fs.remove(outputPath);
        console.log("Cleanup completed.");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    });
  } catch (error) {
    console.error("Error during processing:", error);
    if (!res.headersSent) {
      res.status(500).send("An error occurred during processing.");
    }
    // Clean up in case of error
    try {
      if (tempInputPath) await fs.remove(tempInputPath);
      if (outputPath && (await fs.pathExists(outputPath)))
        await fs.remove(outputPath);
      console.log("Cleanup completed.");
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
  }
});

// fox-ai
// Add FoxAI lyrics generation function
async function generateFoxAILyrics(prompt) {
  console.log("Generating lyrics with OpenAI for FoxAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate ringtone lyrics (8-12 lines) in the format [Verse]\n followed by lyrics then [Verse 2]\n followed by lyrics. Make the lyrics engaging and suitable for a pop/rock song and about the person calling. Keep the tone upbeat and memorable." +
            prompt,
        },
        {
          role: "user",
          content: `Write ringtone lyrics about: ${prompt}`,
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

    // Format lyrics to match FoxAI's expected format
    const formattedLyrics = lyrics.replace(/\n\n/g, "\n");
    return formattedLyrics;
  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
}
// Add FoxAI music generation function

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

async function generateFoxAIMusic(prompt, cleanGenre, genreDetails) {
  console.log("Generating music with FoxAI...");
  console.log("Using genre details:", genreDetails);
  const tags = Array.isArray(genreDetails) ? genreDetails : [];

  // Filter out any non-string values and empty strings
  const cleanTags = tags.filter(
    (tag) => typeof tag === "string" && tag.trim().length > 0
  );

  console.log("Cleaned tags:", cleanTags);
  try {
    const response = await axios.post(
      "https://api.foxai.me/api/v1/music/generate",
      {
        model: "foxai-v1",
        tags: cleanTags,
        description: `a ${cleanGenre} ringtone about ${prompt}, ${prompt} is calling on the phone right now`,
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

// app.post("/generate-foxai-url", async (req, res) => {
//   console.log("Starting the FoxAI generate-url workflow...");
//   try {
//     const { prompt, genre = "pop" } = req.body;
//     console.log("Received request with prompt:", prompt);
//     console.log("Received genre:", genre);

//     // Clean up the genre regardless of how it's sent
//     const cleanGenre = Array.isArray(genre)
//       ? genre[0].toLowerCase().replace(/[^a-z0-9]/g, "")
//       : genre.toLowerCase().replace(/[^a-z0-9]/g, "");

//     console.log("Cleaned genre:", cleanGenre);

//     const validatedPrompt = validatePrompt(prompt);

//     // Get the appropriate genre details or fall back to pop
//     const genreDetails = genrePrompts[cleanGenre] || genrePrompts.pop;
//     console.log("Using genre details:", genreDetails);

//     // Generate music with FoxAI using the genre-specific description
//     const songs = await generateFoxAIMusic(prompt, cleanGenre, genreDetails);

//     // Wait for first available URL
//     console.log("Waiting for generation to complete...");
//     let songData = null;
//     const maxAttempts = 60;
//     let attempts = 0;

//     while (attempts < maxAttempts && !songData) {
//       const {
//         allComplete,
//         songData: data,
//         status,
//       } = await checkFoxAIStatus(songs);

//       if (data) {
//         songData = data;
//         break;
//       }

//       attempts++;
//       if (attempts < maxAttempts) {
//         console.log("Waiting 5 seconds before next check...");
//         await new Promise((resolve) => setTimeout(resolve, 5000));
//       }
//     }

//     if (!songData) {
//       throw new Error("Timeout: Music generation incomplete");
//     }

//     // Return the complete song data to the client
//     console.log("Returning song data to client...");
//     res.json({
//       audio_url: songData.audio_url,
//       image_url: songData.image_url,
//       video_url: songData.video_url,
//       title: songData.title,
//       metadata: songData.metadata,
//       duration: songData.duration,
//       created_at: songData.created_at,
//     });
//   } catch (error) {
//     console.error("Error during processing:", error);
//     if (!res.headersSent) {
//       res.status(500).json({
//         error: "An error occurred during processing.",
//         message: error.message,
//       });
//     }
//   }
// });

app.post("/generate-foxai-url", foxAILimiter, async (req, res) => {
  console.log("Starting the FoxAI generate-url workflow...");
  try {
    const { prompt, genre = "pop" } = req.body;
    console.log("Received request with prompt:", prompt);
    console.log("Received genre:", genre);

    // Clean up the genre regardless of how it's sent
    const cleanGenre = Array.isArray(genre)
      ? genre[0].toLowerCase().replace(/[^a-z0-9]/g, "")
      : genre.toLowerCase().replace(/[^a-z0-9]/g, "");

    console.log("Cleaned genre:", cleanGenre);

    const validatedPrompt = validatePrompt(prompt);

    // Get the appropriate genre details or fall back to pop
    const genreDetails = genrePrompts[cleanGenre] || genrePrompts.pop;
    console.log("Using genre details:", genreDetails);

    // Generate music with FoxAI using the genre-specific description
    const songs = await generateFoxAIMusic(prompt, cleanGenre, genreDetails);

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
      `Port ${PORT} is already in use. Please choose a different port!`
    );
  } else {
    console.log("An error occurred:", e);
  }
});
