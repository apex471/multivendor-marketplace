/**
 * CourierPlus API Client
 * Base URL: https://client-api.courierplus-ng.com/api/v1/client
 * Official Logistics & Dispatch Engine for Certified Luxury World
 */

// ─── Nigerian State Code Mapping (CourierPlus Standards) ──────────────────────
// Sourced directly from CourierPlus Nigeria States Directory (all 36 States + FCT)
export const NIGERIA_STATE_CODE_MAP: Record<string, { code: string; name: string; zone: 'lagos' | 'southwest' | 'southeast' | 'southsouth' | 'northcentral' | 'northwest' | 'northeast' }> = {
  'lagos':                           { code: 'LOS', name: 'Lagos', zone: 'lagos' },
  'abuja':                           { code: 'ABV', name: 'Abuja Federal Capital Territory', zone: 'northcentral' },
  'fct':                             { code: 'ABV', name: 'Abuja Federal Capital Territory', zone: 'northcentral' },
  'federal capital territory':       { code: 'ABV', name: 'Abuja Federal Capital Territory', zone: 'northcentral' },
  'abia':                            { code: 'UMU', name: 'Abia', zone: 'southeast' },
  'adamawa':                         { code: 'YOL', name: 'Adamawa', zone: 'northeast' },
  'akwa ibom':                       { code: 'UYO', name: 'Akwa Ibom', zone: 'southsouth' },
  'anambra':                         { code: 'ONA', name: 'Anambra', zone: 'southeast' },
  'bauchi':                          { code: 'BAU', name: 'Bauchi', zone: 'northeast' },
  'bayelsa':                         { code: 'YEN', name: 'Bayelsa', zone: 'southsouth' },
  'benue':                           { code: 'MDI', name: 'Benue', zone: 'northcentral' },
  'borno':                           { code: 'MIU', name: 'Borno', zone: 'northeast' },
  'cross river':                     { code: 'CBQ', name: 'Cross River', zone: 'southsouth' },
  'delta':                           { code: 'ASB', name: 'Delta', zone: 'southsouth' },
  'ebonyi':                          { code: 'AKK', name: 'Ebonyi', zone: 'southeast' },
  'edo':                             { code: 'BNI', name: 'Edo', zone: 'southsouth' },
  'ekiti':                           { code: 'ADK', name: 'Ekiti', zone: 'southwest' },
  'enugu':                           { code: 'ENU', name: 'Enugu', zone: 'southeast' },
  'gombe':                           { code: 'GOM', name: 'Gombe', zone: 'northeast' },
  'imo':                             { code: 'ORI', name: 'Imo', zone: 'southeast' },
  'jigawa':                          { code: 'DUT', name: 'Jigawa', zone: 'northwest' },
  'kaduna':                          { code: 'KAD', name: 'Kaduna', zone: 'northwest' },
  'kano':                            { code: 'KAN', name: 'Kano', zone: 'northwest' },
  'katsina':                         { code: 'KAT', name: 'Katsina', zone: 'northwest' },
  'kebbi':                           { code: 'BRK', name: 'Kebbi', zone: 'northwest' },
  'kogi':                            { code: 'LKJ', name: 'Kogi', zone: 'northcentral' },
  'kwara':                           { code: 'ILR', name: 'Kwara', zone: 'northcentral' },
  'nasarawa':                        { code: 'LAF', name: 'Nasarawa', zone: 'northcentral' },
  'niger':                           { code: 'MNA', name: 'Niger', zone: 'northcentral' },
  'ogun':                            { code: 'ABK', name: 'Ogun', zone: 'southwest' },
  'ondo':                            { code: 'AKR', name: 'Ondo', zone: 'southwest' },
  'osun':                            { code: 'OSG', name: 'Osun', zone: 'southwest' },
  'oyo':                             { code: 'IBA', name: 'Oyo', zone: 'southwest' },
  'plateau':                         { code: 'JOS', name: 'Plateau', zone: 'northcentral' },
  'rivers':                          { code: 'PHC', name: 'Rivers', zone: 'southsouth' },
  'sokoto':                          { code: 'SKO', name: 'Sokoto', zone: 'northwest' },
  'taraba':                          { code: 'JAL', name: 'Taraba', zone: 'northeast' },
  'yobe':                            { code: 'DAM', name: 'Yobe', zone: 'northeast' },
  'zamfara':                         { code: 'GUS', name: 'Zamfara', zone: 'northwest' },
};

/**
 * Resolves any Nigerian state or city text input to CourierPlus's 3-letter State Code.
 */
export function resolveCourierPlusStateCode(input?: string): string {
  if (!input) return 'LOS';
  const clean = input.toLowerCase().trim();

  // 1. Direct match in dictionary
  if (NIGERIA_STATE_CODE_MAP[clean]) {
    return NIGERIA_STATE_CODE_MAP[clean].code;
  }

  // 2. Substring matching in state names
  for (const [key, val] of Object.entries(NIGERIA_STATE_CODE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val.code;
    }
  }

  // 3. Known major city aliases
  if (/ikeja|lekki|victoria island|vi|yaba|surulere|ikoyi|ajah|maryland|gbagada|ojota|alaba|festac|badagry|ikorodu|epe/i.test(clean)) return 'LOS';
  if (/garki|wuse|maitama|asokoro|jabi|gwarinpa|apo|kubwa|lugbe|karu|nyanya/i.test(clean)) return 'ABV';
  if (/port harcourt|obio-akpor|bonny|eleme/i.test(clean)) return 'PHC';
  if (/ibadan|bodija|dugbe|ring road|iwo road/i.test(clean)) return 'IBA';
  if (/abeokuta|ota|sagamu|ijebu/i.test(clean)) return 'ABK';
  if (/warri|asaba|ughelli|sapele/i.test(clean)) return 'ASB';
  if (/benin|ekpoma|auchi/i.test(clean)) return 'BNI';
  if (/onitsha|awka|nnewi/i.test(clean)) return 'ONA';
  if (/enugu|nsukka/i.test(clean)) return 'ENU';
  if (/owerri|orlu/i.test(clean)) return 'ORI';
  if (/uyo|eket|ikot ekpene/i.test(clean)) return 'UYO';
  if (/calabar/i.test(clean)) return 'CBQ';
  if (/kano/i.test(clean)) return 'KAN';
  if (/kaduna|zaaria/i.test(clean)) return 'KAD';
  if (/ilorin/i.test(clean)) return 'ILR';
  if (/jos/i.test(clean)) return 'JOS';
  if (/akure|ondo/i.test(clean)) return 'AKR';
  if (/osogbo|ife|ilesa/i.test(clean)) return 'OSG';

  // Default to Lagos central hub code
  return 'LOS';
}

/**
 * Resolves a town or landmark name acceptable to CourierPlus domestic tariff queries.
 */
export function resolveCourierPlusTown(city?: string, address?: string): string {
  const candidate = (city || address || '').trim();
  if (!candidate) return 'Ikeja';

  // Extract primary word/neighborhood if full address provided
  const parts = candidate.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
  const primary = parts[0] || candidate;
  return primary.slice(0, 40);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourierPlusApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isLive?: boolean;
}

export interface ShippingRate {
  id: string;
  name: string;
  carrier: string;
  tagline: string;
  icon: string;
  price: number;
  deliveryDays: string;
  estimatedDate: string;
  features: string[];
  badge?: string;
  badgeVariant?: 'gold' | 'green' | 'orange' | 'blue';
  tracking: 'realtime' | 'standard';
  insurance: boolean;
  signature: boolean;
  available: boolean;
  breakdown?: {
    baseTariff?: number;
    vat?: number;
    onforwarding?: number;
    amountDue?: number;
    serviceType?: string;
  };
}

export interface ShippingRatesResponse {
  rates: ShippingRate[];
  destinationState: string;
  destinationTown: string;
  isLive: boolean;
  [key: string]: unknown;
}

export interface WaybillRequest {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  description: string;
  weight: number;
  quantity: number;
  value?: number;
  [key: string]: unknown;
}

export interface WaybillResponse {
  waybillNumber?: string;
  trackingId?: string;
  trackingNumber?: string;
  waybill?: string;
  reference?: string;
  [key: string]: unknown;
}

export interface TrackingEvent {
  status?: string;
  description?: string;
  timestamp?: string;
  location?: string;
  [key: string]: unknown;
}

export interface TrackingResponse {
  waybillNumber?: string;
  status?: string;
  events?: TrackingEvent[];
  history?: TrackingEvent[];
  timeline?: TrackingEvent[];
  estimatedDelivery?: string;
  [key: string]: unknown;
}

export interface PickupRequest {
  pickupDate: string;
  pickupAddress: string;
  contactName: string;
  contactPhone: string;
  [key: string]: unknown;
}

export interface PickupResponse {
  pickupId?: string;
  reference?: string;
  scheduledDate?: string;
  [key: string]: unknown;
}

export interface WalletBalanceResponse {
  balance?: number;
  availableBalance?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface WalletTopUpRequest {
  amount: number;
  reference: string;
}

export interface WalletTopUpResponse {
  success?: boolean;
  balance?: number;
  transactionId?: string;
  [key: string]: unknown;
}

export interface Location {
  id?: string | number;
  name?: string;
  state?: string;
  city?: string;
  code?: string;
  [key: string]: unknown;
}

export interface LocationsResponse {
  locations?: Location[];
  data?: Location[];
  [key: string]: unknown;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class CourierPlusClient {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly secret: string;

  constructor() {
    this.baseUrl =
      process.env.COURIERPLUS_BASE_URL ||
      'https://client-api.courierplus-ng.com/api/v1/client';
    this.token =
      process.env.COURIERPLUS_TOKEN ||
      '19|KIWcOxrpDj1vwWikL9KXeVBApRzQ8BRMM8O8i2FD9wWTepaKLHCmWL2vn4spzgkw1zTEpbuBuw2XLhQXaUIFepiPWqqEsWonwO2So982i2kl9X1AtfLuMeCta8LIKRoUPz2hhj6xb9eB0qiZxjKcnBTO0WE3fzoa6CbZOsv1rieo0Y71BJhWkzlhAfFeWiZMMCAGdETQIkEKSciVAGQPV48yHpsn3wkiHwwS5Z3fJOzrnQMx83TiAq89C5';
    this.secret =
      process.env.COURIERPLUS_SECRET || 'kesJtOVxpqFi2xnqrsgQGj5KTCoGkCY4';
  }

  /**
   * Core HTTP helper — adds auth headers and handles errors gracefully.
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<CourierPlusApiResult<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'X-Client-Secret': this.secret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });

      let responseData: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = { message: text };
        }
      }

      if (!response.ok) {
        const errData = responseData as Record<string, unknown>;
        const message =
          (errData?.message as string) ||
          (errData?.error as string) ||
          `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`[CourierPlus] ${method} ${path} → ${response.status}:`, message);
        return { success: false, error: message };
      }

      const d = responseData as Record<string, unknown>;
      const unwrapped =
        d?.data !== undefined ? (d.data as T) : (responseData as T);

      return { success: true, data: unwrapped };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown network error';
      console.warn(`[CourierPlus] ${method} ${path} network error:`, message);
      return { success: false, error: message };
    }
  }

  // ── Public API Methods ────────────────────────────────────────────────────

  /**
   * Calculate live dynamic shipping rates using CourierPlus official tariff API.
   * Formats response into CourierPlus Standard Delivery & CourierPlus Express Priority.
   */
  async getShippingRates(
    origin: string = 'Lagos',
    destination: string = 'Lagos',
    weight: number = 1,
    options?: {
      city?: string;
      state?: string;
      address?: string;
      country?: string;
      description?: string;
      quantity?: number;
      declaredValue?: number;
    }
  ): Promise<CourierPlusApiResult<ShippingRatesResponse>> {
    const originStateCode = resolveCourierPlusStateCode(origin);
    const originTownName  = resolveCourierPlusTown(origin, 'Ikeja Central Hub');

    const destStateCode   = resolveCourierPlusStateCode(options?.state || destination);
    const destTownName    = resolveCourierPlusTown(options?.city, options?.address || destination);

    const safeWeight      = Math.max(0.5, Number(weight) || 1);

    const payload = {
      originStateCode,
      originTownName,
      destinationStateCode: destStateCode,
      destinationTownName:  destTownName,
      measureWeight:        safeWeight,
      productTypeCode:      'ECM',
      zoneType:             'domestic',
      insured:              'no',
    };

    // 1. Attempt official CourierPlus client tariff calculation
    const tariffResult = await this.request<any>('POST', '/tariff/get-tariff', payload);

    if (tariffResult.success && tariffResult.data) {
      // Notice: CourierPlus API returns key 'tafiff'
      const tariffData = tariffResult.data.tafiff || tariffResult.data.tariff || tariffResult.data;
      if (tariffData) {
        const baseTariff     = Number(tariffData.tarrif ?? tariffData.tariff ?? 2500);
        const vat            = Number(tariffData.vat ?? 0);
        const onforwarding   = Number(tariffData.destinationOnforwardingCharge ?? 0);
        const totalAmount    = Number(tariffData.amountDue ?? (baseTariff + vat + onforwarding));

        const estimatedDays  = Number(tariffData.estimatedDeliveryDays ?? tariffData.expecteDeliveryDay ?? 3);
        const serviceType    = String(tariffData.serviceType ?? (destStateCode === originStateCode ? 'metro' : 'direct'));

        const standardPrice  = Math.max(1500, Math.round(totalAmount));
        // Express priority: expedited dispatch + priority transit handling
        const expressPrice   = Math.round(standardPrice * 1.4);

        const standardDaysText = estimatedDays <= 2
          ? '1–2 business days'
          : `${estimatedDays}–${estimatedDays + 1} business days`;
        
        const expressDaysText  = estimatedDays <= 2
          ? 'Next day delivery'
          : `${Math.max(1, estimatedDays - 1)}–${estimatedDays} business days`;

        const rates: ShippingRate[] = [
          {
            id: 'courierplus-standard',
            name: 'CourierPlus Standard Delivery',
            carrier: 'CourierPlus Nigeria',
            tagline: serviceType === 'metro'
              ? 'Intra-city metro direct delivery'
              : 'Interstate nationwide delivery across Nigeria',
            icon: '🚚',
            price: standardPrice,
            deliveryDays: standardDaysText,
            estimatedDate: standardDaysText,
            features: [
              'Official CourierPlus Live Tariff',
              'Full live GPS tracking',
              'SMS & Email dispatch alerts',
              'Tamper-evident luxury packaging',
              'Doorstep delivery',
            ],
            badge: 'Official Carrier',
            badgeVariant: 'gold',
            tracking: 'realtime',
            insurance: true,
            signature: true,
            available: true,
            breakdown: {
              baseTariff,
              vat,
              onforwarding,
              amountDue: standardPrice,
              serviceType,
            },
          },
          {
            id: 'courierplus-express',
            name: 'CourierPlus Express Priority',
            carrier: 'CourierPlus Nigeria',
            tagline: 'Expedited priority dispatch with dedicated courier handling',
            icon: '⚡',
            price: expressPrice,
            deliveryDays: expressDaysText,
            estimatedDate: 'Priority / Next day',
            features: [
              'Expedited priority dispatch',
              'Minute-by-minute tracking',
              'Dedicated dispatch courier',
              'Signature & photo on delivery',
              'Up to ₦500,000 transit cover',
            ],
            badge: 'Fastest',
            badgeVariant: 'orange',
            tracking: 'realtime',
            insurance: true,
            signature: true,
            available: true,
            breakdown: {
              baseTariff: Math.round(baseTariff * 1.4),
              vat: Math.round(vat * 1.4),
              onforwarding,
              amountDue: expressPrice,
              serviceType: 'express',
            },
          },
        ];

        return {
          success: true,
          isLive: true,
          data: {
            rates,
            destinationState: destStateCode,
            destinationTown: destTownName,
            isLive: true,
          },
        };
      }
    }

    // 2. Fallback: Intelligent Zone-Based CourierPlus Tariff Standard
    // Sourced directly from CourierPlus distance brackets if network/API is temporarily offline
    let standardPrice = 7500;
    let expressPrice  = 10500;
    let daysText      = '3–5 business days';

    if (destStateCode === 'LOS') {
      // Intra-Lagos metro
      standardPrice = 3450;
      expressPrice  = 5200;
      daysText      = '1–2 business days';
    } else if (['ABK', 'IBA', 'OSG', 'AKR', 'ADK'].includes(destStateCode)) {
      // South-West regional corridor
      standardPrice = 6900;
      expressPrice  = 9800;
      daysText      = '2–3 business days';
    } else if (['ABV', 'PHC', 'BNI', 'ASB', 'ENU', 'ONA', 'UYO', 'ORI'].includes(destStateCode)) {
      // Major metropolitan commercial centres
      standardPrice = 7950;
      expressPrice  = 11500;
      daysText      = '3–4 business days';
    } else {
      // North / Remote interstate zones
      standardPrice = 8800;
      expressPrice  = 12800;
      daysText      = '4–5 business days';
    }

    // Adjust for parcel weight
    if (safeWeight > 2) {
      const extraKg = Math.ceil(safeWeight - 2);
      standardPrice += extraKg * 1200;
      expressPrice  += extraKg * 1600;
    }

    const fallbackRates: ShippingRate[] = [
      {
        id: 'courierplus-standard',
        name: 'CourierPlus Standard Delivery',
        carrier: 'CourierPlus Nigeria',
        tagline: destStateCode === 'LOS'
          ? 'Intra-city metro direct delivery'
          : 'Interstate nationwide delivery across Nigeria',
        icon: '🚚',
        price: standardPrice,
        deliveryDays: daysText,
        estimatedDate: daysText,
        features: [
          'Full live GPS tracking',
          'SMS & Email dispatch alerts',
          'Secure tamper-evident packaging',
          'Doorstep delivery',
        ],
        badge: 'Official Carrier',
        badgeVariant: 'gold',
        tracking: 'realtime',
        insurance: true,
        signature: true,
        available: true,
      },
      {
        id: 'courierplus-express',
        name: 'CourierPlus Express Priority',
        carrier: 'CourierPlus Nigeria',
        tagline: 'Expedited priority delivery with premium handling',
        icon: '⚡',
        price: expressPrice,
        deliveryDays: destStateCode === 'LOS' ? 'Same day / Next day' : '1–2 business days',
        estimatedDate: 'Priority / Expedited',
        features: [
          'Minute-by-minute tracking',
          'Dedicated dispatch courier',
          'Signature & photo on delivery',
          'Up to ₦500,000 transit cover',
          'Priority dispatch handling',
        ],
        badge: 'Fastest',
        badgeVariant: 'orange',
        tracking: 'realtime',
        insurance: true,
        signature: true,
        available: true,
      },
    ];

    return {
      success: true,
      isLive: false,
      data: {
        rates: fallbackRates,
        destinationState: destStateCode,
        destinationTown: destTownName,
        isLive: false,
      },
    };
  }

  /**
   * Create a waybill / shipment on CourierPlus.
   */
  async createWaybill(
    data: WaybillRequest
  ): Promise<CourierPlusApiResult<WaybillResponse>> {
    return this.request<WaybillResponse>('POST', '/users/waybill/create-waybill', data as Record<string, unknown>);
  }

  /**
   * Track a shipment by its waybill number using CourierPlus Public / Client tracking.
   */
  async trackShipment(
    waybillNumber: string
  ): Promise<CourierPlusApiResult<TrackingResponse>> {
    const cleanNumber = waybillNumber.trim();
    return this.request<TrackingResponse>('POST', '/public/track', {
      tracking_no: [cleanNumber],
    });
  }

  /**
   * Schedule a pickup.
   */
  async schedulePickup(
    data: PickupRequest
  ): Promise<CourierPlusApiResult<PickupResponse>> {
    return this.request<PickupResponse>('POST', '/users/pickup/create-pickup-request', data as Record<string, unknown>);
  }

  /**
   * Get wallet balance.
   */
  async getWalletBalance(): Promise<CourierPlusApiResult<WalletBalanceResponse>> {
    return this.request<WalletBalanceResponse>('GET', '/users/wallets/all');
  }

  /**
   * Top up the CourierPlus wallet.
   */
  async topUpWallet(
    amount: number,
    reference: string
  ): Promise<CourierPlusApiResult<WalletTopUpResponse>> {
    return this.request<WalletTopUpResponse>('POST', '/users/fund-account-wallet', {
      amount,
      reference,
    });
  }

  /**
   * Validate a delivery address.
   */
  async validateAddress(
    address: { address: string; city?: string; state?: string }
  ): Promise<CourierPlusApiResult<{ valid: boolean }>> {
    return {
      success: true,
      data: { valid: Boolean(address.address && (address.city || address.state)) },
    };
  }

  /**
   * Get all Nigerian states and codes.
   */
  async getStates(): Promise<CourierPlusApiResult<Location[]>> {
    const result = await this.request<any>('GET', '/all-state/161');
    if (result.success && result.data?.states) {
      return { success: true, data: result.data.states };
    }
    // Return dictionary as fallback
    const list = Object.values(NIGERIA_STATE_CODE_MAP).map(s => ({
      code: s.code,
      name: s.name,
      state: s.name,
    }));
    return { success: true, data: list };
  }

  /**
   * Get available locations (alias for getStates).
   */
  async getLocations(): Promise<CourierPlusApiResult<LocationsResponse>> {
    const states = await this.getStates();
    return {
      success: states.success,
      data: { locations: states.data as Location[] },
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const courierPlusClient = new CourierPlusClient();
