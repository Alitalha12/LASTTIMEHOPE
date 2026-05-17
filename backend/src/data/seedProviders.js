/**
 * Mock Provider Data Seeder — 60 providers (10 per service type)
 * Run: npm run seed
 */
require("dotenv").config();
const { initializeFirebase, getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

// ─── Location Reference Points ──────────────────────────
const LOCATIONS = {
  "G-13":      { lat: 33.6300, lng: 73.0100 },
  "F-8":       { lat: 33.7100, lng: 73.0480 },
  "I-10":      { lat: 33.6500, lng: 72.9800 },
  "G-9":       { lat: 33.6900, lng: 73.0250 },
  "Blue Area": { lat: 33.7290, lng: 73.0930 },
  "E-11":      { lat: 33.6800, lng: 73.0000 },
  "F-6":       { lat: 33.7250, lng: 73.0600 },
  "F-7":       { lat: 33.7200, lng: 73.0550 },
  "F-10":      { lat: 33.6900, lng: 73.0100 },
  "F-11":      { lat: 33.6800, lng: 72.9900 },
  "G-11":      { lat: 33.6600, lng: 72.9950 },
  "G-8":       { lat: 33.7000, lng: 73.0350 },
  "H-13":      { lat: 33.6100, lng: 73.0000 },
  "DHA Phase 2":   { lat: 33.5200, lng: 73.1000 },
  "Bahria Town":   { lat: 33.5300, lng: 73.0900 },
};

const locNames = Object.keys(LOCATIONS);

// Haversine distance (km)
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
};

// ─── Service Type Definitions ───────────────────────────
const SERVICE_TYPES = [
  {
    type: "ac_technician", label: "AC Technician",
    names: ["Ali AC Services","Cool Breeze AC","Usman Cooling","Shahzad AC & Refrigeration","Faisal AC Expert","Hassan Climate Control","Kamran AC Fix","Omer Split AC Pro","Waseem AC Solutions","Zain Cooling Works"],
    descs: ["Expert in all AC brands","Split AC specialist","Affordable AC repair","AC and refrigerator expert","Inverter AC specialist","Central AC & duct cleaning","Window & split AC repair","Same-day AC gas filling","Commercial AC maintenance","24/7 emergency AC service"],
    priceRanges: ["Rs. 1000-3000","Rs. 1500-4000","Rs. 2000-5000","Rs. 1200-3500","Rs. 1800-4500","Rs. 2500-6000","Rs. 800-2500","Rs. 1500-4000","Rs. 2000-5500","Rs. 1000-3500"],
  },
  {
    type: "plumber", label: "Plumber",
    names: ["Islamabad Plumbing Co.","Tariq Master Plumber","Nadeem Pipes & Fittings","Kashif Plumbing Works","Aslam Water Solutions","Rizwan Sanitary Expert","Farooq Pipe Master","Saleem Emergency Plumber","Ghulam Plumbing Service","Junaid Bathroom Specialist"],
    descs: ["All plumbing work","Emergency plumbing 24/7","Commercial & residential","Budget-friendly plumbing","Water tank & pump repair","Bathroom renovation expert","Pipe fitting & leakage repair","Drain cleaning specialist","Water heater installation","Toilet & shower repair"],
    priceRanges: ["Rs. 800-3000","Rs. 1000-3500","Rs. 1200-4000","Rs. 700-2500","Rs. 900-3000","Rs. 1500-5000","Rs. 600-2000","Rs. 1000-4000","Rs. 1200-3500","Rs. 800-2500"],
  },
  {
    type: "electrician", label: "Electrician",
    names: ["Zafar Electric Services","PowerFix Electricals","Bilal Wiring Expert","Imran Electrical Works","Naeem Volt Pro","Aftab Circuit Master","Sohail Smart Electric","Arshad UPS & Solar","Faraz Light Solutions","Tahir Power Systems"],
    descs: ["Certified electrician","Smart home solutions","Residential wiring","Industrial & domestic","Generator installation","Circuit breaker specialist","LED & lighting expert","UPS & solar panel setup","Electrical safety inspection","Meter & transformer work"],
    priceRanges: ["Rs. 1000-5000","Rs. 1500-6000","Rs. 800-3000","Rs. 1200-4500","Rs. 2000-7000","Rs. 900-3500","Rs. 1500-5000","Rs. 2000-8000","Rs. 1000-4000","Rs. 1200-5500"],
  },
  {
    type: "tutor", label: "Home Tutor",
    names: ["Fatima Academy Tutoring","Ahmed Math & Science","Smart Kids Tutoring","Prof. Sana Home Tutor","Ayesha English Academy","Irfan STEM Tutor","Hira Online+Home Tutor","Umar Quran & Islamiat","Mehwish Art & Design Tutor","Danish Computer Tutor"],
    descs: ["O/A Levels specialist","Math & Physics tuition","Primary school tutoring","IELTS & CSS preparation","English language coaching","Coding & robotics for kids","Flexible online + home","Quran & Islamic studies","Art, sketching & design","MS Office & programming"],
    priceRanges: ["Rs. 3000-8000/mo","Rs. 4000-10000/mo","Rs. 2500-6000/mo","Rs. 5000-12000/mo","Rs. 3000-7000/mo","Rs. 4000-9000/mo","Rs. 2000-5000/mo","Rs. 1500-4000/mo","Rs. 3000-7000/mo","Rs. 3500-8000/mo"],
  },
  {
    type: "beautician", label: "Beautician",
    names: ["Saira Beauty (Home Service)","Nadia's Beauty Service","Glamour Touch Mobile","Ayesha Bridal Studio","Rabia Mehndi Artist","Kiran Makeup Expert","Saba Hair Stylist","Zoya Skincare Pro","Alina Bridal Package","Maham Beauty At Home"],
    descs: ["Bridal & party makeup","Facial, waxing & styling","Affordable beauty services","Premium bridal services","Mehndi & henna specialist","HD & airbrush makeup","Hair coloring & treatment","Facial & skincare expert","Complete bridal package","All beauty services at home"],
    priceRanges: ["Rs. 2000-8000","Rs. 1500-6000","Rs. 1000-4000","Rs. 5000-25000","Rs. 1000-5000","Rs. 3000-10000","Rs. 1500-6000","Rs. 2000-7000","Rs. 8000-30000","Rs. 1200-5000"],
  },
  {
    type: "carpenter", label: "Carpenter",
    names: ["Hameed Furniture & Carpentry","Waqas Wood Works","Master Carpenter Arif","Rizwan Quick Fix","Akbar Custom Furniture","Sajid Door & Window Expert","Naveed Kitchen Cabinet Pro","Yousuf Office Furniture","Tanveer Wood Polishing","Shafiq Bed & Wardrobe"],
    descs: ["Custom furniture & cabinets","Bed & wardrobe specialist","Premium carpentry work","Quick repairs & installation","Made-to-order furniture","Door, window & frame work","Modular kitchen cabinets","Office desks & shelving","Wood polishing & lacquer","Bedroom furniture expert"],
    priceRanges: ["Rs. 2000-10000","Rs. 1500-8000","Rs. 3000-15000","Rs. 800-4000","Rs. 5000-20000","Rs. 1500-7000","Rs. 3000-12000","Rs. 2000-9000","Rs. 1000-5000","Rs. 2500-10000"],
  },
];

const SLOTS_POOL = [
  ["9:00 AM","10:00 AM","11:00 AM","2:00 PM","4:00 PM"],
  ["10:00 AM","12:00 PM","3:00 PM"],
  ["8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM"],
  ["9:00 AM","11:00 AM","1:00 PM","5:00 PM"],
  ["10:00 AM","1:00 PM","4:00 PM"],
  ["3:00 PM","4:00 PM","5:00 PM","6:00 PM"],
  ["9:00 AM","12:00 PM","3:00 PM","5:00 PM"],
  ["8:00 AM","11:00 AM","2:00 PM","5:00 PM"],
  ["10:00 AM","2:00 PM","4:00 PM","6:00 PM"],
  ["9:00 AM","11:00 AM","2:00 PM","4:00 PM"],
];

const LANG_POOL = [
  ["Urdu","English"],["Urdu"],["Urdu","English","Punjabi"],
  ["Urdu","Pashto"],["Urdu","English"],["Urdu","Punjabi"],
  ["Urdu","English"],["Urdu"],["Urdu","English","Pashto"],["Urdu","Punjabi","English"],
];

// ─── Build All 60 Providers ─────────────────────────────
const buildProviders = () => {
  const all = [];
  SERVICE_TYPES.forEach((svc) => {
    svc.names.forEach((name, i) => {
      const loc = locNames[i % locNames.length];
      const coords = LOCATIONS[loc];
      // Slight randomization around center
      const lat = coords.lat + (Math.random() - 0.5) * 0.005;
      const lng = coords.lng + (Math.random() - 0.5) * 0.005;
      const rating = +(3.8 + Math.random() * 1.2).toFixed(1); // 3.8 - 5.0
      const available = i !== 3 && i !== 9; // 2 per type unavailable
      const expYears = Math.floor(3 + Math.random() * 17);

      // Pre-calculate distances to all locations
      const distances = {};
      for (const [l, c] of Object.entries(LOCATIONS)) {
        distances[l] = haversine(lat, lng, c.lat, c.lng);
      }

      all.push({
        name,
        service_type: svc.type,
        service_label: svc.label,
        location: loc,
        latitude: +lat.toFixed(4),
        longitude: +lng.toFixed(4),
        rating,
        total_reviews: Math.floor(20 + Math.random() * 230),
        phone: `+92-3${String(Math.floor(Math.random()*100)).padStart(2,'0')}-${String(Math.floor(Math.random()*10000000)).padStart(7,'0')}`,
        price_range: svc.priceRanges[i],
        available,
        availability_slots: available ? SLOTS_POOL[i] : [],
        languages: LANG_POOL[i],
        experience_years: expYears,
        description: svc.descs[i],
        distances,
      });
    });
  });
  return all;
};

// ─── Clear + Seed ───────────────────────────────────────
const seedProviders = async () => {
  try {
    logger.info("Initializing Firebase...");
    initializeFirebase();
    const db = getDb();
    if (!db) { logger.error("Firebase not initialized"); process.exit(1); }

    // Delete existing providers first
    logger.info("Clearing existing providers...");
    const existing = await db.collection("providers").get();
    const deleteBatch = db.batch();
    existing.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    logger.success(`Deleted ${existing.size} old providers`);

    // Seed new providers
    const providers = buildProviders();
    logger.info(`Seeding ${providers.length} providers...`);

    // Firestore batch limit is 500, we have 60 so one batch is fine
    const batch = db.batch();
    providers.forEach((p, i) => {
      const id = uuidv4();
      const docRef = db.collection("providers").doc(id);
      batch.set(docRef, {
        ...p, id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logger.info(`  [${i+1}/${providers.length}] ${p.name} (${p.service_type}) → ${p.location}`);
    });

    await batch.commit();

    // Print summary
    const summary = {};
    providers.forEach((p) => {
      summary[p.service_label] = (summary[p.service_label] || 0) + 1;
    });
    logger.success(`✅ Seeded ${providers.length} providers!`);
    Object.entries(summary).forEach(([k,v]) => logger.info(`  • ${k}: ${v}`));
    logger.info(`  • Locations: ${locNames.join(", ")}`);

    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed", error);
    process.exit(1);
  }
};

seedProviders();
