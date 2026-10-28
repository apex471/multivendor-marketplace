/**
 * CourierPlus API Client
 * Base URL: https://client-api.courierplus-ng.com/api/v1/client
 *
 * All methods return a typed ApiResult with success: boolean and either data or error.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourierPlusApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ShippingRateRequest {
  origin: string;
  destination: string;
  weight: number;
  description?: string;
  quantity?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface ShippingRate {
  id?: string;
  name?: string;
  carrier?: string;
  price?: number;
  amount?: number;
  currency?: string;
  estimatedDelivery?: string;
  deliveryDays?: string | number;
  [key: string]: unknown;
}

export interface ShippingRatesResponse {
  rates: ShippingRate[];
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

export interface AddressValidationRequest {
  address: string;
  city?: string;
  state?: string;
  [key: string]: unknown;
}

export interface AddressValidationResponse {
  valid?: boolean;
  isValid?: boolean;
  formattedAddress?: string;
  [key: string]: unknown;
}

export interface Location {
  id?: string;
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
        // 20-second timeout via AbortSignal
        signal: AbortSignal.timeout(20_000),
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
        console.error(`[CourierPlus] ${method} ${path} → ${response.status}`, errData);
        return { success: false, error: message };
      }

      // Some CourierPlus endpoints wrap data; unwrap if present
      const d = responseData as Record<string, unknown>;
      const unwrapped =
        d?.data !== undefined ? (d.data as T) : (responseData as T);

      return { success: true, data: unwrapped };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown network error';
      console.error(`[CourierPlus] ${method} ${path} network error:`, err);
      return { success: false, error: message };
    }
  }

  // ── Public API Methods ────────────────────────────────────────────────────

  /**
   * Get shipping rates for a parcel from origin to destination.
   */
  async getShippingRates(
    origin: string,
    destination: string,
    weight: number,
    options?: {
      description?: string;
      quantity?: number;
      dimensions?: { length?: number; width?: number; height?: number };
    }
  ): Promise<CourierPlusApiResult<ShippingRatesResponse>> {
    const payload: Record<string, unknown> = {
      origin,
      destination,
      weight,
      ...(options?.description && { description: options.description }),
      ...(options?.quantity && { quantity: options.quantity }),
      ...(options?.dimensions && { dimensions: options.dimensions }),
    };
    return this.request<ShippingRatesResponse>('POST', '/rates', payload);
  }

  /**
   * Create a waybill / shipment.
   */
  async createWaybill(
    data: WaybillRequest
  ): Promise<CourierPlusApiResult<WaybillResponse>> {
    return this.request<WaybillResponse>('POST', '/waybills', data as Record<string, unknown>);
  }

  /**
   * Track a shipment by its waybill number.
   */
  async trackShipment(
    waybillNumber: string
  ): Promise<CourierPlusApiResult<TrackingResponse>> {
    return this.request<TrackingResponse>('GET', `/track/${encodeURIComponent(waybillNumber)}`);
  }

  /**
   * Schedule a pickup.
   */
  async schedulePickup(
    data: PickupRequest
  ): Promise<CourierPlusApiResult<PickupResponse>> {
    return this.request<PickupResponse>('POST', '/pickups', data as Record<string, unknown>);
  }

  /**
   * Get wallet balance.
   */
  async getWalletBalance(): Promise<CourierPlusApiResult<WalletBalanceResponse>> {
    return this.request<WalletBalanceResponse>('GET', '/wallet/balance');
  }

  /**
   * Top up the CourierPlus wallet.
   */
  async topUpWallet(
    amount: number,
    reference: string
  ): Promise<CourierPlusApiResult<WalletTopUpResponse>> {
    return this.request<WalletTopUpResponse>('POST', '/wallet/topup', {
      amount,
      reference,
    });
  }

  /**
   * Validate a delivery address.
   */
  async validateAddress(
    address: AddressValidationRequest
  ): Promise<CourierPlusApiResult<AddressValidationResponse>> {
    return this.request<AddressValidationResponse>(
      'POST',
      '/address/validate',
      address as Record<string, unknown>
    );
  }

  /**
   * Get all available pickup / delivery locations.
   */
  async getLocations(): Promise<CourierPlusApiResult<LocationsResponse>> {
    return this.request<LocationsResponse>('GET', '/locations');
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const courierPlusClient = new CourierPlusClient();
