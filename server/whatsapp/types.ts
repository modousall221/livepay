// Types pour le chatbot WhatsApp LivePay

export interface WhatsAppContact {
  phone: string;
  name?: string;
  vendorId: string;
  lastMessageAt?: Date;
  totalOrders?: number;
  totalSpent?: number;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to?: string;
  type: 'text' | 'image' | 'button' | 'interactive' | 'template';
  text?: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ConversationState {
  phone: string;
  vendorId: string;
  currentStep: 'idle' | 'browsing' | 'selecting_product' | 'awaiting_quantity' | 'confirming_order' | 'awaiting_payment' | 'completed';
  selectedProductId?: string;
  selectedSessionId?: string;
  lastInteraction: Date;
  context: Record<string, any>;
}

export interface BotCommand {
  keywords: string[];
  action: string;
  description: string;
  requiresSession?: boolean;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string;
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WebhookContact[];
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
  };
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

export interface SendMessageOptions {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: string;
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  interactive?: InteractiveMessage;
}

export interface InteractiveMessage {
  type: 'button' | 'list' | 'product' | 'product_list';
  header?: {
    type: 'text' | 'image';
    text?: string;
    image?: { link: string };
  };
  body: { text: string };
  footer?: { text: string };
  action: InteractiveAction;
}

export interface InteractiveAction {
  buttons?: InteractiveButton[];
  sections?: InteractiveSection[];
  button?: string;
  catalog_id?: string;
  product_retailer_id?: string;
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface BotConfig {
  vendorId: string;
  enabled: boolean;
  welcomeMessage: string;
  autoReplyEnabled: boolean;
  autoCreateInvoice: boolean;
  defaultSessionId?: string;
  businessHours?: {
    enabled: boolean;
    start: string; // "09:00"
    end: string;   // "21:00"
    timezone: string;
    offHoursMessage: string;
  };
  keywords: {
    order: string[];
    catalog: string[];
    help: string[];
    status: string[];
  };
}
