import AsyncStorage from '@react-native-async-storage/async-storage';

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

const BASE_URL = 'https://5989-2402-a00-10a-78ce-1401-55b5-d1b1-c29.ngrok-free.app';

const TOKEN_KEY = '@mahotsava_token';
const USER_KEY = '@mahotsava_user';

class ApiService {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem(TOKEN_KEY);
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

  // Callback for handling session expiry (set by App.tsx)
  onSessionExpired: (() => void) | null = null;

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

    // Handle 401 - clear stale token and notify app to redirect to login
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
    return this.request('/api/auth/me');
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
    return this.request('/api/app/events');
  }

  async getEventDetails(eventId: number) {
    return this.request(`/api/app/events/${eventId}`);
  }

  getEventQrUrl(eventId: number): string {
    return `${BASE_URL}/api/app/events/${eventId}/qr`;
  }

  getAuthToken(): string | null {
    return this.token;
  }

  // Helpers
  async getHelpers(eventId: number) {
    return this.request(`/api/app/events/${eventId}/helpers`);
  }

  async addHelper(eventId: number, phoneNumber: string, canExpense: boolean = false, helperName?: string) {
    return this.request(`/api/app/events/${eventId}/helpers`, {
      method: 'POST',
      body: JSON.stringify({phoneNumber, canExpense, helperName}),
    });
  }

  async removeHelper(eventId: number, helperId: number) {
    return this.request(`/api/app/events/${eventId}/helpers/${helperId}`, {
      method: 'DELETE',
    });
  }

  // Settlement
  async settleWithHelper(eventId: number, helperId: number, amount: number, note?: string) {
    return this.request(`/api/app/events/${eventId}/settle`, {
      method: 'POST',
      body: JSON.stringify({helperId, amount, note}),
    });
  }

  async getSettlements(eventId: number) {
    return this.request(`/api/app/events/${eventId}/settlements`);
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
    return this.request('/api/app/helper/collect', {
      method: 'POST',
      body: JSON.stringify({eventId, guestName, guestPlace, guestPhone, amount, paymentMethod}),
    });
  }

  // Expense (Helper)
  async recordExpense(eventId: number, reason: string, amount: number) {
    return this.request('/api/app/helper/expense', {
      method: 'POST',
      body: JSON.stringify({eventId, reason, amount}),
    });
  }

  async getExpenses(eventId: number) {
    return this.request(`/api/app/events/${eventId}/expenses`);
  }

  // Verify
  async verifyPayment(qrData: string) {
    return this.request('/api/app/verify', {
      method: 'POST',
      body: JSON.stringify({qrData}),
    });
  }

  // Helper: get assigned events
  async getHelperEvents() {
    return this.request('/api/app/helper/events');
  }

  // Helper validate
  async validateHelperAccess(eventId: number) {
    return this.request('/api/app/helper/validate', {
      method: 'POST',
      body: JSON.stringify({eventId}),
    });
  }

  // Profile
  async getProfile() {
    return this.request('/api/app/profile');
  }

  async updateProfile(data: {name?: string; place?: string; email?: string; pincode?: string}) {
    return this.request('/api/app/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
