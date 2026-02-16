/**
 * Migration script from PostgreSQL (Neon) to Firebase Firestore
 * 
 * Usage:
 *   1. Set environment variables:
 *      - DATABASE_URL: Neon PostgreSQL connection string
 *      - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account JSON
 *   
 *   2. Run: npx tsx script/migrate-to-firebase.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import admin from "firebase-admin";
import * as schema from "../shared/schema";

const { Pool } = pg;

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

if (!serviceAccount) {
  console.log("\n⚠️  GOOGLE_APPLICATION_CREDENTIALS non défini.");
  console.log("   Pour migrer les données, vous devez:");
  console.log("   1. Aller sur Firebase Console > Paramètres du projet > Comptes de service");
  console.log("   2. Générer une nouvelle clé privée (fichier JSON)");
  console.log("   3. Définir GOOGLE_APPLICATION_CREDENTIALS=chemin/vers/fichier.json");
  console.log("\n📝 Note: Ce script est optionnel si vous démarrez avec une base vide.\n");
  process.exit(0);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "live-pay-97ac6",
});

const firestore = admin.firestore();

// Initialize PostgreSQL
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL requis pour la migration");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function migrateUsers() {
  console.log("📦 Migration des utilisateurs...");
  const users = await db.select().from(schema.users);
  
  const batch = firestore.batch();
  let count = 0;
  
  for (const user of users) {
    const userRef = firestore.collection("users").doc(user.id);
    batch.set(userRef, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      phone: user.phone,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt ? admin.firestore.Timestamp.fromDate(user.createdAt) : admin.firestore.Timestamp.now(),
      updatedAt: user.updatedAt ? admin.firestore.Timestamp.fromDate(user.updatedAt) : admin.firestore.Timestamp.now(),
    });
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  ✓ ${count} utilisateurs migrés`);
    }
  }
  
  await batch.commit();
  console.log(`  ✓ Total: ${count} utilisateurs migrés`);
}

async function migrateVendorConfigs() {
  console.log("📦 Migration des configurations vendeur...");
  const configs = await db.select().from(schema.vendorConfigs);
  
  let count = 0;
  for (const config of configs) {
    await firestore.collection("vendorConfigs").add({
      vendorId: config.vendorId,
      businessName: config.businessName,
      mobileMoneyNumber: config.mobileMoneyNumber,
      preferredPaymentMethod: config.preferredPaymentMethod,
      whatsappPhoneNumberId: config.whatsappPhoneNumberId,
      whatsappAccessToken: config.whatsappAccessToken,
      whatsappVerifyToken: config.whatsappVerifyToken,
      status: config.status,
      liveMode: config.liveMode,
      reservationDurationMinutes: config.reservationDurationMinutes,
      autoReplyEnabled: config.autoReplyEnabled,
      welcomeMessage: config.welcomeMessage,
      segment: config.segment,
      allowQuantitySelection: config.allowQuantitySelection,
      requireDeliveryAddress: config.requireDeliveryAddress,
      autoReminderEnabled: config.autoReminderEnabled,
      upsellEnabled: config.upsellEnabled,
      minTrustScoreRequired: config.minTrustScoreRequired,
      messageTemplates: config.messageTemplates,
      createdAt: config.createdAt ? admin.firestore.Timestamp.fromDate(config.createdAt) : admin.firestore.Timestamp.now(),
      updatedAt: config.updatedAt ? admin.firestore.Timestamp.fromDate(config.updatedAt) : admin.firestore.Timestamp.now(),
    });
    count++;
  }
  
  console.log(`  ✓ ${count} configurations migrées`);
}

async function migrateProducts() {
  console.log("📦 Migration des produits...");
  const products = await db.select().from(schema.products);
  
  let count = 0;
  for (const product of products) {
    await firestore.collection("products").add({
      vendorId: product.vendorId,
      keyword: product.keyword,
      shareCode: product.shareCode,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      description: product.description,
      imageUrl: product.imageUrl,
      images: product.images,
      category: product.category,
      stock: product.stock,
      reservedStock: product.reservedStock,
      active: product.active,
      featured: product.featured,
      createdAt: product.createdAt ? admin.firestore.Timestamp.fromDate(product.createdAt) : admin.firestore.Timestamp.now(),
    });
    count++;
  }
  
  console.log(`  ✓ ${count} produits migrés`);
}

async function migrateOrders() {
  console.log("📦 Migration des commandes...");
  const orders = await db.select().from(schema.orders);
  
  let count = 0;
  for (const order of orders) {
    await firestore.collection("orders").add({
      vendorId: order.vendorId,
      sessionId: order.sessionId,
      productId: order.productId,
      clientId: order.clientId,
      clientPhone: order.clientPhone,
      clientName: order.clientName,
      clientTrustScore: order.clientTrustScore,
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentToken: order.paymentToken,
      paymentUrl: order.paymentUrl,
      paymentMethod: order.paymentMethod,
      pspReference: order.pspReference,
      reservedAt: order.reservedAt ? admin.firestore.Timestamp.fromDate(order.reservedAt) : null,
      expiresAt: order.expiresAt ? admin.firestore.Timestamp.fromDate(order.expiresAt) : null,
      paidAt: order.paidAt ? admin.firestore.Timestamp.fromDate(order.paidAt) : null,
      reminderSent: order.reminderSent,
      paymentTimeSeconds: order.paymentTimeSeconds,
      createdAt: order.createdAt ? admin.firestore.Timestamp.fromDate(order.createdAt) : admin.firestore.Timestamp.now(),
    });
    count++;
  }
  
  console.log(`  ✓ ${count} commandes migrées`);
}

async function migrateLiveSessions() {
  console.log("📦 Migration des sessions live...");
  const sessions = await db.select().from(schema.liveSessions);
  
  let count = 0;
  for (const session of sessions) {
    await firestore.collection("liveSessions").add({
      vendorId: session.vendorId,
      title: session.title,
      platform: session.platform,
      active: session.active,
      createdAt: session.createdAt ? admin.firestore.Timestamp.fromDate(session.createdAt) : admin.firestore.Timestamp.now(),
      endedAt: session.endedAt ? admin.firestore.Timestamp.fromDate(session.endedAt) : null,
    });
    count++;
  }
  
  console.log(`  ✓ ${count} sessions migrées`);
}

async function migrateInvoices() {
  console.log("📦 Migration des factures...");
  const invoices = await db.select().from(schema.invoices);
  
  let count = 0;
  for (const invoice of invoices) {
    await firestore.collection("invoices").add({
      vendorId: invoice.vendorId,
      sessionId: invoice.sessionId,
      productId: invoice.productId,
      clientName: invoice.clientName,
      clientPhone: invoice.clientPhone,
      productName: invoice.productName,
      amount: invoice.amount,
      status: invoice.status,
      token: invoice.token,
      expiresAt: invoice.expiresAt ? admin.firestore.Timestamp.fromDate(invoice.expiresAt) : null,
      paymentMethod: invoice.paymentMethod,
      paymentProviderRef: invoice.paymentProviderRef,
      bictorysChargeId: invoice.bictorysChargeId,
      bictorysCheckoutUrl: invoice.bictorysCheckoutUrl,
      paidAt: invoice.paidAt ? admin.firestore.Timestamp.fromDate(invoice.paidAt) : null,
      createdAt: invoice.createdAt ? admin.firestore.Timestamp.fromDate(invoice.createdAt) : admin.firestore.Timestamp.now(),
    });
    count++;
  }
  
  console.log(`  ✓ ${count} factures migrées`);
}

async function migrateClients() {
  console.log("📦 Migration des clients...");
  const clients = await db.select().from(schema.clients);
  
  let count = 0;
  for (const client of clients) {
    await firestore.collection("clients").add({
      vendorId: client.vendorId,
      phone: client.phone,
      name: client.name,
      trustScore: client.trustScore,
      totalOrders: client.totalOrders,
      successfulPayments: client.successfulPayments,
      expiredReservations: client.expiredReservations,
      totalSpent: client.totalSpent,
      tier: client.tier,
      preferredPayment: client.preferredPayment,
      avgPaymentTimeSeconds: client.avgPaymentTimeSeconds,
      lastOrderAt: client.lastOrderAt ? admin.firestore.Timestamp.fromDate(client.lastOrderAt) : null,
      firstOrderAt: client.firstOrderAt ? admin.firestore.Timestamp.fromDate(client.firstOrderAt) : null,
      tags: client.tags,
      createdAt: client.createdAt ? admin.firestore.Timestamp.fromDate(client.createdAt) : admin.firestore.Timestamp.now(),
      updatedAt: client.updatedAt ? admin.firestore.Timestamp.fromDate(client.updatedAt) : admin.firestore.Timestamp.now(),
    });
    count++;
  }
  
  console.log(`  ✓ ${count} clients migrés`);
}

async function main() {
  console.log("🚀 Démarrage de la migration PostgreSQL → Firestore\n");
  
  try {
    await migrateUsers();
    await migrateVendorConfigs();
    await migrateProducts();
    await migrateOrders();
    await migrateLiveSessions();
    await migrateInvoices();
    await migrateClients();
    
    console.log("\n✅ Migration terminée avec succès!");
    console.log("\n⚠️  Note importante:");
    console.log("   Les mots de passe ne sont PAS migrés vers Firebase Auth.");
    console.log("   Les utilisateurs devront utiliser 'Mot de passe oublié' pour se reconnecter.");
    
  } catch (error) {
    console.error("\n❌ Erreur pendant la migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
