/**
 * ScoringEngine - Calcul du score de confiance client
 * Anti-fraude et fidélisation
 */

import { Client, ClientTier } from "@shared/schema";

export interface ClientScore {
  trustScore: number;        // 0-100
  tier: ClientTier;
  riskFlags: string[];
  recommendations: {
    reservationMinutes: number;
    priorityLevel: 'normal' | 'high' | 'vip';
    requirePrePayment: boolean;
    showUpsell: boolean;
  };
}

export interface ScoreFactors {
  successfulPayments: number;
  expiredReservations: number;
  totalOrders: number;
  totalSpent: number;
  avgPaymentTimeSeconds: number | null;
  daysSinceFirstOrder: number | null;
}

export class ScoringEngine {
  private static instance: ScoringEngine;
  
  private constructor() {}
  
  static getInstance(): ScoringEngine {
    if (!ScoringEngine.instance) {
      ScoringEngine.instance = new ScoringEngine();
    }
    return ScoringEngine.instance;
  }

  /**
   * Calcule le score de confiance d'un client
   */
  calculateScore(client: Client): ClientScore {
    const factors = this.extractFactors(client);
    
    let score = 50; // Score de base
    const riskFlags: string[] = [];
    
    // === FACTEURS POSITIFS ===
    
    // Paiements réussis (+5 par paiement, max +25)
    score += Math.min(factors.successfulPayments * 5, 25);
    
    // Rapidité de paiement (+10 si < 2 min en moyenne)
    if (factors.avgPaymentTimeSeconds && factors.avgPaymentTimeSeconds < 120) {
      score += 10;
    }
    
    // Valeur client (+10 si > 100 000 F dépensés)
    if (factors.totalSpent > 100000) {
      score += 10;
    }
    
    // Ancienneté (+5 si client depuis > 30 jours)
    if (factors.daysSinceFirstOrder && factors.daysSinceFirstOrder > 30) {
      score += 5;
    }
    
    // === FACTEURS NÉGATIFS ===
    
    // Réservations expirées (-10 par expiration)
    score -= factors.expiredReservations * 10;
    
    // === DÉTECTION PATTERNS FRAUDULEUX ===
    
    // Pattern "faux acheteur": beaucoup d'expirations, peu de paiements
    if (factors.expiredReservations > 3 && factors.successfulPayments < 2) {
      riskFlags.push('faux_acheteur_potentiel');
      score -= 20;
    }
    
    // Pattern "abandons répétés": ratio expirations/commandes > 50%
    if (factors.totalOrders > 4 && 
        factors.expiredReservations / factors.totalOrders > 0.5) {
      riskFlags.push('abandons_frequents');
      score -= 15;
    }
    
    // Pattern "nouveau compte suspect": 0 paiement après 3+ commandes
    if (factors.totalOrders >= 3 && factors.successfulPayments === 0) {
      riskFlags.push('nouveau_suspect');
      score -= 25;
    }
    
    // Normaliser le score entre 0 et 100
    score = Math.max(0, Math.min(100, score));
    
    const tier = this.getTier(score, factors.totalOrders);
    const recommendations = this.getRecommendations(score, riskFlags, tier);
    
    return {
      trustScore: score,
      tier,
      riskFlags,
      recommendations
    };
  }

  /**
   * Détermine le tier du client basé sur score et historique
   */
  private getTier(score: number, totalOrders: number): ClientTier {
    // Diamant: 10+ commandes ET score >= 80
    if (totalOrders >= 10 && score >= 80) return 'diamond';
    
    // Or: 6+ commandes ET score >= 70
    if (totalOrders >= 6 && score >= 70) return 'gold';
    
    // Argent: 3+ commandes ET score >= 60
    if (totalOrders >= 3 && score >= 60) return 'silver';
    
    // Bronze: par défaut
    return 'bronze';
  }

  /**
   * Génère des recommandations basées sur le score
   */
  private getRecommendations(
    score: number, 
    flags: string[], 
    tier: ClientTier
  ): ClientScore['recommendations'] {
    // Client à risque
    if (score < 30 || flags.includes('faux_acheteur_potentiel')) {
      return {
        reservationMinutes: 5,    // Réservation courte
        priorityLevel: 'normal',
        requirePrePayment: true,  // Paiement préalable requis
        showUpsell: false
      };
    }
    
    // Client VIP (Diamant/Or avec bon score)
    if ((tier === 'diamond' || tier === 'gold') && score >= 75) {
      return {
        reservationMinutes: 15,   // Réservation longue
        priorityLevel: 'vip',
        requirePrePayment: false,
        showUpsell: true          // Proposer des upsells
      };
    }
    
    // Client Argent fiable
    if (tier === 'silver' && score >= 65) {
      return {
        reservationMinutes: 12,
        priorityLevel: 'high',
        requirePrePayment: false,
        showUpsell: true
      };
    }
    
    // Client normal
    return {
      reservationMinutes: 10,
      priorityLevel: 'normal',
      requirePrePayment: false,
      showUpsell: score >= 50
    };
  }

  /**
   * Extrait les facteurs de scoring d'un client
   */
  private extractFactors(client: Client): ScoreFactors {
    let daysSinceFirstOrder: number | null = null;
    
    if (client.firstOrderAt) {
      const firstOrder = new Date(client.firstOrderAt);
      const now = new Date();
      daysSinceFirstOrder = Math.floor((now.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      successfulPayments: client.successfulPayments,
      expiredReservations: client.expiredReservations,
      totalOrders: client.totalOrders,
      totalSpent: client.totalSpent,
      avgPaymentTimeSeconds: client.avgPaymentTimeSeconds,
      daysSinceFirstOrder
    };
  }

  /**
   * Met à jour les statistiques client après un événement
   */
  calculateUpdatedStats(
    client: Client,
    event: 'payment_success' | 'reservation_expired' | 'order_created',
    data?: { amount?: number; paymentTimeSeconds?: number }
  ): Partial<Client> {
    const updates: Partial<Client> = {
      updatedAt: new Date()
    };

    switch (event) {
      case 'payment_success':
        updates.successfulPayments = client.successfulPayments + 1;
        updates.totalSpent = client.totalSpent + (data?.amount || 0);
        updates.lastOrderAt = new Date();
        
        // Calcul moyenne temps de paiement
        if (data?.paymentTimeSeconds) {
          const currentAvg = client.avgPaymentTimeSeconds || data.paymentTimeSeconds;
          const totalPayments = client.successfulPayments;
          updates.avgPaymentTimeSeconds = Math.round(
            (currentAvg * totalPayments + data.paymentTimeSeconds) / (totalPayments + 1)
          );
        }
        break;
        
      case 'reservation_expired':
        updates.expiredReservations = client.expiredReservations + 1;
        break;
        
      case 'order_created':
        updates.totalOrders = client.totalOrders + 1;
        if (!client.firstOrderAt) {
          updates.firstOrderAt = new Date();
        }
        break;
    }

    // Recalculer le score et le tier
    const updatedClient = { ...client, ...updates } as Client;
    const { trustScore, tier } = this.calculateScore(updatedClient);
    
    updates.trustScore = trustScore;
    updates.tier = tier;
    
    // Auto-tag basé sur comportement
    const tags = new Set(client.tags || []);
    
    if (trustScore >= 80 && (client.successfulPayments + (updates.successfulPayments || 0)) >= 5) {
      tags.add('payeur_fiable');
    }
    
    if ((updates.avgPaymentTimeSeconds || client.avgPaymentTimeSeconds || 999) < 60) {
      tags.add('payeur_rapide');
    }
    
    if (trustScore < 30) {
      tags.add('risque');
    }
    
    updates.tags = Array.from(tags);
    
    return updates;
  }

  /**
   * Génère un message personnalisé basé sur le tier
   */
  getTierMessage(tier: ClientTier, locale: 'fr' = 'fr'): string {
    const messages = {
      fr: {
        diamond: '💎 Client Diamant - Réservation prioritaire garantie',
        gold: '🥇 Client Or - 15 min de réservation exclusive',
        silver: '🥈 Merci de ta fidélité !',
        bronze: ''
      }
    };
    
    return messages[locale][tier] || '';
  }

  /**
   * Message de fidélité post-paiement
   */
  getLoyaltyMessage(client: Client, locale: 'fr' = 'fr'): string {
    const totalPurchases = client.successfulPayments + 1;
    
    const messages = {
      fr: {
        first: '🎉 Premier achat réussi ! Bienvenue',
        third: '⭐ 3ème achat ! Tu es maintenant client Argent',
        sixth: '🥇 6ème achat ! Tu passes client Or',
        tenth: '💎 10ème achat ! Félicitations, tu es Diamant',
        regular: `⭐ ${totalPurchases}ème achat chez ce vendeur`
      }
    };
    
    if (totalPurchases === 1) return messages[locale].first;
    if (totalPurchases === 3) return messages[locale].third;
    if (totalPurchases === 6) return messages[locale].sixth;
    if (totalPurchases === 10) return messages[locale].tenth;
    if (totalPurchases >= 5) return messages[locale].regular;
    
    return '';
  }
}

export const scoringEngine = ScoringEngine.getInstance();
