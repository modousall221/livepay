/**
 * AutomationEngine - Relances automatiques et tâches planifiées
 * Gère les rappels avant expiration, les notifications vendeur, etc.
 */

import { Order, Client, VendorConfig } from "@shared/schema";
import { scoringEngine } from "./scoring-engine";

interface ScheduledJob {
  orderId: string;
  type: 'reminder' | 'expiration' | 'vendor_notification';
  executeAt: Date;
  timeout: NodeJS.Timeout;
}

interface ReminderCallback {
  (orderId: string, order: Order, client?: Client): Promise<void>;
}

interface ExpirationCallback {
  (orderId: string, order: Order): Promise<void>;
}

interface VendorNotificationCallback {
  (vendorId: string, event: string, data: Record<string, any>): Promise<void>;
}

export class AutomationEngine {
  private static instance: AutomationEngine;
  private jobs: Map<string, ScheduledJob> = new Map();
  
  private onReminder: ReminderCallback | null = null;
  private onExpiration: ExpirationCallback | null = null;
  private onVendorNotification: VendorNotificationCallback | null = null;
  
  private constructor() {}
  
  static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  /**
   * Enregistre les callbacks pour les événements
   */
  setCallbacks(callbacks: {
    onReminder?: ReminderCallback;
    onExpiration?: ExpirationCallback;
    onVendorNotification?: VendorNotificationCallback;
  }) {
    if (callbacks.onReminder) this.onReminder = callbacks.onReminder;
    if (callbacks.onExpiration) this.onExpiration = callbacks.onExpiration;
    if (callbacks.onVendorNotification) this.onVendorNotification = callbacks.onVendorNotification;
  }

  /**
   * Planifie les jobs pour une nouvelle commande
   */
  scheduleOrderJobs(
    order: Order, 
    client: Client | null,
    vendorConfig: VendorConfig
  ): void {
    const now = new Date();
    const expiresAt = new Date(order.expiresAt);
    const totalDuration = expiresAt.getTime() - now.getTime();
    
    if (totalDuration <= 0) {
      console.log(`[Automation] Order ${order.id} already expired, skipping jobs`);
      return;
    }

    // Calculer le moment du rappel basé sur le score client
    const reminderPercentage = this.calculateReminderPercentage(client);
    const reminderDelay = Math.floor(totalDuration * reminderPercentage);
    
    // Job de rappel (si auto-reminder activé)
    if (vendorConfig.autoReminderEnabled && reminderDelay > 30000) { // Min 30s avant
      this.scheduleJob({
        orderId: order.id,
        type: 'reminder',
        executeAt: new Date(now.getTime() + reminderDelay),
        callback: async () => {
          if (this.onReminder) {
            await this.onReminder(order.id, order, client || undefined);
          }
        }
      });
    }

    // Job d'expiration
    this.scheduleJob({
      orderId: order.id,
      type: 'expiration',
      executeAt: expiresAt,
      callback: async () => {
        if (this.onExpiration) {
          await this.onExpiration(order.id, order);
        }
      }
    });

    console.log(`[Automation] Scheduled jobs for order ${order.id}:`);
    console.log(`  - Reminder at ${reminderPercentage * 100}%: ${new Date(now.getTime() + reminderDelay).toISOString()}`);
    console.log(`  - Expiration: ${expiresAt.toISOString()}`);
  }

  /**
   * Calcule le pourcentage du temps pour le rappel basé sur le score client
   */
  private calculateReminderPercentage(client: Client | null): number {
    if (!client) return 0.7; // 70% pour nouveaux clients
    
    const score = client.trustScore;
    
    // Clients VIP: rappel à 80% (plus de temps)
    if (score >= 80) return 0.8;
    
    // Clients à risque: rappel à 50% (plus tôt)
    if (score < 40) return 0.5;
    
    // Clients normaux: rappel à 70%
    return 0.7;
  }

  /**
   * Planifie un job avec timeout
   */
  private scheduleJob(params: {
    orderId: string;
    type: 'reminder' | 'expiration' | 'vendor_notification';
    executeAt: Date;
    callback: () => Promise<void>;
  }): void {
    const jobId = `${params.type}_${params.orderId}`;
    
    // Annuler le job existant si présent
    this.cancelJob(jobId);
    
    const delay = params.executeAt.getTime() - Date.now();
    if (delay <= 0) {
      console.log(`[Automation] Job ${jobId} already past due, executing immediately`);
      params.callback().catch(err => {
        console.error(`[Automation] Job ${jobId} failed:`, err);
      });
      return;
    }
    
    const timeout = setTimeout(async () => {
      try {
        await params.callback();
      } catch (error) {
        console.error(`[Automation] Job ${jobId} failed:`, error);
      } finally {
        this.jobs.delete(jobId);
      }
    }, delay);
    
    this.jobs.set(jobId, {
      orderId: params.orderId,
      type: params.type,
      executeAt: params.executeAt,
      timeout
    });
  }

  /**
   * Annule un job planifié
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      clearTimeout(job.timeout);
      this.jobs.delete(jobId);
      console.log(`[Automation] Cancelled job: ${jobId}`);
    }
  }

  /**
   * Annule tous les jobs pour une commande (ex: après paiement)
   */
  cancelOrderJobs(orderId: string): void {
    this.cancelJob(`reminder_${orderId}`);
    this.cancelJob(`expiration_${orderId}`);
  }

  /**
   * Notifie le vendeur d'un événement
   */
  async notifyVendor(
    vendorId: string, 
    event: 'payment_received' | 'order_expired' | 'stock_low' | 'live_summary',
    data: Record<string, any>
  ): Promise<void> {
    if (this.onVendorNotification) {
      await this.onVendorNotification(vendorId, event, data);
    }
  }

  /**
   * Génère le message de notification vendeur
   */
  getVendorNotificationMessage(
    event: string, 
    data: Record<string, any>
  ): string {
    switch (event) {
      case 'payment_received':
        return `🔔 *PAIEMENT REÇU*

${data.clientName} - ${data.productName}
💰 ${data.amount?.toLocaleString('fr-FR')} F CFA

📊 Live: ${data.totalPaid || 0} payés / ${data.totalRevenue?.toLocaleString('fr-FR') || 0} F`;

      case 'order_expired':
        return `⏳ Réservation expirée

${data.clientName} - ${data.productName}
📦 Stock remis en vente`;

      case 'stock_low':
        return `⚠️ *STOCK BAS*

${data.productName}
📦 Plus que ${data.remaining} en stock !
🔥 ${data.soldInLive || 0} vendus pendant ce live`;

      case 'live_summary':
        return data.summary || '';

      default:
        return `🔔 Notification: ${event}`;
    }
  }

  /**
   * Calcule la durée de réservation adaptative basée sur le client
   */
  calculateReservationDuration(
    baseMinutes: number, 
    client: Client | null
  ): number {
    if (!client) return baseMinutes;
    
    const score = scoringEngine.calculateScore(client);
    
    // Applique les recommandations du scoring
    return score.recommendations.reservationMinutes;
  }

  /**
   * Détermine si un upsell doit être proposé
   */
  shouldShowUpsell(client: Client | null, vendorConfig: VendorConfig): boolean {
    if (!vendorConfig.upsellEnabled) return false;
    if (!client) return false;
    
    const score = scoringEngine.calculateScore(client);
    return score.recommendations.showUpsell;
  }

  /**
   * Retourne les statistiques des jobs actifs (debug)
   */
  getActiveJobsStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    this.jobs.forEach(job => {
      byType[job.type] = (byType[job.type] || 0) + 1;
    });
    
    return {
      total: this.jobs.size,
      byType
    };
  }

  /**
   * Nettoie tous les jobs (pour shutdown)
   */
  cleanup(): void {
    console.log(`[Automation] Cleaning up ${this.jobs.size} jobs...`);
    this.jobs.forEach((job, jobId) => {
      clearTimeout(job.timeout);
    });
    this.jobs.clear();
  }
}

export const automationEngine = AutomationEngine.getInstance();

// Cleanup on process exit
process.on('SIGINT', () => automationEngine.cleanup());
process.on('SIGTERM', () => automationEngine.cleanup());
