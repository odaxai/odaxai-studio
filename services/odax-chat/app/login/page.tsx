// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthProvider } from 'firebase/auth';
import styles from './page.module.css';

// Inner component that uses useSearchParams
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUp, loading, user } =
    useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');

  // Check if coming from app (action=google parameter)
  const isFromApp = searchParams.get('action') === 'google';

  // Show success message after login when coming from app
  useEffect(() => {
    if (user && isFromApp) {
      console.log('Auth successful in browser!');
    }
  }, [user, isFromApp]);

  // Redirect if already logged in (normal flow, not from app)
  useEffect(() => {
    if (user && !loading && !isFromApp) {
      router.push('/');
    }
  }, [user, loading, isFromApp, router]);

  // Show nothing while redirecting
  if (user && !loading && !isFromApp) {
    return null;
  }

  const validatePassword = (pwd: string): boolean => {
    const hasMinLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return hasMinLength && hasUppercase && hasNumber && hasSpecial;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!validatePassword(password)) {
      setError(
        'Password must be at least 8 characters with uppercase, number, and special character'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp(email, password, fullName);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Left Panel - Branding */}
      <div className={styles.leftPanel}>
        <div className={styles.brandContent}>
          <h1 className={styles.brandName}>OdaxAI</h1>
          <h2 className={styles.welcomeText}>Welcome back</h2>
          <p className={styles.tagline}>Continue your journey with local AI</p>
        </div>
      </div>

      {/* Success Message when logged in from app */}
      {user && isFromApp ? (
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div
              className={styles.formCard}
              style={{ textAlign: 'center', padding: '40px' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ color: '#fff', marginBottom: '16px' }}>
                Login Complete!
              </h2>
              <p style={{ color: '#aaa', marginBottom: '24px' }}>
                Signed in as{' '}
                <strong style={{ color: '#fff' }}>{user.email}</strong>
              </p>

              {returnUrl ? (
                <div style={{ marginTop: '30px' }}>
                  <a
                    href={returnUrl}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      display: 'inline-block',
                    }}
                  >
                    Return to OdaxStudio App
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  <p
                    style={{
                      color: '#888',
                      fontSize: '14px',
                      marginBottom: '15px',
                    }}
                  >
                    Sync with OdaxStudio App
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Force re-sign in to get fresh tokens
                        const result = await signInWithGoogle();
                        if (result) {
                          const credential =
                            GoogleAuthProvider.credentialFromResult(result);
                          const idToken = credential?.idToken;
                          const accessToken = credential?.accessToken;

                          if (idToken) {
                            const scheme = `odaxstudio://google-auth?id_token=${idToken}&access_token=${accessToken || ''}`;
                            setReturnUrl(scheme);
                            // Auto-redirect to app
                            window.location.href = scheme;
                          }
                        }
                      } catch (e: any) {
                        console.error('Sync failed', e);
                        if (e.code === 'auth/cancelled-popup-request') {
                          setError('Popup closed. Please try again.');
                        } else if (e.code === 'auth/popup-blocked') {
                          setError('Popup blocked. Please allow popups.');
                        } else {
                          setError('Sync failed. Please try again.');
                        }
                      }
                    }}
                    style={{
                      backgroundColor: '#22c55e',
                      color: 'white',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  >
                    Generate App Link 🔄
                  </button>
                  {error && (
                    <p
                      style={{
                        color: '#ef4444',
                        fontSize: '12px',
                        marginTop: '10px',
                      }}
                    >
                      {error}
                    </p>
                  )}
                </div>
              )}

              <p style={{ color: '#666', fontSize: '12px', marginTop: '30px' }}>
                You can close this window after returning to the app.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Right Panel - Login Form */
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            {/* Back to Chat Button */}
            <a href="/" className={styles.backButton}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back to Chat</span>
            </a>

            {/* Title */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '8px',
                }}
              >
                Sign In
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Don't have an account?{' '}
                <a
                  href="https://odaxai.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#22c55e', textDecoration: 'none' }}
                >
                  Register on odaxai.com
                </a>
              </p>
            </div>

            {/* Form Card */}
            <div className={styles.formCard}>
              {/* Info about email login */}
              <div
                className={styles.infoMessage}
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#22c55e',
                  textAlign: 'center',
                }}
              >
                📧 Sign in with your email and password
              </div>

              {/* Error Message */}
              {error && <div className={styles.errorMessage}>{error}</div>}

              {/* Sign In Form */}
              {activeTab === 'signin' && (
                <form onSubmit={handleEmailSignIn} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label>Your email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Your password</label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.rememberRow}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      />
                      <span>Keep me logged in</span>
                    </label>
                    <a href="#" className={styles.forgotLink}>
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
                  </button>
                </form>
              )}
            </div>

            {/* Footer Links */}
            <div className={styles.footerLinks}>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">About</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export wraps LoginContent in Suspense for Next.js 15 compatibility
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0d0d0d',
            color: '#888',
          }}
        >
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
