import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../utils/socket';

type User = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  savedLocations?: { name: string; address: string; lat?: number; lng?: number }[];
  emergencyContacts?: { name: string; relation: string; phone: string }[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load auth state from storage on startup
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@ematix_token');
        const storedUser = await AsyncStorage.getItem('@ematix_user');
        const storedTimestamp = await AsyncStorage.getItem('@ematix_login_timestamp');

        if (storedToken && storedUser && storedTimestamp) {
          const timestamp = parseInt(storedTimestamp, 10);
          const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
          
          if (Date.now() - timestamp <= fiveDaysInMs) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            // The socket handshake requires this token, so it must be handed
            // over before any ride screen mounts.
            socketService.setToken(storedToken);
          } else {
            // Token expired based on local 5-day rule
            await AsyncStorage.multiRemove(['@ematix_token', '@ematix_user', '@ematix_login_timestamp']);
          }
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem('@ematix_token', authToken);
    await AsyncStorage.setItem('@ematix_user', JSON.stringify(userData));
    await AsyncStorage.setItem('@ematix_login_timestamp', Date.now().toString());
    socketService.setToken(authToken);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(['@ematix_token', '@ematix_user', '@ematix_login_timestamp']);
    socketService.disconnect();
    socketService.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
