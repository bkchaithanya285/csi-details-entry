"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface UserType {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Check for local dev session first (for fast testing)
    if (typeof window !== "undefined") {
      const devSession = sessionStorage.getItem("devAdminSession");
      if (devSession) {
        const parsedUser = JSON.parse(devSession);
        setUser(parsedUser);
        setIsAdmin(true);
        setLoading(false);
        return;
      }
    }

    // 2. Connect to Firebase Client SDK auth
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userObj: UserType = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        setUser(userObj);
        
        if (firebaseUser.email) {
          const adminEmailsStr = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
          const adminEmails = adminEmailsStr
            .split(",")
            .map((e) => e.trim().toLowerCase());
          const userEmail = firebaseUser.email.toLowerCase();
          setIsAdmin(adminEmails.includes(userEmail));
        } else {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const adminEmailsStr = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = adminEmailsStr.split(",").map((e) => e.trim().toLowerCase());

    // Local dev backup: allow offline admin access
    if (
      (trimmedEmail === "admin" || 
       trimmedEmail === "admin@csikare.org" || 
       trimmedEmail === "admin@kareieee.org" || 
       adminEmails.includes(trimmedEmail)) && 
      password === "Tony@285"
    ) {
      const mockUser = {
        uid: "mock-admin-uid",
        email: trimmedEmail,
        displayName: "CSI Admin"
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("devAdminSession", JSON.stringify(mockUser));
      }
      setUser(mockUser);
      setIsAdmin(true);
      return mockUser;
    }

    // Attempt Firebase Authentication
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("devAdminSession");
    }
    setUser(null);
    setIsAdmin(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase SignOut error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
