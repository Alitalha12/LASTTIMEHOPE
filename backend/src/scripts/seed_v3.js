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

const seedDatabase = async () => {
  console.log("🚀 Starting Professional Production Database Refactor (V3)...");

  // 1. Wipe ALL collections for a fresh start
  const collections = ["users", "providers", "providerAvailability", "bookings", "bookingTimeline", "notifications", "agentLogs", "disputes", "reviews", "serviceCategories"];
  
  for (const coll of collections) {
    const snapshot = await db.collection(coll).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`🗑️  Cleared collection: ${coll}`);
  }

  const writeBatch = db.batch();

  // 2. Seed Users
  const userId = "USR-001";
  writeBatch.set(db.collection("users").doc(userId), {
    id: userId,
    fullName: "Ahmed Khan",
    phone: "+923001112233",
    email: "ahmed@gmail.com",
    city: "Islamabad",
    preferredLanguage: "roman-urdu",
    role: "customer",
    createdAt: new Date().toISOString(),
    savedAddresses: [{ label: "Home", area: "G-13", city: "Islamabad" }]
  });

  // 3. Seed Service Categories
  services.forEach(s => {
    writeBatch.set(db.collection("serviceCategories").doc(s), {
      id: s,
      name: s.replace("_", " ").toUpperCase(),
      active: true,
      baseFee: 500
    });
  });

  // 4. Seed Providers & Availability
  const providersData = [];
  cities.forEach(city => {
    const areaList = areas[city];
    services.forEach(service => {
      for (let i = 0; i < 2; i++) { // 2 per service per city = 64 total
        const id = `PROV-${uuidv4().substring(0, 8).toUpperCase()}`;
        const area = areaList[Math.floor(Math.random() * areaList.length)];
        
        const distances = {};
        areaList.forEach(a => {
          distances[a] = a === area ? parseFloat((Math.random() * 2 + 1).toFixed(1)) : parseFloat((Math.random() * 10 + 5).toFixed(1));
        });

        const provider = {
          id,
          businessName: `${city} ${service.replace("_", " ")} Pros`,
          ownerName: `Owner ${i}`,
          phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
          city,
          area,
          service_type: service, // for legacy compatibility
          serviceCategory: service,
          rating: parseFloat((Math.random() * 0.9 + 4.0).toFixed(1)),
          totalReviews: Math.floor(Math.random() * 150 + 10),
          experienceYears: Math.floor(Math.random() * 10 + 2),
          basePrice: Math.floor(Math.random() * 1000 + 1000),
          available: true,
          isVerified: true,
          completedJobs: Math.floor(Math.random() * 300 + 50),
          distances,
          createdAt: new Date().toISOString()
        };

        writeBatch.set(db.collection("providers").doc(id), provider);

        // Seed Availability for next 3 days
        for (let day = 0; day < 3; day++) {
          const date = new Date();
          date.setDate(date.getDate() + day);
          const dateStr = date.toISOString().split('T')[0];
          const availId = `${id}-${dateStr}`;
          
          writeBatch.set(db.collection("providerAvailability").doc(availId), {
            providerId: id,
            date: dateStr,
            slots: [
              { time: "10:00 AM", available: true },
              { time: "11:00 AM", available: true },
              { time: "02:00 PM", available: true },
              { time: "04:00 PM", available: true }
            ]
          });
        }

        // 5. Seed Reviews
        const reviewId = `REV-${uuidv4().substring(0, 8).toUpperCase()}`;
        writeBatch.set(db.collection("reviews").doc(reviewId), {
          id: reviewId,
          providerId: id,
          userId: "USR-001",
          rating: 5,
          comment: "Zabardast service! Time par aye aur kaam sahi kiya.",
          createdAt: new Date().toISOString()
        });
      }
    });
  });

  await writeBatch.commit();
  console.log("✅ Successfully Seeded Normalized Production Database (V3)!");
  process.exit(0);
};

seedDatabase().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
