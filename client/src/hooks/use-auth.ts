import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  auth, 
  loginWithEmail, 
  registerWithEmail, 
  logout as firebaseLogout,
  getUserProfile,
  subscribeToAuth,
  type UserProfile
} from "@/lib/firebase";

// Re-export UserProfile as PublicUser for backward compatibility
export type PublicUser = UserProfile;

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((profile) => {
      setUser(profile);
      setIsLoading(false);
      queryClient.setQueryData(["/api/auth/user"], profile);
    });
    return () => unsubscribe();
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return loginWithEmail(credentials.email, credentials.password);
    },
    onSuccess: (profile) => {
      setUser(profile);
      queryClient.setQueryData(["/api/auth/user"], profile);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      businessName?: string;
      phone?: string;
    }) => {
      const { email, password, ...profileData } = data;
      return registerWithEmail(email, password, profileData);
    },
    onSuccess: (profile) => {
      setUser(profile);
      queryClient.setQueryData(["/api/auth/user"], profile);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: firebaseLogout,
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}
