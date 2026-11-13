import { authEndpoints } from "../config/endpoints.js";
import { api } from "../lib/api.js";

const toUser = (raw) => ({
  id: raw.customerId,
  firstName: raw.firstName,
  lastName: raw.lastName,
  email: raw.email,
  city: raw.city,
  country: raw.country,
});

export const authService = Object.freeze({
  // Returns null when there is no active session instead of failing.
  getCurrentUser: async () => {
    try {
      const { data } = await api.get(authEndpoints.me);
      return toUser(data.user);
    } catch (error) {
      if (error.status === 401) {
        return null;
      }

      throw error;
    }
  },

  login: async (email) => {
    const { data } = await api.post(authEndpoints.login, { email });
    return toUser(data.user);
  },

  logout: async () => {
    await api.post(authEndpoints.logout);
  },
});
