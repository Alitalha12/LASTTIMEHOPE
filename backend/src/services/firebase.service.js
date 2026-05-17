/**
 * Firebase Service Layer
 * Generic Firestore CRUD helpers used by all agents and controllers
 */
const { getDb } = require("../config/firebase");
const logger = require("../utils/logger");

/**
 * Add a document to a collection
 * @param {string} collection - Firestore collection name
 * @param {string} docId - Document ID (use uuid)
 * @param {object} data - Document data
 */
const addDocument = async (collection, docId, data) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  const docRef = db.collection(collection).doc(docId);
  const timestamp = new Date().toISOString();

  await docRef.set({
    ...data,
    id: docId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  logger.info(`Document added to ${collection}/${docId}`);
  return { id: docId, ...data };
};

/**
 * Get a single document by ID
 * @param {string} collection - Firestore collection name
 * @param {string} docId - Document ID
 */
const getDocument = async (collection, docId) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  const doc = await db.collection(collection).doc(docId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
};

/**
 * Query documents with filters
 * @param {string} collection - Firestore collection name
 * @param {Array} filters - Array of { field, operator, value }
 * @param {object} options - { limit, orderBy, orderDirection }
 */
const queryDocuments = async (collection, filters = [], options = {}) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  let query = db.collection(collection);

  // Apply filters
  for (const filter of filters) {
    query = query.where(filter.field, filter.operator, filter.value);
  }

  // Apply ordering
  if (options.orderBy) {
    query = query.orderBy(options.orderBy, options.orderDirection || "asc");
  }

  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  const results = [];

  snapshot.forEach((doc) => {
    results.push({ id: doc.id, ...doc.data() });
  });

  logger.info(`Query ${collection}: ${results.length} results found`);
  return results;
};

/**
 * Update a document
 * @param {string} collection - Firestore collection name
 * @param {string} docId - Document ID
 * @param {object} data - Fields to update
 */
const updateDocument = async (collection, docId, data) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  const docRef = db.collection(collection).doc(docId);
  await docRef.update({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  logger.info(`Document updated: ${collection}/${docId}`);
  return { id: docId, ...data };
};

/**
 * Delete a document
 * @param {string} collection - Firestore collection name
 * @param {string} docId - Document ID
 */
const deleteDocument = async (collection, docId) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  await db.collection(collection).doc(docId).delete();
  logger.info(`Document deleted: ${collection}/${docId}`);
  return { id: docId, deleted: true };
};

/**
 * Get all documents in a collection
 * @param {string} collection - Firestore collection name
 */
const getAllDocuments = async (collection) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");

  const snapshot = await db.collection(collection).get();
  const results = [];

  snapshot.forEach((doc) => {
    results.push({ id: doc.id, ...doc.data() });
  });

  return results;
};

/**
 * Run a Firestore transaction
 * @param {Function} updateFunction - Function to execute inside the transaction
 */
const runTransaction = async (updateFunction) => {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");
  return db.runTransaction(updateFunction);
};

module.exports = {
  addDocument,
  getDocument,
  queryDocuments,
  updateDocument,
  deleteDocument,
  getAllDocuments,
  runTransaction,
};

/**
 * Add a document to a subcollection (e.g. bookings/{id}/history)
 */
const addSubDocument = async (collection, docId, subCollection, data) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  const timestamp = new Date().toISOString();
  const ref = db.collection(collection).doc(docId).collection(subCollection).doc();
  await ref.set({ ...data, id: ref.id, createdAt: timestamp });
  logger.info(`SubDoc added: ${collection}/${docId}/${subCollection}/${ref.id}`);
  return { id: ref.id, ...data };
};

/**
 * Get all documents from a subcollection ordered by createdAt desc
 */
const getSubCollection = async (collection, docId, subCollection) => {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  const snap = await db.collection(collection).doc(docId).collection(subCollection)
    .orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Re-export with subcollection helpers
Object.assign(module.exports, { addSubDocument, getSubCollection });
