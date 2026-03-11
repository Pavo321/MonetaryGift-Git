import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://009d-2402-a00-10a-78ce-a0ac-2e70-665d-c1e5.ngrok-free.app';

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
      'ngrok-skip-browser-warning': 'true',
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

  async register(name: string, place: string, email?: string, pincode?: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({name, place, email, pincode}),
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
  async createEvent(eventName: string, eventDate: string, hostMessage?: string) {
    return this.request('/api/app/events', {
      method: 'POST',
      body: JSON.stringify({eventName, eventDate, hostMessage}),
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
}

export const api = new ApiService();
