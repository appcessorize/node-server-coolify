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
const jwt = require("jsonwebtoken");
const upload = multer({ dest: "uploads/" });

const openaiApiKey = process.env.OPENAI_API_KEY;
const sunoApiKey = process.env.SUNO_API_KEY;
const API_KEYS = [process.env.API_KEY_1, process.env.API_KEY_2];
const MINIMAXI_API_KEY = process.env.MINIMAXI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const requiredEnvVars = [
  "OPENAI_API_KEY",
  "SUNO_API_KEY",
  "API_KEY_1",
  "API_KEY_2",
  "MINIMAXI_API_KEY",
  "JWT_SECRET",
];

const rateLimit = require("express-rate-limit");
const { sunautoGenrePrompts } = require("./sunautogenreprompts.js");
// Sonauto API Configuration
const SONAUTO_API_KEY = process.env.SONAUTO_API_KEY;
const SONAUTO_BASE_URL = "https://api.sonauto.ai/v1";
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

// const genrePrompts = {
//   pop: [],
//   rock: [],
//   country: [],

//   opera: [],
//   "hip-hop": [],
//   "r&b": [],
//   jazz: [],
//   christmas: [],

//   choir: [],

//   kids: [],

//   swing: [],
//   electronic: [],
//   blues: [],
//   reggae: [],
//   metal: [],
//   folk: [],
//   indie: [],
//   funk: [],
//   soul: [],
//   disco: [],
//   punk: [],
//   gospel: [],

//   "k-pop": [],

//   edm: [],
//   techno: [],
//   house: [],
//   dubstep: [],

//   funny: [],
// };
function checkEnvVariables() {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is missing or undefined");
    return false;
  }

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
// const SUNO_BASE_URL = "https://api.sunoaiapi.com/api/v1/gateway";

const SUNO_BASE_URL = "https://api.sunoaiapi.com/api/v1/udio";

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
// Update this section
app.use((req, res, next) => {
  if (
    req.path === "/" ||
    req.path === "/health" ||
    req.path === "/generate-foxai-url"
  ) {
    // Add the protected route to bypass
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
  console.log("Generating music with Udio...");
  try {
    const response = await axios.post(
      `${SUNO_BASE_URL}/generate-proxy`,
      {
        gen_params: {
          prompt: `[GENRES: Broadway, Musical Theater][vocal add ons][Duet][Duet with Male and female singer] ${lyrics}`,
          lyrics: lyrics,
          lyrics_type: "generate",
          bypass_prompt_optimization: false,
          seed: -1,
          song_section_start: 0.4,
          prompt_strength: 0.5,
          clarity_strength: 0.25,
          lyrics_strength: 0.5,
          generation_quality: 0.75,
          negative_prompt: "",
          model_type: "udio32-v1.5",
          config: {
            mode: "regular",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": sunoApiKey,
        },
      }
    );

    const trackIds = response.data.track_ids || [];
    console.log("Generated track IDs:", trackIds);
    return trackIds;
  } catch (error) {
    console.error("Error generating music:", error);
    throw error;
  }
}

// async function generateMusicIdeasMusic(lyrics) {
//   console.log("Generating music with Suno...");
//   try {
//     const response = await axios.post(
//       `${SUNO_BASE_URL}/generate/music`,
//       {
//         title: "Song",
//         tags: "Energetic, Catchy, Fun,Duet, Broadway",
//         prompt:
//           "[GENRES: Broadway, Musical Theater][vocal add ons][Duet][Duet with Male and female singer]" +
//           lyrics,
//         mv: "chirp-v3-5",
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "api-key": sunoApiKey,
//         },
//       }
//     );

//     const songIds = response.data.data.map((song) => song.song_id);
//     console.log("Generated song IDs:", songIds);
//     return songIds;
//   } catch (error) {
//     console.error("Error generating music:", error);
//     throw error;
//   }
// }
// Function to check the status of generated songs
// Function to check the status of generated songs
// async function checkStatus(songIds, returnFirstAvailable = false) {
//   try {
//     const response = await axios.get(`${SUNO_BASE_URL}/query`, {
//       params: { ids: songIds.join(",") },
//       headers: {
//         "Content-Type": "application/json",
//         "api-key": sunoApiKey,
//       },
//     });

//     const results = response.data;
//     let allComplete = true;
//     let audioUrl = null;
//     let currentStatus = "queued";

//     for (const result of results) {
//       console.log("Song ID:", result.id);
//       console.log("Status:", result.status);

//       // Update status based on current song
//       if (result.status === "streaming" && currentStatus === "queued") {
//         currentStatus = "streaming";
//       }

//       if (result.status === "complete") {
//         console.log("Audio URL:", result.audio_url);
//         audioUrl = result.audio_url;
//         currentStatus = "complete";
//         if (returnFirstAvailable) {
//           console.log("First available URL found:", audioUrl);
//           return { allComplete: true, audioUrl, status: currentStatus };
//         }
//       } else if (result.status === "error") {
//         console.log("Error:", result.meta_data.error_message);
//         allComplete = false;
//         currentStatus = "error";
//       } else {
//         allComplete = false;
//       }
//       console.log("---");
//     }

//     // Log overall status
//     console.log("Current overall status:", currentStatus);

//     return {
//       allComplete,
//       audioUrl,
//       status: currentStatus,
//     };
//   } catch (error) {
//     console.error("Error checking status:", error);
//     return {
//       allComplete: false,
//       audioUrl: null,
//       status: "error",
//     };
//   }
// }
async function checkStatus(trackIds, returnFirstAvailable = false) {
  try {
    const response = await axios.get(`${SUNO_BASE_URL}/query_v2`, {
      params: { ids: trackIds.join(",") },
      headers: {
        "Content-Type": "application/json",
        "api-key": sunoApiKey,
      },
    });

    const results = response.data.songs || [];
    let allComplete = true;
    let audioUrl = null;
    let currentStatus = "queued";

    for (const result of results) {
      console.log("Track ID:", result.id);
      console.log("Status:", result.finished ? "complete" : "processing");

      if (result.finished && result.song_path) {
        console.log("Audio URL:", result.song_path);
        audioUrl = result.song_path;
        currentStatus = "complete";
        if (returnFirstAvailable) {
          console.log("First available URL found:", audioUrl);
          return { allComplete: true, audioUrl, status: currentStatus };
        }
      } else if (result.error_detail) {
        console.log("Error:", result.error_detail);
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

async function pollStatus(trackIds, returnFirstAvailable = false) {
  const interval = returnFirstAvailable ? 5000 : 15000;
  const maxAttempts = returnFirstAvailable ? 60 : 20;
  let attempts = 0;

  while (attempts < maxAttempts) {
    console.log(`Attempt ${attempts + 1} to check status...`);
    try {
      const { allComplete, audioUrl, status } = await checkStatus(
        trackIds,
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
    } catch (error) {
      console.error(`Error in attempt ${attempts + 1}:`, error.message);
      // Continue to next attempt rather than failing completely
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
// async function pollStatus(songIds, returnFirstAvailable = false) {
//   const interval = returnFirstAvailable ? 5000 : 15000; // 5 seconds for URL, 15 seconds for processing
//   const maxAttempts = returnFirstAvailable ? 60 : 20; // 60 attempts for URL (5 mins total), 20 for processing (5 mins total)
//   let attempts = 0;

//   while (attempts < maxAttempts) {
//     console.log(`Attempt ${attempts + 1} to check status...`);
//     const { allComplete, audioUrl, status } = await checkStatus(
//       songIds,
//       returnFirstAvailable
//     );

//     if (audioUrl && (returnFirstAvailable || allComplete)) {
//       console.log(
//         returnFirstAvailable
//           ? "First song is complete!"
//           : "All songs are complete!"
//       );
//       return audioUrl;
//     }

//     attempts++;
//     if (attempts < maxAttempts) {
//       console.log(`Waiting ${interval / 1000} seconds before next check...`);
//       await new Promise((resolve) => setTimeout(resolve, interval));
//     }
//   }

//   console.log("Max attempts reached. Some songs may not be complete.");
//   throw new Error("Timeout: Music generation incomplete");
// }

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
  console.log("Starting the generate-url-music-ideas workflow...");
  try {
    const { prompt } = req.body;
    const validatedPrompt = validateMusicIdeasPrompt(prompt);

    // Step 1: Generate lyrics with OpenAI (stays the same)
    console.log("Step 1: Generating lyrics...");
    const lyrics = await generateMusicIdeasLyrics(validatedPrompt);

    // Step 2: Generate music with Udio using the lyrics
    console.log("Step 2: Generating music...");
    const trackIds = await generateMusicIdeasMusic(lyrics);

    // Wait for first available URL
    console.log("Waiting for first available URL...");
    const audioUrl = await pollStatus(trackIds, true);

    // Return the URL to the client (format stays the same)
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

// app.post("/generate-url-music-ideas", async (req, res) => {
//   console.log("Starting the generate-url workflow...");
//   try {
//     const { prompt } = req.body;
//     const validatedPrompt = validateMusicIdeasPrompt(prompt);

//     // Step 1: Generate lyrics with OpenAI
//     console.log("Step 1: Generating lyrics...");
//     const lyrics = await generateMusicIdeasLyrics(validatedPrompt);

//     // Step 2: Generate music with Suno using the lyrics
//     console.log("Step 2: Generating music...");
//     const songIds = await generateMusicIdeasMusic(lyrics);

//     // Wait for first available URL
//     console.log("Waiting for first available URL...");
//     const audioUrl = await pollStatus(songIds, true);

//     // Return the URL to the client
//     console.log("Returning audio URL to client...");
//     res.json({ url: audioUrl });
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

app.post("/auth/token", apiKeyAuth, async (req, res) => {
  const apiKey = req.header("X-API-Key");

  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  const token = jwt.sign(
    {
      apiKey,
      timestamp: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: "7d" } // Changed from 5m to 7 days
  );

  res.json({ token });
});
// JWT verification middleware
// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  console.log("Verifying token:", token?.substring(0, 20) + "..."); // Add logging

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Token verified successfully:", decoded); // Add logging
    req.user = decoded;
    next();
  } catch (err) {
    console.log("Token verification failed:", err.message); // Add logging
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

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

app.get("/auth/health", (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET not configured" });
  }
  res.status(200).json({ message: "Auth service healthy" });
});
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

app.post("/generate-foxai-url", verifyToken, foxAILimiter, async (req, res) => {
  console.log("User from token:", req.user); // Add logging
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

//sunauto

// Rate limiter for the Sonauto endpoint - similar to FoxAI limiter
const sonautoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each IP to 100 requests per hour
  message: {
    error: "Too many requests from this IP, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Add these enhanced logging functions to your backend code

// Enhanced logging for the Sonauto endpoint
// app.post(
//   "/generate-sonauto-url",
//   verifyToken,
//   sonautoLimiter,
//   async (req, res) => {
//     console.log("========== GENERATE SONAUTO URL ==========");
//     console.log("User from token:", req.user);
//     console.log("Starting the Sonauto generate-url workflow...");
//     console.log("Request headers:", JSON.stringify(req.headers, null, 2));
//     console.log("Request body:", JSON.stringify(req.body, null, 2));

//     try {
//       const { prompt, genre = "pop", lyrics } = req.body;
//       console.log("Extracted prompt:", prompt);
//       console.log("Extracted genre:", genre);
//       console.log(
//         "Extracted lyrics:",
//         lyrics ? `${lyrics.substring(0, 50)}...` : "None provided"
//       );

//       // Clean up the genre regardless of how it's sent
//       const cleanGenre = Array.isArray(genre)
//         ? genre[0].toLowerCase().replace(/[^a-z0-9]/g, "")
//         : genre.toLowerCase().replace(/[^a-z0-9]/g, "");

//       console.log("Cleaned genre:", cleanGenre);

//       // Check if we have the genre prompts
//       console.log("Available genre keys:", Object.keys(sunautoGenrePrompts));

//       // Get the appropriate genre details or fall back to pop
//       const genreDetails =
//         sunautoGenrePrompts[cleanGenre] || sunautoGenrePrompts.pop;
//       console.log(
//         "Using genre details:",
//         JSON.stringify(genreDetails, null, 2)
//       );

//       // Prepare options for Sonauto
//       const options = {
//         prompt: `${prompt} ringtone, catchy, 30 seconds`,
//         tags: genreDetails,
//         prompt_strength: 2.3,
//         instrumental: false,
//       };

//       console.log("Initial Sonauto options:", JSON.stringify(options, null, 2));

//       // Add lyrics if provided
//       if (lyrics && lyrics.trim()) {
//         options.lyrics = lyrics;
//         console.log("Using provided lyrics:", lyrics);

//         delete options.tags;
//       } else if (prompt) {
//         // Generate lyrics if not provided but we have a prompt
//         try {
//           console.log("Generating lyrics based on prompt...");
//           const generatedLyrics = await generateLyrics(prompt); // Using your existing lyrics generator
//           options.lyrics = generatedLyrics;
//           console.log("Generated lyrics:", generatedLyrics);

//           // Important: When lyrics are provided, we can't send tags according to API limitations
//           if (options.tags) {
//             console.log(
//               "Removing tags because lyrics were generated (API constraint)"
//             );
//             delete options.tags;
//           }
//         } catch (lyricsError) {
//           console.error("Error generating lyrics:", lyricsError);
//           // Continue without lyrics if generation fails
//           options.lyrics = "";
//         }
//       }

//       console.log("Final Sonauto options:", JSON.stringify(options, null, 2));

//       // Check for SONAUTO_API_KEY
//       if (!SONAUTO_API_KEY) {
//         console.error(
//           "SONAUTO_API_KEY is not defined in environment variables"
//         );
//         throw new Error("Sonauto API key is missing");
//       }

//       // Generate song with Sonauto
//       try {
//         console.log("Calling generateSonautoSong...");
//         const taskId = await generateSonautoSong(options);
//         console.log("Song generation initiated with task ID:", taskId);

//         // Wait for the song to complete instead of returning immediately
//         console.log("Waiting for song generation to complete...");
//         try {
//           const result = await pollSonautoCompletion(taskId);
//           console.log("Song generation complete:", result);

//           if (
//             result.status === "SUCCESS" &&
//             result.song_paths &&
//             result.song_paths.length > 0
//           ) {
//             // Format response to match what iOS app expects (SongResponse format)
//             const response = {
//               audio_url: result.song_paths[0],
//               metadata: {
//                 lyrics: options.lyrics || null,
//               },
//             };

//             console.log("Returning song data to client:", response);
//             return res.json(response);
//           } else {
//             throw new Error(
//               "Song generation completed but no song paths available"
//             );
//           }
//         } catch (pollError) {
//           console.error("Error during polling:", pollError);
//           throw pollError;
//         }
//       } catch (songError) {
//         console.error("Song generation error:", songError);
//         console.error(
//           "Error details:",
//           songError.response
//             ? JSON.stringify(songError.response.data, null, 2)
//             : "No response data"
//         );
//         throw songError;
//       }
//     } catch (error) {
//       console.error("Error during processing:", error);
//       console.error("Stack trace:", error.stack);

//       let statusCode = 500;
//       let errorMessage = error.message;

//       // If this is an Axios error with a response, extract more details
//       if (error.response) {
//         statusCode = error.response.status;
//         console.error(`API responded with status ${statusCode}`);
//         console.error(
//           "Response headers:",
//           JSON.stringify(error.response.headers, null, 2)
//         );
//         console.error(
//           "Response data:",
//           JSON.stringify(error.response.data, null, 2)
//         );

//         // Use the API's error message if available
//         if (error.response.data && error.response.data.error) {
//           errorMessage = `${error.message}: ${error.response.data.error}`;
//         }
//       }

//       // Special handling for common Sonauto API errors
//       if (statusCode === 422) {
//         errorMessage =
//           "Invalid parameters in the request. This might be due to restrictions with combining tags, lyrics, and prompts.";
//       }

//       if (!res.headersSent) {
//         res.status(statusCode).json({
//           error: "An error occurred during processing.",
//           message: errorMessage,
//           details: error.response ? error.response.data : null,
//         });
//       }
//     }
//     console.log("========== END GENERATE SONAUTO URL ==========");
//   }
// );

// Then replace your existing generate-sonauto-url endpoint with this version:

// First, add these imports near the top of your server.js file
// First, make sure to install the required packages:
// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid --save

// Add these imports near the top of your server.js file
const AudioProcessor = require("./audioProcessor");
const { v4: uuidv4 } = require("uuid");

// Then replace your existing generate-sonauto-url endpoint with this:

app.post(
  "/generate-sonauto-url",
  verifyToken,
  sonautoLimiter,
  async (req, res) => {
    console.log("========== GENERATE SONAUTO URL ==========");
    console.log("User from token:", req.user);
    console.log("Starting the Sonauto generate-url workflow...");
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    try {
      const { prompt, genre = "pop", lyrics } = req.body;
      console.log("Extracted prompt:", prompt);
      console.log("Extracted genre:", genre);
      console.log(
        "Extracted lyrics:",
        lyrics ? `${lyrics.substring(0, 50)}...` : "None provided"
      );

      // Clean up the genre regardless of how it's sent
      const cleanGenre = Array.isArray(genre)
        ? genre[0].toLowerCase().replace(/[^a-z0-9]/g, "")
        : genre.toLowerCase().replace(/[^a-z0-9]/g, "");

      console.log("Cleaned genre:", cleanGenre);

      // Get the appropriate genre details or fall back to pop
      const genreDetails =
        sunautoGenrePrompts[cleanGenre] || sunautoGenrePrompts.pop;
      console.log(
        "Using genre details:",
        JSON.stringify(genreDetails, null, 2)
      );

      // Prepare options for Sonauto
      const options = {
        prompt: `${prompt} ringtone, catchy, 30 seconds`,
        tags: genreDetails,
        prompt_strength: 2.3,
        instrumental: false,
      };

      console.log("Initial Sonauto options:", JSON.stringify(options, null, 2));

      // Add lyrics if provided
      if (lyrics && lyrics.trim()) {
        options.lyrics = lyrics;
        console.log("Using provided lyrics:", lyrics);

        delete options.tags;
      } else if (prompt) {
        // Generate lyrics if not provided but we have a prompt
        try {
          console.log("Generating lyrics based on prompt...");
          const generatedLyrics = await generateLyrics(prompt); // Using your existing lyrics generator
          options.lyrics = generatedLyrics;
          console.log("Generated lyrics:", generatedLyrics);

          // Important: When lyrics are provided, we can't send tags according to API limitations
          if (options.tags) {
            console.log(
              "Removing tags because lyrics were generated (API constraint)"
            );
            delete options.tags;
          }
        } catch (lyricsError) {
          console.error("Error generating lyrics:", lyricsError);
          // Continue without lyrics if generation fails
          options.lyrics = "";
        }
      }

      console.log("Final Sonauto options:", JSON.stringify(options, null, 2));

      // Check for SONAUTO_API_KEY
      if (!SONAUTO_API_KEY) {
        console.error(
          "SONAUTO_API_KEY is not defined in environment variables"
        );
        throw new Error("Sonauto API key is missing");
      }

      // Generate song with Sonauto
      try {
        console.log("Calling generateSonautoSong...");
        const taskId = await generateSonautoSong(options);
        console.log("Song generation initiated with task ID:", taskId);

        // Wait for the song to complete instead of returning immediately
        console.log("Waiting for song generation to complete...");
        try {
          const result = await pollSonautoCompletion(taskId);
          console.log("Song generation complete:", result);

          if (
            result.status === "SUCCESS" &&
            result.song_paths &&
            result.song_paths.length > 0
          ) {
            const originalUrl = result.song_paths[0];
            console.log("Received OGG URL from Sonauto:", originalUrl);

            // Process the OGG file and upload to R2
            try {
              console.log("Processing OGG and uploading to R2...");
              const processedAudio =
                await AudioProcessor.processAudioAndUploadToR2(originalUrl, {
                  startTime: 0,
                  duration: 30,
                  format: "m4a",
                  contactName: prompt,
                });

              console.log(
                "File processed and uploaded to R2:",
                processedAudio.url
              );

              // Schedule temp file cleanup for later
              setTimeout(() => {
                AudioProcessor.cleanupTempFiles().catch((err) =>
                  console.error("Error cleaning up temp files:", err)
                );
              }, 3600000); // Clean up after 1 hour

              // Format response to match iOS app expectations with our new URL
              const response = {
                audio_url: processedAudio.url,
                metadata: {
                  lyrics: options.lyrics || null,
                  original_url: originalUrl, // Include the original OGG URL as a fallback
                },
              };

              return res.json(response);
            } catch (processingError) {
              console.error("Error processing audio:", processingError);

              // If processing fails, return the original OGG URL
              console.log(
                "Returning original Sonauto URL due to processing error"
              );
              return res.json({
                audio_url: originalUrl,
                metadata: {
                  lyrics: options.lyrics || null,
                },
              });
            }
          } else {
            throw new Error(
              "Song generation completed but no song paths available"
            );
          }
        } catch (pollError) {
          console.error("Error during polling:", pollError);
          throw pollError;
        }
      } catch (songError) {
        console.error("Song generation error:", songError);
        console.error(
          "Error details:",
          songError.response
            ? JSON.stringify(songError.response.data, null, 2)
            : "No response data"
        );
        throw songError;
      }
    } catch (error) {
      console.error("Error during processing:", error);
      console.error("Stack trace:", error.stack);

      let statusCode = 500;
      let errorMessage = error.message;

      // If this is an Axios error with a response, extract more details
      if (error.response) {
        statusCode = error.response.status;
        console.error(`API responded with status ${statusCode}`);
        console.error(
          "Response headers:",
          JSON.stringify(error.response.headers, null, 2)
        );
        console.error(
          "Response data:",
          JSON.stringify(error.response.data, null, 2)
        );

        // Use the API's error message if available
        if (error.response.data && error.response.data.error) {
          errorMessage = `${error.message}: ${error.response.data.error}`;
        }
      }

      // Special handling for common Sonauto API errors
      if (statusCode === 422) {
        errorMessage =
          "Invalid parameters in the request. This might be due to restrictions with combining tags, lyrics, and prompts.";
      }

      if (!res.headersSent) {
        res.status(statusCode).json({
          error: "An error occurred during processing.",
          message: errorMessage,
          details: error.response ? error.response.data : null,
        });
      }
    }
    console.log("========== END GENERATE SONAUTO URL==========");
  }
);
/**
 * Generate a song using the Sonauto API - Enhanced with better logging
 */
async function generateSonautoSong(options = {}) {
  console.log("========== GENERATE SONAUTO SONG ==========");
  console.log("Options received:", JSON.stringify(options, null, 2));

  try {
    // Set up default payload with placeholder values
    const payload = {
      seed: options.seed || Math.floor(Math.random() * 1000000),
      prompt_strength: options.prompt_strength || 2.3,
      instrumental:
        options.instrumental !== undefined ? options.instrumental : false,
    };

    // Handle the constraint: cannot provide all three (tags, lyrics, prompt)
    if (options.lyrics && options.lyrics.trim()) {
      // If lyrics are provided, use lyrics with prompt only (no tags)
      payload.lyrics = options.lyrics;
      payload.prompt = options.prompt || "A catchy song";
      console.log("Using lyrics and prompt for generation (omitting tags)");
    } else {
      // No lyrics provided, use tags and prompt
      payload.tags = options.tags || ["pop"];
      payload.prompt = options.prompt || "A catchy song";
      console.log("Using tags and prompt for generation");
    }

    // Validate prompt and lyrics length
    if (payload.prompt && payload.prompt.length > 500) {
      console.warn("Warning: Prompt is too long, truncating to 500 characters");
      payload.prompt = payload.prompt.substring(0, 500);
    }

    if (payload.lyrics && payload.lyrics.length > 1000) {
      console.warn(
        "Warning: Lyrics are too long, truncating to 1000 characters"
      );
      payload.lyrics = payload.lyrics.substring(0, 1000);
    }

    console.log("Final payload:", JSON.stringify(payload, null, 2));
    console.log(
      "Using Sonauto API key:",
      SONAUTO_API_KEY ? `${SONAUTO_API_KEY.substring(0, 5)}...` : "NOT SET"
    );
    console.log("Request URL:", `${SONAUTO_BASE_URL}/generations`);

    const response = await axios.post(
      `${SONAUTO_BASE_URL}/generations`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${SONAUTO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Sonauto generation request successful!");
    console.log("Full response:", JSON.stringify(response.data, null, 2));
    console.log("Received task ID:", response.data.task_id);

    return response.data.task_id;
  } catch (error) {
    console.error("Error generating song with Sonauto:", error.message);
    console.error("Stack trace:", error.stack);

    // Log API error details if available
    if (error.response) {
      console.error("API error status:", error.response.status);
      console.error(
        "API error headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
      console.error(
        "API error data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    throw error;
  }
  console.log("========== END GENERATE SONAUTO SONG ==========");
}

/**
 * Enhanced status checking with better logging
 */
async function checkSonautoStatus(taskId) {
  console.log(`========== CHECKING SONAUTO STATUS: ${taskId} ==========`);

  try {
    console.log(`Request URL: ${SONAUTO_BASE_URL}/generations/${taskId}`);
    console.log(
      "Using API key:",
      SONAUTO_API_KEY ? `${SONAUTO_API_KEY.substring(0, 5)}...` : "NOT SET"
    );

    const response = await axios.get(
      `${SONAUTO_BASE_URL}/generations/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${SONAUTO_API_KEY}`,
        },
      }
    );

    console.log(
      `Status check successful. Full response:`,
      JSON.stringify(response.data, null, 2)
    );
    console.log(`Current status: ${response.data.status}`);

    if (response.data.status === "SUCCESS") {
      console.log("Song paths:", response.data.song_paths);
    } else if (response.data.status === "FAILURE") {
      console.error("Generation failed:", response.data.error_message);
    }

    return response.data;
  } catch (error) {
    console.error(`Error checking status for task ${taskId}:`, error.message);
    console.error("Stack trace:", error.stack);

    if (error.response) {
      console.error("Status check response error:", error.response.status);
      console.error(
        "Response headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    throw error;
  }
  console.log(`========== END CHECKING SONAUTO STATUS: ${taskId} ==========`);
}

/**
 * Poll for Sonauto generation completion
 */
async function pollSonautoCompletion(
  taskId,
  interval = 2000,
  timeout = 300000
) {
  console.log(`Starting polling for Sonauto task ${taskId}`);

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        console.error(`Polling timeout exceeded (${timeout}ms)`);
        return reject(new Error("Polling timeout exceeded"));
      }

      try {
        const status = await checkSonautoStatus(taskId);

        if (status.status === "SUCCESS") {
          console.log("Sonauto generation completed successfully!");
          return resolve(status);
        } else if (status.status === "FAILURE") {
          console.error(
            `Generation failed: ${status.error_message || "Unknown error"}`
          );
          return reject(
            new Error(
              `Generation failed: ${status.error_message || "Unknown error"}`
            )
          );
        }

        // Continue polling
        console.log(
          `Not done yet (${status.status}), checking again in ${interval}ms...`
        );
        setTimeout(checkStatus, interval);
      } catch (error) {
        console.error("Error during status check:", error.message);
        reject(error);
      }
    };

    // Start polling
    checkStatus();
  });
}

// Add the new endpoint

// Add a status check endpoint for the client to poll
// app.get("/sonauto-status/:taskId", verifyToken, async (req, res) => {
//   const taskId = req.params.taskId;
//   console.log(`Received status check request for Sonauto task: ${taskId}`);

//   try {
//     const status = await checkSonautoStatus(taskId);

//     // If successful, return the song URL
//     if (
//       status.status === "SUCCESS" &&
//       status.song_paths &&
//       status.song_paths.length > 0
//     ) {
//       return res.json({
//         success: true,
//         status: status.status,
//         url: status.song_paths[0],
//         completed: true,
//       });
//     }

//     // Otherwise return the current status
//     return res.json({
//       success: true,
//       status: status.status,
//       completed: false,
//     });
//   } catch (error) {
//     console.error("Status check error:", error.message);
//     return res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

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
    JWT_SECRET: !!process.env.JWT_SECRET,
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
