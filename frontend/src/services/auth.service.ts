import { apiRequest } from '../api/client';
import type {AuthUser} from '../types/auth';
export async function loginRequest(username:string,password:string):Promise<AuthUser> {
  return (await apiRequest<{user:AuthUser}>('/api/auth/login',{method:'POST',body:{username,password}})).user;
}
export async function getCurrentUser():Promise<AuthUser> {
  return (await apiRequest<{user:AuthUser}>('/api/auth/me')).user;
}
export async function logoutRequest():Promise<void> {
  await apiRequest('/api/auth/logout',{method:'POST'});
}
