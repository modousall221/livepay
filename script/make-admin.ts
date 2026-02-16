/**
 * Script pour migrer un utilisateur en admin/superAdmin
 * Usage: npx tsx script/make-admin.ts [email]
 * Si aucun email n'est fourni, le premier utilisateur sera promu admin
 */

import { db } from "../server/db";
import { users } from "../shared/models/auth";
import { eq, asc } from "drizzle-orm";

async function makeAdmin(email?: string) {
  try {
    let user;

    if (email) {
      // Trouver l'utilisateur par email
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      user = result[0];
      
      if (!user) {
        console.error(`❌ Utilisateur avec email "${email}" non trouvé`);
        process.exit(1);
      }
    } else {
      // Prendre le premier utilisateur créé
      const result = await db.select().from(users).orderBy(asc(users.createdAt)).limit(1);
      user = result[0];
      
      if (!user) {
        console.error("❌ Aucun utilisateur dans la base de données");
        process.exit(1);
      }
    }

    console.log(`📧 Utilisateur trouvé: ${user.email}`);
    console.log(`👤 Nom: ${user.firstName || ""} ${user.lastName || ""}`);
    console.log(`🏪 Boutique: ${user.businessName || "N/A"}`);
    console.log(`📱 Téléphone: ${user.phone || "N/A"}`);
    console.log(`🔐 Rôle actuel: ${user.role}`);

    if (user.role === "admin") {
      console.log("\n✅ Cet utilisateur est déjà admin!");
      process.exit(0);
    }

    // Mettre à jour le rôle
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));

    console.log("\n🎉 Utilisateur promu ADMIN avec succès!");
    console.log(`🔐 Nouveau rôle: admin`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

// Récupérer l'email en argument (optionnel)
const emailArg = process.argv[2];
makeAdmin(emailArg);
