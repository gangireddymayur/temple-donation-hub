export type ReligionType = 
  | 'hinduism' 
  | 'islam' 
  | 'christianity' 
  | 'sikhism' 
  | 'jainism' 
  | 'buddhism' 
  | 'judaism' 
  | 'universal';

export interface DonationPresetItem {
  id: string;
  name: string;
  amount: number;
  description: string;
  iconName?: string;
  isPopular?: boolean;
}

export interface ReligionConfig {
  id: ReligionType;
  name: string;
  shortName: string;
  symbol: string;
  tagline: string;
  greeting: string;
  accentColor: string;
  gradient: string;
  bgGradient: string;
  badgeClass: string;
  borderClass: string;
  terminology: {
    institutionType: string; // e.g. "Temple / Mandir", "Masjid / Mosque", "Church"
    devoteeName: string; // e.g. "Devotee", "Donor", "Parishioner", "Sangat"
    donationName: string; // e.g. "Daan / Samarpan", "Zakat / Sadaqah", "Tithe / Offertory"
    prayerLabel: string; // e.g. "Sankalpam / Puja Prayer", "Dua / Niyyah", "Prayer Intention"
    familyDetailsLabel: string; // e.g. "Gotra & Nakshatra", "Family / Beneficiary", "Family Name"
    kioskGreeting: string;
  };
  presetCauses: DonationPresetItem[];
  templateThemes: {
    modern: { header: string; subheader: string; bgStyle: string; accent: string };
    traditional: { header: string; subheader: string; bgStyle: string; accent: string };
    glass: { header: string; subheader: string; bgStyle: string; accent: string };
    divine: { header: string; subheader: string; bgStyle: string; accent: string };
    minimal: { header: string; subheader: string; bgStyle: string; accent: string };
  };
}

export const RELIGION_CONFIGS: Record<ReligionType, ReligionConfig> = {
  hinduism: {
    id: 'hinduism',
    name: 'Hinduism / Sanatana Dharma',
    shortName: 'Hindu',
    symbol: '🕉️',
    tagline: 'Devasthan Seva & Dharmic Daan',
    greeting: 'Namaste & Hari Om 🙏',
    accentColor: '#f97316',
    gradient: 'from-orange-500 via-amber-500 to-red-500',
    bgGradient: 'from-orange-950/40 via-amber-950/20 to-slate-950',
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
    terminology: {
      institutionType: 'Temple / Devasthanam / Mandir',
      devoteeName: 'Devotee / Bhakt',
      donationName: 'Daan / Seva Samarpan',
      prayerLabel: 'Sankalpam / Archana Prayer',
      familyDetailsLabel: 'Gotra & Nakshatra',
      kioskGreeting: 'Welcome Devotee 🙏 May Divine Grace Bless You',
    },
    presetCauses: [
      { id: 'h1', name: 'Nitya Anna Prasadam', amount: 501, description: 'Feed devotees with sacred prasadam', isPopular: true },
      { id: 'h2', name: 'Kalyanotsavam Seva', amount: 1001, description: 'Sponsor the divine celestial wedding ceremony', isPopular: true },
      { id: 'h3', name: 'Nitya Archana & Deepam', amount: 101, description: 'Daily sacred lamp offering & puja', isPopular: false },
      { id: 'h4', name: 'Hundi Samarpan', amount: 251, description: 'General temple development offering', isPopular: false },
      { id: 'h5', name: 'Veda Pathasala Vidya Daan', amount: 2100, description: 'Sponsor Vedic education for students', isPopular: false },
      { id: 'h6', name: 'Navaratri / Festival Mahotsav', amount: 5001, description: 'Grand festival celebration & abhishekam', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Sri Venkateswara Temple', subheader: 'Digital Daan & Seva Kiosk', bgStyle: 'from-orange-950 via-slate-900 to-black', accent: '#f97316' },
      traditional: { header: 'Sri Maha Ganapathi Devasthanam', subheader: 'Nitya Seva Samarpan', bgStyle: 'from-amber-950 via-red-950 to-slate-950', accent: '#ea580c' },
      glass: { header: 'Divine Darshan & Daan', subheader: 'Touch to Offer Seva', bgStyle: 'from-orange-900/60 to-black/80', accent: '#fbbf24' },
      divine: { header: 'Sri Lakshmi Narasimha Swamy', subheader: 'Prasadam & Temple Renovation Fund', bgStyle: 'from-yellow-950 via-orange-950 to-black', accent: '#f59e0b' },
      minimal: { header: 'Temple Daan Kiosk', subheader: 'Quick & Secure UPI Offering', bgStyle: 'from-slate-900 to-black', accent: '#fb923c' },
    },
  },

  islam: {
    id: 'islam',
    name: 'Islam / Islamic Center',
    shortName: 'Islam',
    symbol: '☪️',
    tagline: 'Zakat, Sadaqah & Masjid Community Welfare',
    greeting: 'Assalamu Alaikum wa Rahmatullah 🤲',
    accentColor: '#10b981',
    gradient: 'from-emerald-500 via-teal-500 to-green-600',
    bgGradient: 'from-emerald-950/40 via-teal-950/20 to-slate-950',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    terminology: {
      institutionType: 'Masjid / Mosque / Islamic Center',
      devoteeName: 'Brother / Sister / Donor',
      donationName: 'Zakat / Sadaqah / Donation',
      prayerLabel: 'Dua / Niyyah Intention',
      familyDetailsLabel: 'Family / Beneficiary Name',
      kioskGreeting: 'Ahlan wa Sahlan 🤲 In the Name of Allah',
    },
    presetCauses: [
      { id: 'i1', name: 'Zakat-ul-Maal (Purification)', amount: 2500, description: 'Obligatory annual charitable contribution', isPopular: true },
      { id: 'i2', name: 'Sadaqah Jariyah (Ongoing Charity)', amount: 500, description: 'Continuous charity benefiting the community', isPopular: true },
      { id: 'i3', name: 'Fitrana / Ramadan Food Basket', amount: 150, description: 'Food aid for needy families during Ramadan', isPopular: false },
      { id: 'i4', name: 'Masjid Expansion & Renovation', amount: 5000, description: 'Infrastructure and prayer hall maintenance', isPopular: true },
      { id: 'i5', name: 'Madrasa Quranic Education', amount: 1000, description: 'Support Islamic education & student books', isPopular: false },
      { id: 'i6', name: 'Friday Jummah Collection', amount: 250, description: 'General maintenance & utilities fund', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Grand Central Masjid', subheader: 'Digital Sadaqah & Zakat Kiosk', bgStyle: 'from-emerald-950 via-slate-900 to-black', accent: '#10b981' },
      traditional: { header: 'Masjid Al-Noor Islamic Center', subheader: 'Support Your Community & Madrasa', bgStyle: 'from-green-950 via-teal-950 to-slate-950', accent: '#059669' },
      glass: { header: 'Sadaqah & Community Fund', subheader: 'Touch to Give for the Sake of Allah', bgStyle: 'from-emerald-900/60 to-black/80', accent: '#34d399' },
      divine: { header: 'Masjid Expansion Project', subheader: 'Building Future Generations', bgStyle: 'from-teal-950 via-emerald-950 to-black', accent: '#6ee7b7' },
      minimal: { header: 'Masjid Donation Kiosk', subheader: 'Instant & Direct UPI Contribution', bgStyle: 'from-slate-900 to-black', accent: '#10b981' },
    },
  },

  christianity: {
    id: 'christianity',
    name: 'Christianity / Church & Parish',
    shortName: 'Christian',
    symbol: '✝️',
    tagline: 'Tithes, Offertory & Christian Charity',
    greeting: 'Grace & Peace to You in Christ 🕊️',
    accentColor: '#6366f1',
    gradient: 'from-indigo-500 via-purple-500 to-sky-500',
    bgGradient: 'from-indigo-950/40 via-purple-950/20 to-slate-950',
    badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    borderClass: 'border-indigo-500/40 hover:border-indigo-400',
    terminology: {
      institutionType: 'Church / Cathedral / Parish',
      devoteeName: 'Parishioner / Congregation Member',
      donationName: 'Tithe / Sunday Offertory',
      prayerLabel: 'Prayer Request / Thanksgiving',
      familyDetailsLabel: 'Family / Household Name',
      kioskGreeting: 'Welcome to the House of the Lord 🕊️',
    },
    presetCauses: [
      { id: 'c1', name: 'Sunday Offertory & Tithe (10%)', amount: 1000, description: 'Giving back in gratitude for God’s blessings', isPopular: true },
      { id: 'c2', name: 'Building & Sanctuary Fund', amount: 2500, description: 'Church renovations & audiovisual gear', isPopular: true },
      { id: 'c3', name: 'Community Outreach & Poor Relief', amount: 500, description: 'Feeding & supporting needy families in the neighborhood', isPopular: false },
      { id: 'c4', name: 'Sunday School & Youth Ministry', amount: 350, description: 'Materials & camps for children & youth', isPopular: false },
      { id: 'c5', name: 'Christmas / Easter Festive Feast', amount: 1500, description: 'Festive hamper distribution to the underprivileged', isPopular: false },
      { id: 'c6', name: 'Missionary Support Fund', amount: 2000, description: 'Support global & local mission workers', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Grace Cathedral & Parish', subheader: 'Digital Giving & Sunday Offertory', bgStyle: 'from-indigo-950 via-slate-900 to-black', accent: '#6366f1' },
      traditional: { header: 'St. Mary’s Church', subheader: 'Tithe & Sanctuary Beautification', bgStyle: 'from-purple-950 via-indigo-950 to-slate-950', accent: '#8b5cf6' },
      glass: { header: 'Generous Giving Kiosk', subheader: 'Honor the Lord With Your Wealth', bgStyle: 'from-indigo-900/60 to-black/80', accent: '#818cf8' },
      divine: { header: 'Christ the King Fellowship', subheader: 'Missions & Community Outreach', bgStyle: 'from-blue-950 via-indigo-950 to-black', accent: '#a5b4fc' },
      minimal: { header: 'Church Offertory Kiosk', subheader: 'Quick & Touchless Digital Giving', bgStyle: 'from-slate-900 to-black', accent: '#6366f1' },
    },
  },

  sikhism: {
    id: 'sikhism',
    name: 'Sikhism / Gurdwara Sahib',
    shortName: 'Sikh',
    symbol: '☬',
    tagline: 'Dasvandh, Langar Seva & Gurmat Prachar',
    greeting: 'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh ☬',
    accentColor: '#ea580c',
    gradient: 'from-amber-500 via-orange-500 to-blue-600',
    bgGradient: 'from-amber-950/40 via-orange-950/20 to-slate-950',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
    terminology: {
      institutionType: 'Gurdwara Sahib / Sikh Center',
      devoteeName: 'Sangat / Gursikh',
      donationName: 'Dasvandh / Seva Bheta',
      prayerLabel: 'Ardas Request / Hukamnama',
      familyDetailsLabel: 'Family / Pind Name',
      kioskGreeting: 'Satnam Sri Waheguru ☬ Welcome to Gurdwara Sahib',
    },
    presetCauses: [
      { id: 's1', name: 'Guru Ka Langar Seva', amount: 1100, description: 'Free communal kitchen feeding all without distinction', isPopular: true },
      { id: 's2', name: 'Dasvandh (Tenth of Earnings)', amount: 2100, description: 'Selfless contribution for community advancement', isPopular: true },
      { id: 's3', name: 'Karah Parshad Seva', amount: 250, description: 'Sacred deg offering in holy presence', isPopular: false },
      { id: 's4', name: 'Akhand Path Sahib Seva', amount: 5100, description: 'Continuous unbroken reading of Guru Granth Sahib', isPopular: true },
      { id: 's5', name: 'Gurpurab Mahotsav Seva', amount: 3100, description: 'Celebration of Guru Sahib Prakash Purab', isPopular: false },
      { id: 's6', name: 'Gurmat Vidya & Hospital Seva', amount: 2500, description: 'Education for children & free healthcare clinics', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Gurdwara Sri Guru Nanak Darbar', subheader: 'Digital Dasvandh & Langar Kiosk', bgStyle: 'from-amber-950 via-slate-900 to-black', accent: '#f59e0b' },
      traditional: { header: 'Gurdwara Sahib', subheader: 'Nishan Sahib & Akhand Path Seva', bgStyle: 'from-orange-950 via-amber-950 to-slate-950', accent: '#ea580c' },
      glass: { header: 'Waheguru Seva Portal', subheader: 'Touch to Contribute Dasvandh', bgStyle: 'from-amber-900/60 to-black/80', accent: '#fbbf24' },
      divine: { header: 'Guru Ka Langar & Hospital Seva', subheader: 'Sarbat Da Bhala (Blessings for All)', bgStyle: 'from-blue-950 via-amber-950 to-black', accent: '#60a5fa' },
      minimal: { header: 'Gurdwara Donation Kiosk', subheader: 'Instant & Direct UPI Seva Offering', bgStyle: 'from-slate-900 to-black', accent: '#f59e0b' },
    },
  },

  jainism: {
    id: 'jainism',
    name: 'Jainism / Derasar & Tirth',
    shortName: 'Jain',
    symbol: '🕊️',
    tagline: 'Ahimsa, Jivdaya & Gyan Daan',
    greeting: 'Jai Jinendra & Michhami Dukkadam 🕊️',
    accentColor: '#eab308',
    gradient: 'from-yellow-400 via-amber-500 to-orange-400',
    bgGradient: 'from-yellow-950/30 via-slate-900 to-slate-950',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    borderClass: 'border-yellow-500/40 hover:border-yellow-300',
    terminology: {
      institutionType: 'Jain Derasar / Tirth / Sthanak',
      devoteeName: 'Shravak / Shravika',
      donationName: 'Jivdaya / Dev-Dravya Daan',
      prayerLabel: 'Bhavna / Navkar Sankalp',
      familyDetailsLabel: 'Family / Parivar Name',
      kioskGreeting: 'Jai Jinendra 🙏 Parasparopagraho Jivanam',
    },
    presetCauses: [
      { id: 'j1', name: 'Jivdaya & Panjrapole (Animal Shelter)', amount: 1000, description: 'Feeding and medical rescue for voiceless animals', isPopular: true },
      { id: 'j2', name: 'Gyan Daan (Sacred Scripture & Vidya)', amount: 500, description: 'Preservation of ancient manuscripts & child education', isPopular: false },
      { id: 'j3', name: 'Sadhu-Sadhvi Vaiyavach (Monk Care)', amount: 2100, description: 'Medical, vihar & essentials care for Jain ascetics', isPopular: true },
      { id: 'j4', name: 'Derasar Jirnoddhar & Pooja Dravya', amount: 5001, description: 'Temple maintenance, kesar, flowers and aarti', isPopular: false },
      { id: 'j5', name: 'Paryushan Mahaparva Anukampa', amount: 2500, description: 'Forgiveness feast & charity to the needy', isPopular: true },
      { id: 'j6', name: 'Ayambil & Tapasya Sponsorship', amount: 1100, description: 'Support community fasting and ascetic austerity', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Sri Parshwanath Jain Derasar', subheader: 'Jivdaya & Dev-Dravya Digital Kiosk', bgStyle: 'from-yellow-950 via-slate-900 to-black', accent: '#eab308' },
      traditional: { header: 'Sri Mahavira Jain Tirth', subheader: 'Gyan Daan & Sadhu Vaiyavach', bgStyle: 'from-amber-950 via-yellow-950 to-slate-950', accent: '#ca8a04' },
      glass: { header: 'Ahimsa & Jivdaya Portal', subheader: 'Contribute for Compassion to All Living Beings', bgStyle: 'from-yellow-900/60 to-black/80', accent: '#fde047' },
      divine: { header: 'Navkar Mahamantra Seva', subheader: 'Universal Peace & Forgiveness', bgStyle: 'from-slate-900 via-amber-950 to-black', accent: '#facc15' },
      minimal: { header: 'Jain Derasar Kiosk', subheader: 'Instant & Direct UPI Daan', bgStyle: 'from-slate-900 to-black', accent: '#eab308' },
    },
  },

  buddhism: {
    id: 'buddhism',
    name: 'Buddhism / Monastery & Pagoda',
    shortName: 'Buddhist',
    symbol: '☸️',
    tagline: 'Sangha Dāna, Compassion & Dharma Propagation',
    greeting: 'Namo Buddhaya & Metta Blessings ☸️',
    accentColor: '#d97706',
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    bgGradient: 'from-amber-950/40 via-red-950/20 to-slate-950',
    badgeClass: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    borderClass: 'border-amber-600/40 hover:border-amber-400',
    terminology: {
      institutionType: 'Monastery / Pagoda / Vihara',
      devoteeName: 'Upasaka / Upasika / Pilgrim',
      donationName: 'Sangha Dāna / Merit Making',
      prayerLabel: 'Metta Blessing / Merit Dedication',
      familyDetailsLabel: 'Family / Benefactor Name',
      kioskGreeting: 'Welcome in Dhamma ☸️ May All Beings Be Peaceful',
    },
    presetCauses: [
      { id: 'b1', name: 'Sangha Dāna (Monks Meals & Alms)', amount: 1000, description: 'Providing daily meals and nutritional care to resident monks', isPopular: true },
      { id: 'b2', name: 'Kathina Robe & Essentials Offering', amount: 2500, description: 'Monk robes, medicine and monastery requisites', isPopular: true },
      { id: 'b3', name: 'Vihara & Pagoda Restoration', amount: 5000, description: 'Preserving Buddhist stupas, halls and relics', isPopular: false },
      { id: 'b4', name: 'Dhamma Books & Meditation Retreat', amount: 500, description: 'Free distribution of teachings and meditation guidance', isPopular: false },
      { id: 'b5', name: 'Vesak / Buddha Purnima Celebration', amount: 1500, description: 'Lighting lamps and feeding visitors on Vesak', isPopular: false },
      { id: 'b6', name: 'Bodhi Tree & Meditation Garden', amount: 2000, description: 'Sanctuary maintenance for peaceful contemplation', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Dharma Wisdom Monastery', subheader: 'Digital Dāna & Merit Offering Kiosk', bgStyle: 'from-amber-950 via-slate-900 to-black', accent: '#d97706' },
      traditional: { header: 'Peace Pagoda & Mahavihara', subheader: 'Sangha Dāna & Buddhist Relic Fund', bgStyle: 'from-red-950 via-amber-950 to-slate-950', accent: '#b45309' },
      glass: { header: 'Merit Making & Meditation Portal', subheader: 'Offer Compassion & Support the Sangha', bgStyle: 'from-amber-900/60 to-black/80', accent: '#f59e0b' },
      divine: { header: 'Eightfold Path Sanctuary', subheader: 'Cultivating Peace for All Beings', bgStyle: 'from-slate-900 via-amber-950 to-black', accent: '#fbbf24' },
      minimal: { header: 'Monastery Dāna Kiosk', subheader: 'Direct & Simple UPI Offering', bgStyle: 'from-slate-900 to-black', accent: '#d97706' },
    },
  },

  judaism: {
    id: 'judaism',
    name: 'Judaism / Synagogue & Shul',
    shortName: 'Jewish',
    symbol: '✡️',
    tagline: 'Tzedakah, Torah & Community Life',
    greeting: 'Shalom & Chag Sameach ✡️',
    accentColor: '#3b82f6',
    gradient: 'from-blue-500 via-cyan-500 to-indigo-600',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    borderClass: 'border-blue-500/40 hover:border-blue-400',
    terminology: {
      institutionType: 'Synagogue / Shul / Congregation',
      devoteeName: 'Congregant / Supporter',
      donationName: 'Tzedakah / Synagogue Offering',
      prayerLabel: 'Mitzvah Dedication / Mi Sheberach',
      familyDetailsLabel: 'Family / Hebrew Name',
      kioskGreeting: 'Baruch Haba ✡️ Welcome to the Synagogue',
    },
    presetCauses: [
      { id: 'jd1', name: 'Chai Life Fund (₹1800 Multiples)', amount: 1800, description: 'Traditional celebration of life, health and happiness', isPopular: true },
      { id: 'jd2', name: 'General Tzedakah & Charity', amount: 500, description: 'Support families experiencing acute financial distress', isPopular: true },
      { id: 'jd3', name: 'Torah Scroll & Sanctuary Maintenance', amount: 3600, description: 'Care of holy scrolls, prayer books and bimah', isPopular: false },
      { id: 'jd4', name: 'Shabbat Community Kiddush Sponsor', amount: 2500, description: 'Sponsor the festive food and wine fellowship', isPopular: false },
      { id: 'jd5', name: 'High Holidays Yizkor & Appeal', amount: 5400, description: 'Honor memories of loved ones with righteous giving', isPopular: false },
      { id: 'jd6', name: 'Youth Hebrew Education & Camp', amount: 1500, description: 'Children’s Jewish heritage learning program', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Congregation Beth Shalom', subheader: 'Digital Tzedakah & Sanctuary Giving', bgStyle: 'from-blue-950 via-slate-900 to-black', accent: '#3b82f6' },
      traditional: { header: 'Central Shul & Heritage Center', subheader: 'Torah Fund & Community Care', bgStyle: 'from-indigo-950 via-blue-950 to-slate-950', accent: '#2563eb' },
      glass: { header: 'Tzedakah Portal', subheader: 'Righteousness, Charity & Kindness', bgStyle: 'from-blue-900/60 to-black/80', accent: '#60a5fa' },
      divine: { header: 'Chai Fellowship Kiosk', subheader: 'Building a Stronger Community Together', bgStyle: 'from-slate-900 via-blue-950 to-black', accent: '#93c5fd' },
      minimal: { header: 'Synagogue Giving Kiosk', subheader: 'Secure Digital Tzedakah Offering', bgStyle: 'from-slate-900 to-black', accent: '#3b82f6' },
    },
  },

  universal: {
    id: 'universal',
    name: 'Universal / Multi-Faith & Charitable Trust',
    shortName: 'General',
    symbol: '🏛️',
    tagline: 'Community Welfare, Education & Healthcare Aid',
    greeting: 'Welcome & Thank You for Your Generosity 🤝',
    accentColor: '#06b6d4',
    gradient: 'from-cyan-500 via-teal-500 to-indigo-500',
    bgGradient: 'from-cyan-950/40 via-teal-950/20 to-slate-950',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    borderClass: 'border-cyan-500/40 hover:border-cyan-400',
    terminology: {
      institutionType: 'Trust / Foundation / NGO',
      devoteeName: 'Donor / Supporter / Well-Wisher',
      donationName: 'Donation / Contribution',
      prayerLabel: 'Special Dedication / Note',
      familyDetailsLabel: 'Donor / Organization Name',
      kioskGreeting: 'Welcome 🤝 Together We Make a Difference',
    },
    presetCauses: [
      { id: 'u1', name: 'Community Meals & Nutrition Drive', amount: 500, description: 'Provide wholesome meals to undernourished children', isPopular: true },
      { id: 'u2', name: 'Child Education & School Kit Fund', amount: 1500, description: 'Notebooks, uniforms and school fees for rural kids', isPopular: true },
      { id: 'u3', name: 'Healthcare & Emergency Patient Aid', amount: 3000, description: 'Medical checkups, dialysis aid and emergency medicine', isPopular: true },
      { id: 'u4', name: 'Disaster Relief & Rehabilitation', amount: 2000, description: 'Immediate disaster response and relief supply kits', isPopular: false },
      { id: 'u5', name: 'Senior Citizen Care & Shelter', amount: 1000, description: 'Care and support for destitute elderly citizens', isPopular: false },
      { id: 'u6', name: 'Heritage & Environmental Conservation', amount: 2500, description: 'Tree planting, clean water and cultural preservation', isPopular: false },
    ],
    templateThemes: {
      modern: { header: 'Universal Charity Trust', subheader: 'Digital Donation & Impact Kiosk', bgStyle: 'from-cyan-950 via-slate-900 to-black', accent: '#06b6d4' },
      traditional: { header: 'Community Welfare Foundation', subheader: 'Transparent & Direct Beneficiary Support', bgStyle: 'from-teal-950 via-cyan-950 to-slate-950', accent: '#0891b2' },
      glass: { header: 'Giving Hope Portal', subheader: 'Every Contribution Changes a Life', bgStyle: 'from-cyan-900/60 to-black/80', accent: '#22d3ee' },
      divine: { header: 'Compassion in Action', subheader: 'Empowering Communities, Sustaining Hope', bgStyle: 'from-slate-900 via-teal-950 to-black', accent: '#67e8f9' },
      minimal: { header: 'Direct Giving Kiosk', subheader: 'Instant & Direct UPI Contribution', bgStyle: 'from-slate-900 to-black', accent: '#06b6d4' },
    },
  },
};

export function getReligionConfig(religion?: string | null): ReligionConfig {
  if (!religion) return RELIGION_CONFIGS.hinduism;
  const key = religion.toLowerCase().trim() as ReligionType;
  return RELIGION_CONFIGS[key] || RELIGION_CONFIGS.hinduism;
}

export const ALL_RELIGIONS: ReligionConfig[] = Object.values(RELIGION_CONFIGS);
