import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export type RouteStopInput = {
  name: string;
  lat: number;
  lng: number;
  distanceToNextKm: number | null;
};

export type RouteStopResponse = {
  stopOrder: number;
  name: string;
  lat: number;
  lng: number;
  distanceToNextKm: number | null;
};

const BASE_URL = 'https://686f-2402-a00-10a-78ce-59b5-a603-701c-e60.ngrok-free.app';

const TOKEN_KEY = '@mahotsava_token';
const USER_KEY = '@mahotsava_user';
const CACHE_PREFIX = '@cache_';
const QUEUE_KEY = '@offline_queue';

type QueuedRequest = {
  id: string;
  path: string;
  method: string;
  body?: string;
  timestamp: number;
};

class ApiService {
  private token: string | null = null;
  isOnline: boolean = true;

  async init() {
    this.token = await AsyncStorage.getItem(TOKEN_KEY);
    // Monitor connectivity
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = !!(state.isConnected && state.isInternetReachable);
      if (wasOffline && this.isOnline) {
        this.syncQueue();
      }
    });
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }

  async getUser() {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  async setUser(user: any) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getToken() {
    return this.token;
  }

  onSessionExpired: (() => void) | null = null;

  // Cache helpers
  private cacheKey(path: string) {
    return CACHE_PREFIX + path.replace(/\//g, '_');
  }

  private async saveCache(path: string, data: any) {
    try {
      await AsyncStorage.setItem(this.cacheKey(path), JSON.stringify({data, ts: Date.now()}));
    } catch {}
  }

  private async loadCache(path: string): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(this.cacheKey(path));
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch {
      return null;
    }
  }

  // Offline queue helpers
  private async enqueue(path: string, method: string, body?: string) {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: QueuedRequest[] = raw ? JSON.parse(raw) : [];
      queue.push({id: Date.now() + '_' + Math.random(), path, method, body, timestamp: Date.now()});
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  async syncQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      const queue: QueuedRequest[] = JSON.parse(raw);
      if (queue.length === 0) return;

      const remaining: QueuedRequest[] = [];
      for (const item of queue) {
        try {
          await this.request(item.path, {method: item.method, body: item.body});
        } catch {
          remaining.push(item);
        }
      }
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch {}
  }

  async getPendingQueueCount(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: any = {
      'Content-Type': 'application/json',
...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      await this.clearToken();
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
      return {success: false, message: 'Session expired. Please login again.'};
    }

    const data = await response.json();
    return data;
  }

  // GET with offline cache fallback
  private async get(path: string): Promise<any> {
    try {
      const data = await this.request(path);
      if (data && data.success !== false) {
        await this.saveCache(path, data);
        this.isOnline = true;
      }
      return data;
    } catch {
      this.isOnline = false;
      const cached = await this.loadCache(path);
      if (cached) return {...cached, _fromCache: true};
      throw new Error('No internet connection and no cached data available');
    }
  }

  // POST/DELETE — queue if offline
  private async mutate(path: string, method: string, body?: object): Promise<any> {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    try {
      const data = await this.request(path, {method, body: bodyStr});
      this.isOnline = true;
      return data;
    } catch {
      this.isOnline = false;
      if (method !== 'DELETE') {
        await this.enqueue(path, method, bodyStr);
        return {success: true, _queued: true, message: 'Saved offline. Will sync when connected.'};
      }
      throw new Error('Cannot delete while offline');
    }
  }

  // Auth
  async sendOtp(phoneNumber: string) {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({phoneNumber}),
    });
  }

  async verifyOtp(phoneNumber: string, otp: string) {
    const data = await this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({phoneNumber, otp}),
    });
    if (data.success && data.sessionToken) {
      await this.setToken(data.sessionToken);
      if (data.user) {
        await this.setUser(data.user);
      }
    }
    return data;
  }

  async register(name: string, place: string, email?: string, pincode?: string, role?: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({name, place, email, pincode, role}),
    });
    if (data.success && data.user) {
      await this.setUser(data.user);
    }
    return data;
  }

  async getMe() {
    return this.get('/api/auth/me');
  }

  async logout() {
    await this.request('/api/auth/logout', {method: 'POST'});
    await this.clearToken();
  }

  // Events
  async createEvent(
    eventName: string,
    eventDate: string,
    hostMessage?: string,
    eventType?: string,
    confirmationType?: string,
    capacity?: number,
    pricePerPerson?: number,
    location?: string,
    category?: string,
    eventTime?: string,
    routeStops?: RouteStopInput[],
    totalDistanceKm?: number,
  ) {
    return this.request('/api/app/events', {
      method: 'POST',
      body: JSON.stringify({eventName, eventDate, hostMessage, eventType, confirmationType, capacity, pricePerPerson, location, category, eventTime, routeStops, totalDistanceKm}),
    });
  }

  async getMyEvents() {
    return this.get('/api/app/events');
  }

  async getEventDetails(eventId: number) {
    return this.get(`/api/app/events/${eventId}`);
  }

  async deleteEvent(eventId: number) {
    return this.mutate(`/api/app/events/${eventId}`, 'DELETE');
  }

  getEventQrUrl(eventId: number): string {
    return `${BASE_URL}/api/app/events/${eventId}/qr`;
  }

  getAuthToken(): string | null {
    return this.token;
  }

  // Helpers
  async getHelpers(eventId: number) {
    return this.get(`/api/app/events/${eventId}/helpers`);
  }

  async addHelper(eventId: number, phoneNumber: string, canExpense: boolean = false, helperName?: string) {
    return this.mutate(`/api/app/events/${eventId}/helpers`, 'POST', {phoneNumber, canExpense, helperName});
  }

  async removeHelper(eventId: number, helperId: number) {
    return this.mutate(`/api/app/events/${eventId}/helpers/${helperId}`, 'DELETE');
  }

  // Settlement
  async settleWithHelper(eventId: number, helperId: number, amount: number, note?: string) {
    return this.mutate(`/api/app/events/${eventId}/settle`, 'POST', {helperId, amount, note});
  }

  async getSettlements(eventId: number) {
    return this.get(`/api/app/events/${eventId}/settlements`);
  }

  // Collection (Helper)
  async collectMoney(
    eventId: number,
    guestName: string,
    guestPhone: string,
    amount: number,
    guestPlace?: string,
    paymentMethod: string = 'CASH',
  ) {
    return this.mutate('/api/app/helper/collect', 'POST', {eventId, guestName, guestPlace, guestPhone, amount, paymentMethod});
  }

  // Host: accept gift directly
  async hostCollectMoney(
    eventId: number,
    guestName: string,
    guestPhone: string,
    amount: number,
    guestPlace?: string,
    paymentMethod: string = 'CASH',
  ) {
    return this.mutate('/api/app/host/collect', 'POST', {eventId, guestName, guestPlace, guestPhone, amount, paymentMethod});
  }

  // Expense (Helper)
  async recordExpense(eventId: number, reason: string, amount: number) {
    return this.mutate('/api/app/helper/expense', 'POST', {eventId, reason, amount});
  }

  async getExpenses(eventId: number) {
    return this.get(`/api/app/events/${eventId}/expenses`);
  }

  // Verify
  async verifyPayment(qrData: string) {
    return this.mutate('/api/app/verify', 'POST', {qrData});
  }

  // Event soft delete / restore
  async getDeletedEvents() {
    return this.get('/api/app/events/deleted');
  }

  async restoreEvent(eventId: number) {
    return this.mutate(`/api/app/events/${eventId}/restore`, 'POST');
  }

  // Analytics: get payments across all host events with filters
  async getAnalyticsPayments(params: {
    eventId?: number;
    guestName?: string;
    guestPlace?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.eventId != null) query.set('eventId', String(params.eventId));
    if (params.guestName) query.set('guestName', params.guestName);
    if (params.guestPlace) query.set('guestPlace', params.guestPlace);
    if (params.status) query.set('status', params.status);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    const qs = query.toString();
    return this.get(`/api/app/analytics/payments${qs ? '?' + qs : ''}`);
  }

  // Helper: get assigned events
  async getHelperEvents() {
    return this.get('/api/app/helper/events');
  }

  // Helper validate
  async validateHelperAccess(eventId: number) {
    return this.mutate('/api/app/helper/validate', 'POST', {eventId});
  }

  // Profile
  async getProfile() {
    return this.get('/api/app/profile');
  }

  async updateProfile(data: {name?: string; place?: string; email?: string; pincode?: string}) {
    return this.mutate('/api/app/profile', 'PUT', data);
  }

  // Capacity Events — Host actions
  async confirmEvent(eventId: number) {
    return this.request(`/api/app/events/${eventId}/confirm`, {method: 'POST'});
  }

  async cancelEvent(eventId: number) {
    return this.request(`/api/app/events/${eventId}/cancel`, {method: 'DELETE'});
  }

  async getParticipants(eventId: number) {
    return this.request(`/api/app/events/${eventId}/participants`);
  }

  // Capacity Events — Guest actions
  async joinEvent(eventId: number, fromStopOrder?: number, toStopOrder?: number, seatsBooked: number = 1) {
    return this.request(`/api/app/events/${eventId}/join`, {
      method: 'POST',
      body: JSON.stringify({fromStopOrder, toStopOrder, seatsBooked}),
    });
  }

  async getRouteAvailability(eventId: number, from: number, to: number) {
    return this.request(`/api/app/events/${eventId}/route-availability?from=${from}&to=${to}`);
  }

  async findNearestStop(eventId: number, lat: number, lng: number) {
    return this.request(`/api/app/events/${eventId}/find-stop?lat=${lat}&lng=${lng}`);
  }

  async confirmJoinPayment(hisabId: number, transactionId: string) {
    return this.request(`/api/app/hisab/${hisabId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({transactionId}),
    });
  }

  async exitEvent(hisabId: number) {
    return this.request(`/api/app/hisab/${hisabId}/exit`, {method: 'POST'});
  }

  async getMyJoinedEvents() {
    return this.request('/api/app/guest/events');
  }

  // Browse Events (Guest discovery)
  async browseEvents(name?: string, location?: string, category?: string) {
    const params = new URLSearchParams();
    if (name)     params.append('name', name);
    if (location) params.append('location', location);
    if (category && category !== 'ALL') params.append('category', category);
    const qs = params.toString();
    return this.request(`/api/app/events/browse${qs ? '?' + qs : ''}`);
  }
}

export const api = new ApiService();
