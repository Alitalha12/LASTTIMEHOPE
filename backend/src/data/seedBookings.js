/**
 * Mock Bookings Data Seeder
 * Seeds realistic bookings for provider accounts in Firestore
 * Run: node src/data/seedBookings.js
 */
require("dotenv").config();
const { initializeFirebase, getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const seedBookings = async () => {
  try {
    logger.info("Initializing Firebase...");
    initializeFirebase();
    const db = getDb();
    if (!db) {
      logger.error("Firebase not initialized");
      process.exit(1);
    }

    // 1. Get or create a default Service Provider user
    logger.info("Checking for registered provider users...");
    const providersSnapshot = await db.collection("users").where("role", "==", "provider").get();
    
    let providerId;
    let providerName = "Expert Provider";

    if (providersSnapshot.empty) {
      logger.info("No provider user found. Creating a default provider account: expert@gmail.com / 123456");
      providerId = "default_provider_uid_12345";
      providerName = "Ali AC Services Expert";

      // Seed provider user
      await db.collection("users").doc(providerId).set({
        id: providerId,
        uid: providerId,
        fullName: providerName,
        username: "expert_ali",
        phoneNumber: "+92 311-1234567",
        role: "provider",
        profileImage: "https://ui-avatars.com/api/?name=Ali+AC+Expert&background=3B82F6&color=fff",
        isPhoneVerified: true,
        status: "active",
        walletBalance: 12500.0,
        escrowLockedBalance: 5000.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      });

      // Seed matching provider location details
      await db.collection("user_profiles").doc(providerId).set({
        userId: providerId,
        currentLocation: {
          city: "Islamabad",
          area: "G-13",
          lat: 33.6300,
          lng: 73.0100,
          source: "gps",
          updatedAt: new Date().toISOString()
        },
        addresses: [
          {
            label: "HQ Workshop",
            city: "Islamabad",
            area: "G-13",
            lat: 33.6300,
            lng: 73.0100,
            isDefault: true
          }
        ],
        gpsHistory: []
      });

      // Seed matching settings details
      await db.collection("user_settings").doc(providerId).set({
        userId: providerId,
        preferredLanguage: "roman_urdu",
        communicationPreference: { push: true, whatsapp: true, sms: false },
        notifications: { enabled: true, bookingReminders: true, promotions: false },
        updatedAt: new Date().toISOString()
      });
      
      logger.success("Default provider account seeded successfully.");
    } else {
      const firstDoc = providersSnapshot.docs[0];
      providerId = firstDoc.id;
      providerName = firstDoc.data().fullName || "Expert Provider";
      logger.info(`Found registered provider user: ${providerName} (UID: ${providerId})`);
    }

    // 2. Clear old seeded bookings for this provider
    logger.info("Clearing old bookings for this provider...");
    const existingBookings = await db.collection("bookings").where("providerId", "==", providerId).get();
    const batch = db.batch();
    existingBookings.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    logger.success(`Deleted ${existingBookings.size} old bookings.`);

    // 3. Seed new rich bookings
    logger.info("Seeding beautiful assignments...");
    const sampleBookings = [
      {
        bookingId: "BK-AC88FF",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "ac_technician",
        serviceName: "AC General Service",
        city: "Islamabad",
        area: "G-13 Sector",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: "11:00 AM",
        status: "confirmed", // Awaiting provider response
        priority: "high",
        price: 2500,
        reasoning: "Top choice based on 5km proximity and 4.9 rating.",
        createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        bookingId: "BK-PL99EE",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "plumber",
        serviceName: "Water Pump Installation",
        city: "Islamabad",
        area: "F-10 Markaz",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: "3:00 PM",
        status: "accepted", // Accepted by provider
        priority: "normal",
        price: 3500,
        reasoning: "Highly rated in plumbing sanitations.",
        createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      },
      {
        bookingId: "BK-EL12AB",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "electrician",
        serviceName: "UPS Wiring & Circuit Breaker Repair",
        city: "Islamabad",
        area: "I-10 Sector",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: "5:30 PM",
        status: "in-progress", // Active work
        priority: "normal",
        price: 1500,
        reasoning: "Selected expert in electric circuits.",
        createdAt: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
      },
      {
        bookingId: "BK-CP45ZZ",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "ac_technician",
        serviceName: "Split AC Gas Filling & Leakage Check",
        city: "Islamabad",
        area: "E-11 Sector",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: "9:00 AM",
        status: "solved", // Solved by provider, awaiting customer release
        priority: "high",
        price: 4500,
        reasoning: "Verified same-day specialist.",
        createdAt: new Date(Date.now() - 18000000).toISOString() // 5 hours ago
      },
      {
        bookingId: "BK-TU66YY",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "tutor",
        serviceName: "O-Levels Physics Session",
        city: "Islamabad",
        area: "F-7 Sector",
        scheduledDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        scheduledTime: "4:00 PM",
        status: "completed", // Completed and settled
        priority: "normal",
        price: 3000,
        reasoning: "Matched Physics educator.",
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        bookingId: "BK-BT22XX",
        userId: "customer_uid_999",
        providerId: providerId,
        providerName: providerName,
        serviceCategory: "beautician",
        serviceName: "Home Party Makeup Package",
        city: "Islamabad",
        area: "Bahria Town",
        scheduledDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        scheduledTime: "2:00 PM",
        status: "disputed", // Disputed by customer
        disputeReason: "Provider arrived 45 minutes late and makeup quality was not up to premium standards.",
        priority: "normal",
        price: 6000,
        reasoning: "Top rated party makeup provider.",
        createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      }
    ];

    const writeBatch = db.batch();
    sampleBookings.forEach(booking => {
      const docId = uuidv4();
      const docRef = db.collection("bookings").doc(docId);
      writeBatch.set(docRef, { ...booking, id: docId });
    });
    
    await writeBatch.commit();
    logger.success(`Seeded ${sampleBookings.length} premium job assignments successfully!`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Seeding bookings failed:", error);
    process.exit(1);
  }
};

seedBookings();
