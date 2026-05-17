const { getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const db = getDb();

const cities = ["Islamabad", "Rawalpindi", "Lahore", "Karachi"];
const services = [
  "ac_technician",
  "electrician",
  "plumber",
  "beautician",
  "tutor",
  "cleaner",
  "carpenter",
  "mechanic"
];

const areas = {
  Islamabad: ["G-13", "F-10", "F-11", "G-11", "I-8", "DHA", "Bahria"],
  Rawalpindi: ["Saddar", "Bahria Phase 7", "Satellite Town", "Westridge"],
  Lahore: ["DHA", "Johar Town", "Model Town", "Gulberg", "Bahria"],
  Karachi: ["Clifton", "Defence", "Gulshan", "North Nazimabad"]
};

const providersData = [];

// Generate 128 Providers (4 of each service per city)
cities.forEach(city => {
  const areaList = areas[city];
  services.forEach(service => {
    for (let i = 0; i < 4; i++) {
      const area = areaList[Math.floor(Math.random() * areaList.length)];
      const id = uuidv4();
      
      const distances = {};
      areaList.forEach(a => {
        distances[a] = a === area ? parseFloat((Math.random() * 2 + 1).toFixed(1)) : parseFloat((Math.random() * 10 + 5).toFixed(1));
      });

      providersData.push({
        id,
        name: `${city} Professional ${service.replace("_", " ")} ${i}`,
        service_type: service,
        city,
        area,
        rating: parseFloat((Math.random() * 0.9 + 4.0).toFixed(1)),
        completedJobs: Math.floor(Math.random() * 200 + 20),
        available: true,
        price_range: `${Math.floor(Math.random() * 1000 + 500)}-${Math.floor(Math.random() * 2000 + 2000)}`,
        phone: `+92-300-${Math.floor(1000000 + Math.random() * 9000000)}`,
        bio: `Top rated ${service.replace("_", " ")} serving ${area}, ${city}.`,
        distances,
        availability_slots: ["10:00 AM", "2:00 PM", "6:00 PM"],
        createdAt: new Date().toISOString()
      });
    }
  });
});

const seedDatabase = async () => {
  console.log("🚀 Starting Production Database Seed...");
  
  // Wipe existing providers (Optional but recommended for consistency)
  const snapshot = await db.collection("providers").get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log("🗑️  Cleared old provider data.");

  // Batch write new providers
  const writeBatch = db.batch();
  providersData.forEach(p => {
    const ref = db.collection("providers").doc(p.id);
    writeBatch.set(ref, p);
  });
  
  await writeBatch.commit();
  console.log(`✅ Successfully seeded ${providersData.length} providers across ${cities.length} cities!`);
  process.exit(0);
};

seedDatabase().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
