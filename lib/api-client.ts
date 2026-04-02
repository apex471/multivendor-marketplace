/**
 * API Client for backend communication
 * Base configuration for making HTTP requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestConfig extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { token, ...customConfig } = config;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (customConfig.headers) {
      Object.assign(headers, customConfig.headers);
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...customConfig,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(data: any) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(token: string) {
    return this.request('/auth/logout', {
      method: 'POST',
      token,
    });
  }

  // Product endpoints
  async getProducts(filters?: any) {
    const queryParams = new URLSearchParams(filters);
    return this.request(`/products?${queryParams}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data: any, token: string) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateProduct(id: string, data: any, token: string) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteProduct(id: string, token: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Vendor endpoints
  async getVendors(filters?: any) {
    const queryParams = new URLSearchParams(filters);
    return this.request(`/vendors?${queryParams}`);
  }

  async getVendor(id: string) {
    return this.request(`/vendors/${id}`);
  }

  async getNearbyVendors(lat: number, lng: number, radius: number = 10) {
    return this.request(`/vendors/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  // Post endpoints
  async getPosts(page: number = 1, limit: number = 20) {
    return this.request(`/posts?page=${page}&limit=${limit}`);
  }

  async getPost(id: string) {
    return this.request(`/posts/${id}`);
  }

  async createPost(data: any, token: string) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async likePost(id: string, token: string) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST',
      token,
    });
  }

  async commentOnPost(id: string, content: string, token: string) {
    return this.request(`/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      token,
    });
  }

  // Story endpoints
  async getStories(token: string) {
    return this.request('/stories', { token });
  }

  async createStory(data: any, token: string) {
    return this.request('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  // Order endpoints
  async getOrders(token: string) {
    return this.request('/orders', { token });
  }

  async getOrder(id: string, token: string) {
    return this.request(`/orders/${id}`, { token });
  }

  async createOrder(data: any, token: string) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  // Cart endpoints
  async getCart(token: string) {
    return this.request('/cart', { token });
  }

  async addToCart(productId: string, data: any, token: string) {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, ...data }),
      token,
    });
  }

  async updateCartItem(itemId: string, quantity: number, token: string) {
    return this.request(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
      token,
    });
  }

  async removeFromCart(itemId: string, token: string) {
    return this.request(`/cart/items/${itemId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Logistics endpoints
  async getLogisticsProviders() {
    return this.request('/logistics/providers');
  }

  async getLogisticsProvider(id: string) {
    return this.request(`/logistics/providers/${id}`);
  }

  async selectLogisticsProvider(providerId: string, token: string) {
    return this.request('/logistics/select', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
      token,
    });
  }

  async getSelectedLogisticsProvider(token: string) {
    return this.request('/logistics/selected', { token });
  }

  async updateLogisticsSettings(settings: any, token: string) {
    return this.request('/logistics/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
      token,
    });
  }

  async getLogisticsPerformance(token: string) {
    return this.request('/logistics/performance', { token });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
