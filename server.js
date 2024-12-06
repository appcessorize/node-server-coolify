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

const genrePrompts = {
  pop: {
    description:
      "[GENRES: Pop, Catchy] [SOUNDS LIKE: Dua Lipa, The Chainsmokers] [STYLE: Bright, Energetic, Upbeat] [MOOD: Playful, Uplifting, Modern] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Catchy, Hook-driven] [INSTRUMENTATION: Synthesizers, Electronic Beats, Chime Effects] [TEMPO: Fast, 120-140 BPM] [PRODUCTION: Crisp, Clear, Bright tones] [DURATION: 29 seconds]",
    tags: ["pop", "ringtone", "no intro"],
  },
  rock: {
    description:
      "[GENRES: Rock, Alternative] [SOUNDS LIKE: Foo Fighters, Green Day] [STYLE: Powerful, Dynamic, Raw] [MOOD: Energetic, Bold, Intense] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Guitar-driven, Powerful] [INSTRUMENTATION: Electric Guitars, Bass, Drums, Power Chords] [TEMPO: Medium-Fast, 110-130 BPM] [PRODUCTION: Full, Distorted, Rich] [DURATION: 29 seconds]",
    tags: ["rock", "ringtone", "no intro"],
  },
  country: {
    description:
      "[GENRES: Country, Folk] [SOUNDS LIKE: Luke Combs, Morgan Wallen] [STYLE: Heartfelt, Traditional, Warm] [MOOD: Down-to-earth, Sincere, Friendly] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Nashville-style, Melodic] [INSTRUMENTATION: Acoustic Guitar, Steel Guitar, Fiddle] [TEMPO: Medium, 95-115 BPM] [PRODUCTION: Natural, Warm, Clean] [DURATION: 29 seconds]",
    tags: ["country", "ringtone", "no intro"],
  },
  drill: {
    description:
      "[GENRES: Drill, Trap] [SOUNDS LIKE: Central Cee, Pop Smoke] [STYLE: Dark, Intense, Street] [MOOD: Aggressive, Raw, Authentic] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Pattern-heavy, Bass-driven] [INSTRUMENTATION: Sliding 808s, Drill Patterns, Dark Melodies] [TEMPO: Medium, 140-145 BPM] [PRODUCTION: Heavy Bass, Sharp Hi-hats, Dark] [DURATION: 29 seconds]",
    tags: ["drill", "rap", "ringtone", "no intro"],
  },
  opera: {
    description:
      "[GENRES: Opera, Classical] [SOUNDS LIKE: Andrea Bocelli, Sarah Brightman] [STYLE: Dramatic, Grand, Emotional] [MOOD: Powerful, Majestic, Passionate] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Orchestral, Dramatic] [INSTRUMENTATION: Strings, Orchestra, Piano] [TEMPO: Variable, 70-90 BPM] [PRODUCTION: Rich, Dynamic, Theatrical] [DURATION: 29 seconds]",
    tags: ["opera", "classical", "ringtone", "no intro"],
  },
  "hip-hop": {
    description:
      "[GENRES: Hip-Hop, Urban] [SOUNDS LIKE: Drake, Metro Boomin] [STYLE: Modern, Rhythmic, Bold] [MOOD: Confident, Street, Cool] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Beat-focused, Trap-influenced] [INSTRUMENTATION: 808s, Hi-Hats, Synth Bass, Trap Drums] [TEMPO: Medium, 85-95 BPM] [PRODUCTION: Heavy Bass, Clear Highs, Punchy] [DURATION: 29 seconds]",
    tags: ["hip hop", "rap", "ringtone", "no intro"],
  },
  "r&b": {
    description:
      "[GENRES: R&B, Soul] [SOUNDS LIKE: The Weeknd, SZA] [STYLE: Smooth, Groovy, Modern] [MOOD: Sultry, Emotional, Cool] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Groove-based, Melodic] [INSTRUMENTATION: Electric Piano, Smooth Bass, Modern Drums] [TEMPO: Medium, 90-100 BPM] [PRODUCTION: Warm, Rich, Polished] [DURATION: 29 seconds]",
    tags: ["rnb", "soul", "ringtone", "no intro"],
  },
  jazz: {
    description:
      "[GENRES: Jazz, Swing] [SOUNDS LIKE: Robert Glasper, Kamasi Washington] [STYLE: Sophisticated, Smooth, Complex] [MOOD: Sophisticated, Cool, Relaxed] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Jazz-progression, Melodic] [INSTRUMENTATION: Piano, Double Bass, Jazz Drums, Brass] [TEMPO: Medium, 120-130 BPM] [PRODUCTION: Warm, Natural, Balanced] [DURATION: 29 seconds]",
    tags: ["jazz", "ringtone", "no intro"],
  },
  electronic: {
    description:
      "[GENRES: Electronic, Dance] [SOUNDS LIKE: Calvin Harris, Zedd] [STYLE: Modern, Energetic, Polished] [MOOD: Uplifting, Exciting, Dynamic] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Build-up focused, Drop-based] [INSTRUMENTATION: Synthesizers, Digital Drums, Effects] [TEMPO: Fast, 125-135 BPM] [PRODUCTION: Clean, Powerful, Wide] [DURATION: 29 seconds]",
    tags: ["electronic", "edm", "ringtone", "no intro"],
  },
  blues: {
    description:
      "[GENRES: Blues, Soul] [SOUNDS LIKE: Gary Clark Jr, Joe Bonamassa] [STYLE: Soulful, Raw, Authentic] [MOOD: Emotional, Deep, Genuine] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Blues-progression, Guitar-focused] [INSTRUMENTATION: Blues Guitar, Bass, Blues Harp] [TEMPO: Medium, 85-95 BPM] [PRODUCTION: Raw, Warm, Dynamic] [DURATION: 29 seconds]",
    tags: ["blues", "ringtone", "no intro"],
  },
  reggae: {
    description:
      "[GENRES: Reggae, Caribbean] [SOUNDS LIKE: Chronixx, Koffee] [STYLE: Laid-back, Groovy, Tropical] [MOOD: Relaxed, Positive, Sunny] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Offbeat-focused, Dub-style] [INSTRUMENTATION: Reggae Guitar, Bass, Drums, Organ] [TEMPO: Medium, 90-100 BPM] [PRODUCTION: Deep Bass, Spacious, Warm] [DURATION: 29 seconds]",
    tags: ["reggae", "caribbean", "ringtone", "no intro"],
  },
  metal: {
    description:
      "[GENRES: Metal, Heavy Rock] [SOUNDS LIKE: Metallica, Avenged Sevenfold] [STYLE: Heavy, Aggressive, Intense] [MOOD: Powerful, Dark, Energetic] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Riff-based, Heavy] [INSTRUMENTATION: Metal Guitars, Double Bass Drums, Heavy Bass] [TEMPO: Fast, 140-160 BPM] [PRODUCTION: Heavy, Distorted, Powerful] [DURATION: 29 seconds]",
    tags: ["metal", "rock", "ringtone", "no intro"],
  },
  folk: {
    description:
      "[GENRES: Folk, Acoustic] [SOUNDS LIKE: Mumford & Sons, The Lumineers] [STYLE: Organic, Natural, Intimate] [MOOD: Rustic, Warm, Authentic] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Folk-progression, Acoustic] [INSTRUMENTATION: Acoustic Guitar, Banjo, Folk Percussion] [TEMPO: Medium, 100-120 BPM] [PRODUCTION: Natural, Organic, Clear] [DURATION: 29 seconds]",
    tags: ["folk", "acoustic", "ringtone", "no intro"],
  },
  latin: {
    description:
      "[GENRES: Latin, Tropical] [SOUNDS LIKE: Bad Bunny, J Balvin] [STYLE: Rhythmic, Tropical, Vibrant] [MOOD: Energetic, Dancing, Fun] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Latin-rhythm, Dance] [INSTRUMENTATION: Latin Percussion, Tropical Bass, Brass] [TEMPO: Medium-Fast, 95-105 BPM] [PRODUCTION: Rich, Warm, Dynamic] [DURATION: 29 seconds]",
    tags: ["latin", "tropical", "ringtone", "no intro"],
  },
  indie: {
    description:
      "[GENRES: Indie, Alternative] [SOUNDS LIKE: Arctic Monkeys, Tame Impala] [STYLE: Alternative, Creative, Unique] [MOOD: Dreamy, Cool, Modern] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Indie-style, Atmospheric] [INSTRUMENTATION: Indie Guitars, Synths, Alternative Drums] [TEMPO: Medium, 110-120 BPM] [PRODUCTION: Lo-fi, Textured, Artistic] [DURATION: 29 seconds]",
    tags: ["indie", "alternative", "ringtone", "no intro"],
  },
  funk: {
    description:
      "[GENRES: Funk, Groove] [SOUNDS LIKE: Anderson .Paak, Vulfpeck] [STYLE: Groovy, Funky, Dynamic] [MOOD: Fun, Energetic, Playful] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Funk-groove, Rhythmic] [INSTRUMENTATION: Funk Guitar, Bass, Drums, Horns] [TEMPO: Medium-Fast, 95-115 BPM] [PRODUCTION: Punchy, Warm, Groovy] [DURATION: 29 seconds]",
    tags: ["funk", "groove", "ringtone", "no intro"],
  },
  soul: {
    description:
      "[GENRES: Soul, R&B] [SOUNDS LIKE: Leon Bridges, John Legend] [STYLE: Soulful, Emotional, Rich] [MOOD: Heartfelt, Warm, Sincere] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Soul-progression, Melodic] [INSTRUMENTATION: Electric Piano, Soul Bass, Horns] [TEMPO: Medium, 85-95 BPM] [PRODUCTION: Warm, Rich, Vintage] [DURATION: 29 seconds]",
    tags: ["soul", "rnb", "ringtone", "no intro"],
  },
  disco: {
    description:
      "[GENRES: Disco, Dance] [SOUNDS LIKE: Dua Lipa, Doja Cat] [STYLE: Groovy, Fun, Retro] [MOOD: Uplifting, Dancing, Joyful] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Disco-groove, Dance] [INSTRUMENTATION: Disco Strings, Funky Bass, Four-on-floor] [TEMPO: Medium-Fast, 115-125 BPM] [PRODUCTION: Bright, Rich, Dynamic] [DURATION: 29 seconds]",
    tags: ["disco", "dance", "ringtone", "no intro"],
  },
  punk: {
    description:
      "[GENRES: Punk, Rock] [SOUNDS LIKE: Green Day, Blink-182] [STYLE: Fast, Raw, Energetic] [MOOD: Rebellious, Intense, Bold] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Punk-progression, Fast] [INSTRUMENTATION: Power Chords, Fast Drums, Punk Bass] [TEMPO: Fast, 160-180 BPM] [PRODUCTION: Raw, Energetic, Punchy] [DURATION: 29 seconds]",
    tags: ["punk", "rock", "ringtone", "no intro"],
  },
  gospel: {
    description:
      "[GENRES: Gospel, Spiritual] [SOUNDS LIKE: Kirk Franklin, Tye Tribbett] [STYLE: Uplifting, Powerful, Spirited] [MOOD: Joyful, Inspiring, Energetic] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Gospel-progression, Uplifting] [INSTRUMENTATION: Piano, Hammond Organ, Gospel Choir] [TEMPO: Medium, 100-120 BPM] [PRODUCTION: Rich, Full, Powerful] [DURATION: 29 seconds]",
    tags: ["gospel", "spiritual", "ringtone", "no intro"],
  },
  ambient: {
    description:
      "[GENRES: Ambient, Atmospheric] [SOUNDS LIKE: Brian Eno, Jon Hopkins] [STYLE: Atmospheric, Ethereal, Calm] [MOOD: Peaceful, Dreamy, Floating] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Ambient-texture, Floating] [INSTRUMENTATION: Synthesizers, Pads, Textures] [TEMPO: Slow, 60-80 BPM] [PRODUCTION: Spacious, Ethereal, Smooth] [DURATION: 29 seconds]",
    tags: ["ambient", "atmospheric", "ringtone", "no intro"],
  },
  "k-pop": {
    description:
      "[GENRES: K-Pop, Pop] [SOUNDS LIKE: BTS, BLACKPINK] [STYLE: Polished, Dynamic, Modern] [MOOD: Energetic, Fun, Bright] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, K-pop-style, Hook-based] [INSTRUMENTATION: Synths, K-pop Beats, Effects] [TEMPO: Fast, 120-140 BPM] [PRODUCTION: Crisp, Powerful, Clean] [DURATION: 29 seconds]",
    tags: ["kpop", "pop", "ringtone", "no intro"],
  },
  trap: {
    description:
      "[GENRES: Trap, Hip-Hop] [SOUNDS LIKE: Travis Scott, Future] [STYLE: Dark, Modern, Heavy] [MOOD: Intense, Atmospheric, Hard] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Trap-beat, Bass-heavy] [INSTRUMENTATION: 808s, Trap Hi-hats, Dark Synths] [TEMPO: Medium, 140-150 BPM] [PRODUCTION: Heavy Bass, Spacious, Dark] [DURATION: 29 seconds]",
    tags: ["trap", "hiphop", "ringtone", "no intro"],
  },
  edm: {
    description:
      "[GENRES: EDM, Dance] [SOUNDS LIKE: Martin Garrix, Avicii] [STYLE: Energetic, Big, Festival] [MOOD: Euphoric, Exciting, Powerful] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Build-drop, EDM] [INSTRUMENTATION: EDM Synths, Big Drums, Effects] [TEMPO: Fast, 128-140 BPM] [PRODUCTION: Massive, Clean, Wide] [DURATION: 29 seconds]",
    tags: ["edm", "electronic", "ringtone", "no intro"],
  },
  techno: {
    description:
      "[GENRES: Techno, Electronic] [SOUNDS LIKE: Charlotte de Witte, Amelie Lens] [STYLE: Dark, Driving, Hypnotic] [MOOD: Industrial, Raw, Underground] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Techno-groove, Pattern-based] [INSTRUMENTATION: Techno Drums, Dark Synths, Effects] [TEMPO: Fast, 130-140 BPM] [PRODUCTION: Raw, Powerful, Industrial] [DURATION: 29 seconds]",
    tags: ["techno", "electronic", "ringtone", "no intro"],
  },
  house: {
    description:
      "[GENRES: House, Dance] [SOUNDS LIKE: Disclosure, Chris Lake] [STYLE: Groovy, Rhythmic, Smooth] [MOOD: Uplifting, Energetic, Positive] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, House-groove, Four-on-floor] [INSTRUMENTATION: House Beats, Bass, Synths] [TEMPO: Medium-Fast, 120-128 BPM] [PRODUCTION: Clean, Warm, Deep] [DURATION: 29 seconds]",
    tags: ["house", "electronic", "ringtone", "no intro"],
  },
  dubstep: {
    description:
      "[GENRES: Dubstep, Bass] [SOUNDS LIKE: Skrillex, Excision] [STYLE: Heavy, Intense, Dynamic] [MOOD: Aggressive, Energetic, Dark] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Drop-focused, Bass-heavy] [INSTRUMENTATION: Wobble Bass, Heavy Drums, Effects] [TEMPO: Medium, 140-150 BPM] [PRODUCTION: Heavy, Massive, Complex] [DURATION: 29 seconds]",
    tags: ["dubstep", "electronic", "ringtone", "no intro"],
  },
  "lo-fi": {
    description:
      "[GENRES: Lo-Fi, Chill] [SOUNDS LIKE: Nujabes, J Dilla] [STYLE: Relaxed, Nostalgic, Warm] [MOOD: Calm, Dreamy, Peaceful] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Lo-fi-beats, Mellow] [INSTRUMENTATION: Lo-fi Piano, Drums, Vinyl Effects] [TEMPO: Medium-Slow, 75-85 BPM] [PRODUCTION: Lo-fi, Warm, Vintage] [DURATION: 29 seconds]",
    tags: ["lofi", "chill", "ringtone", "no intro"],
  },
  afrobeats: {
    description:
      "[GENRES: Afrobeats, African Pop] [SOUNDS LIKE: Wizkid, Burna Boy] [STYLE: Rhythmic, Energetic, Cultural] [MOOD: Happy, Dancing, Vibrant] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, African-rhythm, Dance] [INSTRUMENTATION: African Drums, Tropical Bass, Percussion] [TEMPO: Medium, 95-105 BPM] [PRODUCTION: Rich, Warm, Dynamic] [DURATION: 29 seconds]",
    tags: ["afrobeats", "african", "ringtone", "no intro"],
  },
  funny: {
    description:
      "[GENRES: Comedy, Quirky] [SOUNDS LIKE: Weird Al, Jack Black] [STYLE: Playful, Humorous, Fun] [MOOD: Silly, Light-hearted, Amusing] [VOCALS: None (Instrumental)] [ARRANGEMENT: Short loop, Comedy-style, Quirky] [INSTRUMENTATION: Funny Sounds, Cartoonish Effects, Quirky Synths] [TEMPO: Variable, 100-140 BPM] [PRODUCTION: Clear, Bright, Playful] [DURATION: 29 seconds]",
    tags: ["funny", "quirky", "ringtone", "no intro"],
  },
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
async function generateFoxAIMusic(prompt, genre = "pop") {
  console.log("Generating music with FoxAI...");
  console.log("Selected genre:", genre);

  // Get genre-specific details or fall back to pop
  const genreDetails = genrePrompts[genre.toLowerCase()] || genrePrompts.pop;
  console.log("genreDetails", genreDetails);
  try {
    const response = await axios.post(
      "https://api.foxai.me/api/v1/music/generate",
      {
        model: "foxai-v1",
        tags: genreDetails.tags,
        description: `${genreDetails.description} The song should be about${prompt}`,
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
// Add new endpoint for FoxAI generation
app.post("/generate-foxai-url", async (req, res) => {
  console.log("Starting the FoxAI generate-url workflow...");
  try {
    const { prompt, genre = "pop" } = req.body;
    console.log("Received request with prompt:", prompt);

    // Clean up the genre regardless of how it's sent
    const cleanGenre = Array.isArray(genre)
      ? genre[0].toLowerCase().replace(/[^a-z0-9]/g, "")
      : genre.toLowerCase().replace(/[^a-z0-9]/g, "");

    console.log("Cleaned genre:", cleanGenre);

    const validatedPrompt = validatePrompt(prompt);

    // Get the appropriate genre details or fall back to pop
    const genreDetails = genrePrompts[cleanGenre] || genrePrompts.pop;
    console.log(" genreDetails:", genreDetail);
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
