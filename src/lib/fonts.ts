export interface FontOption {
  name: string;
  family: string;
  category: 'Indian & Temple' | 'Modern Sans' | 'Classic Serif' | 'Display';
}

export const SUPPORTED_FONTS: FontOption[] = [
  // Indian & Temple Scripts
  { name: 'Rozha One (Temple Headline)', family: "'Rozha One', serif", category: 'Indian & Temple' },
  { name: 'Yatra One (Devanagari Classic)', family: "'Yatra One', cursive", category: 'Indian & Temple' },
  { name: 'Cinzel (Divine Vedic Style)', family: "'Cinzel', Georgia, serif", category: 'Indian & Temple' },
  { name: 'Gotu (Calligraphic)', family: "'Gotu', sans-serif", category: 'Indian & Temple' },
  { name: 'Noto Sans Devanagari (Hindi/Sanskrit)', family: "'Noto Sans Devanagari', sans-serif", category: 'Indian & Temple' },
  { name: 'Mukta (Clean Devanagari)', family: "'Mukta', sans-serif", category: 'Indian & Temple' },
  { name: 'Noto Sans Gujarati (ગુજરાતી)', family: "'Noto Sans Gujarati', sans-serif", category: 'Indian & Temple' },
  { name: 'Noto Serif Tamil (தமிழ்)', family: "'Noto Serif Tamil', serif", category: 'Indian & Temple' },
  { name: 'Noto Sans Telugu (తెలుగు)', family: "'Noto Sans Telugu', sans-serif", category: 'Indian & Temple' },
  { name: 'Noto Sans Kannada (ಕನ್ನಡ)', family: "'Noto Sans Kannada', sans-serif", category: 'Indian & Temple' },
  { name: 'Noto Serif Bengali (বাংলা)', family: "'Noto Serif Bengali', serif", category: 'Indian & Temple' },

  // Modern Sans
  { name: 'Outfit (Modern Premium)', family: "'Outfit', sans-serif", category: 'Modern Sans' },
  { name: 'Poppins (Bold Geometric)', family: "'Poppins', sans-serif", category: 'Modern Sans' },
  { name: 'Inter (Clean Standard)', family: "'Inter', sans-serif", category: 'Modern Sans' },
  { name: 'Montserrat (Modern Bold)', family: "'Montserrat', sans-serif", category: 'Modern Sans' },
  { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Modern Sans' },
  { name: 'Urbanist (Ultra Modern)', family: "'Urbanist', sans-serif", category: 'Modern Sans' },
  { name: 'Roboto', family: "'Roboto', sans-serif", category: 'Modern Sans' },

  // Classic Serif
  { name: 'Playfair Display (Royal Serif)', family: "'Playfair Display', Georgia, serif", category: 'Classic Serif' },
  { name: 'Cormorant Garamond (Elegance)', family: "'Cormorant Garamond', Georgia, serif", category: 'Classic Serif' },
  { name: 'Georgia (Standard Serif)', family: "Georgia, serif", category: 'Classic Serif' },

  // Display
  { name: 'Rajdhani (Tech & Display)', family: "'Rajdhani', sans-serif", category: 'Display' },
];
