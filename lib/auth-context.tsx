"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
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
  /** true quando o login foi feito com e-mail/senha (tem senha pra trocar); false pra login só via Google. */
  hasPasswordProvider: boolean;
  reauthenticateWithPassword: (password: string) => Promise<void>;
  reauthenticateWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
    hasPasswordProvider: user?.providerData.some((p) => p.providerId === "password") ?? false,
    reauthenticateWithPassword: async (password) => {
      if (!auth.currentUser?.email) return;
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
    },
    reauthenticateWithGoogle: async () => {
      if (!auth.currentUser) return;
      await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
    },
    deleteAccount: async () => {
      if (!auth.currentUser) return;
      await deleteUser(auth.currentUser);
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
