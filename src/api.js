import axios from 'axios';
import { reactive } from 'vue';

const api = axios.create({ baseURL: '/api' });

// Who is signed in (via Cloudflare Access or Tailscale) and which member they are
export const session = reactive({
  loaded: false,
  login: null,
  member: null,
  members: [],
  unclaimed: [],
  error: '',
});

export function errorMessage(error) {
  return error.response?.data?.error || 'Something went wrong, try again.';
}

export async function loadSession() {
  try {
    const { data } = await api.get('/me');
    Object.assign(session, data, { error: '' });
  } catch (error) {
    session.error = errorMessage(error);
  } finally {
    session.loaded = true;
  }
}

export async function claimMember(member) {
  const { data } = await api.post('/me/claim', { member });
  session.member = data.member;
}

export default api;
