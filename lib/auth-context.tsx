"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";

type AuthContextValue = {
  user: User | null;
  /** Apelido escolhido pelo usuário (guardado como displayName do Firebase Auth). */
  nickname: string | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setNickname(firebaseUser?.displayName ?? null);
      setLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    user,
    nickname,
    loading,
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpWithEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signOut: async () => {
      await firebaseSignOut(auth);
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    updateNickname: async (value) => {
      if (!auth.currentUser) return;
      const trimmed = value.trim();
      await updateProfile(auth.currentUser, { displayName: trimmed || null });
      setNickname(trimmed || null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
