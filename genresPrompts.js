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

module.exports = genrePrompts;
