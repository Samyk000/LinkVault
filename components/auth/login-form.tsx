/**
 * @file components/auth/login-form.tsx
 * @description Main login form component with email/password authentication
 * @created 2025-01-01
 */

'use client';

import React, { useState, useEffect } from 'react';
import { logger } from "@/lib/utils/logger";
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import type { SignInData, SignUpData } from '@/lib/types/auth';
import { AUTH_CONSTANTS, AUTH_ERROR_MESSAGES } from '@/constants/auth.constants';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

/**
 * Main login form component with sign in and sign up options
 * @returns {JSX.Element} Login form component
 */
export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, error, loading, clearError, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const redirectTo = searchParams?.get('redirectTo') || '/app';
      router.replace(redirectTo);
    }
  }, [user, loading, router, searchParams]);

  // Form state
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Handle URL tab parameter
  useEffect(() => {
    try {
      const tab = searchParams?.get('tab');
      if (tab === 'signup') {
        setActiveTab('signup');
      }

      // Show message if session expired
      const expired = searchParams?.get('expired');
      if (expired === 'true') {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        // Remove expired param from URL
        router.replace('/login');
      }
    } catch (error) {
      // Handle search params error gracefully
      logger.warn('Error reading search params:', error);
    }
  }, [searchParams, router, toast]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Sign in form data
  const [signInData, setSignInData] = useState<SignInData>({
    email: '',
    password: '',
  });

  // Sign up form data
  const [signUpData, setSignUpData] = useState<SignUpData>({
    email: '',
    password: '',
    displayName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * Clear errors when user starts typing
   */
  const handleSignInEmailChange = (value: string) => {
    setSignInData({ ...signInData, email: value });
    if (formErrors.email || formErrors.general) {
      setFormErrors({ ...formErrors, email: undefined, general: undefined });
    }
  };

  const handleSignInPasswordChange = (value: string) => {
    setSignInData({ ...signInData, password: value });
    if (formErrors.password || formErrors.general) {
      setFormErrors({ ...formErrors, password: undefined, general: undefined });
    }
  };

  const handleSignUpEmailChange = (value: string) => {
    setSignUpData({ ...signUpData, email: value });
    if (formErrors.email || formErrors.general) {
      setFormErrors({ ...formErrors, email: undefined, general: undefined });
    }
  };

  const handleSignUpPasswordChange = (value: string) => {
    setSignUpData({ ...signUpData, password: value });
    if (formErrors.password || formErrors.general) {
      setFormErrors({ ...formErrors, password: undefined, general: undefined });
    }
  };

  const handleSignUpNameChange = (value: string) => {
    setSignUpData({ ...signUpData, displayName: value });
    if (formErrors.displayName || formErrors.general) {
      setFormErrors({ ...formErrors, displayName: undefined, general: undefined });
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (formErrors.confirmPassword || formErrors.general) {
      setFormErrors({ ...formErrors, confirmPassword: undefined, general: undefined });
    }
  };

  /**
   * Validates email format
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validates password strength
   * @param {string} password - Password to validate
   * @returns {boolean} Whether password meets requirements
   */
  const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };

  /**
   * Validates sign in form
   * @returns {boolean} Whether form is valid
   */
  const validateSignInForm = (): boolean => {
    const errors: FormErrors = {};

    if (!signInData.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(signInData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!signInData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Validates sign up form
   * @returns {boolean} Whether form is valid
   */
  const validateSignUpForm = (): boolean => {
    const errors: FormErrors = {};

    if (!signUpData.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(signUpData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!signUpData.password) {
      errors.password = 'Password is required';
    } else if (!isValidPassword(signUpData.password)) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (signUpData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!signUpData.displayName?.trim()) {
      errors.displayName = 'Display name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles sign in form submission with immediate redirect
   * @param {React.FormEvent} e - Form event
   */
  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormErrors({});

    if (!validateSignInForm()) return;

    // Prevent double submission
    if (isSigningIn) return;

    try {
      setIsSigningIn(true);

      // Check if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setFormErrors({
          general: 'You are currently offline. Please check your internet connection and try again.',
        });
        setIsSigningIn(false);
        return;
      }

      const { error } = await signIn(signInData);

      if (!error) {
        // Clear form after successful sign in
        setSignInData({ email: '', password: '' });

        // Redirect immediately - the AuthProvider will handle session setup
        router.push('/app');
      } else {
        // Enhanced error messages
        let errorMessage = error.message || AUTH_ERROR_MESSAGES.UNEXPECTED_ERROR;

        // User-friendly error messages
        if (error.message?.includes('Invalid login credentials') ||
          error.message?.includes('Invalid email or password')) {
          errorMessage = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED;
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS;
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = AUTH_ERROR_MESSAGES.NETWORK_ERROR;
        }

        setFormErrors({
          general: errorMessage,
        });
        setIsSigningIn(false);
      }
    } catch (err) {
      logger.error('Sign in error:', err);
      setFormErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
      setIsSigningIn(false);
    }
  };


  /**
   * Handles sign up form submission with better error handling
   * @param {React.FormEvent} e - Form event
   */
  const handleSignUp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormErrors({});

    if (!validateSignUpForm()) return;

    // Prevent double submission
    if (isSigningUp) return;

    try {
      setIsSigningUp(true);

      // Check if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setFormErrors({
          general: 'You are currently offline. Please check your internet connection and try again.',
        });
        setIsSigningUp(false);
        return;
      }

      const { error } = await signUp(signUpData);

      if (!error) {
        // Show email verification notification
        toast({
          title: "Check your email",
          description: "Verification link sent",
          variant: "success",
          icon: <CheckCircle className="size-4" />,
        });

        // Switch to sign in tab
        setActiveTab('signin');

        // Clear the signup form
        setSignUpData({ email: '', password: '', displayName: '' });
        setConfirmPassword('');
      } else {
        // Enhanced error messages
        let errorMessage = error.message || 'An unexpected error occurred. Please try again.';

        // User-friendly error messages
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message?.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please use a stronger password (minimum 10 characters).';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }

        setFormErrors({
          general: errorMessage,
        });
      }
    } catch (err) {
      logger.error('Sign up error:', err);
      setFormErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none transition-all duration-300">
        <CardHeader className="text-center pb-6 border-b border-gray-100">
          <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-black mb-2 uppercase tracking-tight">
            {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-gray-500 font-mono text-xs uppercase tracking-wider">
            {activeTab === 'signin' ? '// Authenticate to continue' : '// Join the system'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-6">
          {error && (
            <Alert className="mb-5 border-2 border-red-500/50 bg-red-500/10 backdrop-blur-sm">
              <AlertCircle className="size-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-gray-100 p-1 rounded-none border border-gray-200">
              <TabsTrigger value="signin" className="text-xs font-mono font-bold uppercase data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-black rounded-none transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs font-mono font-bold uppercase data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-black rounded-none transition-all">Sign Up</TabsTrigger>
            </TabsList>

            <div className="relative overflow-hidden">
              <TabsContent value="signin" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                <div key="signin" className="animate-in fade-in slide-in-from-right-8 duration-500 ease-out fill-mode-both">
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="signin-email" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signInData.email}
                          onChange={(e) => handleSignInEmailChange(e.target.value)}
                          className={`pl-10 pr-4 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.email
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="email"
                          aria-describedby={formErrors.email ? 'signin-email-error' : undefined}
                        />
                      </div>
                      {formErrors.email && (
                        <p id="signin-email-error" className="text-sm text-red-300 mt-1">
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="signin-password" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(e) => handleSignInPasswordChange(e.target.value)}
                          className={`pl-10 pr-12 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.password
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="current-password"
                          aria-describedby={formErrors.password ? 'signin-password-error' : undefined}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-black hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSigningIn || isSigningUp}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      {formErrors.password && (
                        <p id="signin-password-error" className="text-sm text-red-300 mt-1">
                          {formErrors.password}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-[#FF4D00] hover:bg-black hover:text-white text-white font-mono font-bold uppercase tracking-widest text-sm rounded-none transition-all duration-300 shadow-sm hover:shadow-md active:transform active:scale-[0.98]"
                      disabled={isSigningIn}
                    >
                      {isSigningIn ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin-gpu" />
                          Logging in...
                        </>
                      ) : (
                        'Initialize Session'
                      )}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                <div key="signup" className="animate-in fade-in slide-in-from-right-8 duration-500 ease-out fill-mode-both">
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="signup-name" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Display Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your display name"
                          value={signUpData.displayName}
                          onChange={(e) => handleSignUpNameChange(e.target.value)}
                          className={`pl-10 pr-4 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.displayName
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="name"
                          aria-describedby={formErrors.displayName ? 'signup-name-error' : undefined}
                        />
                      </div>
                      {formErrors.displayName && (
                        <p id="signup-name-error" className="text-sm text-red-300 mt-1">
                          {formErrors.displayName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="signup-email" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signUpData.email}
                          onChange={(e) => handleSignUpEmailChange(e.target.value)}
                          className={`pl-10 pr-4 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.email
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="email"
                          aria-describedby={formErrors.email ? 'signup-email-error' : undefined}
                        />
                      </div>
                      {formErrors.email && (
                        <p id="signup-email-error" className="text-sm text-red-300 mt-1">
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="signup-password" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password (min. 8 characters)"
                          value={signUpData.password}
                          onChange={(e) => handleSignUpPasswordChange(e.target.value)}
                          className={`pl-10 pr-12 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.password
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="new-password"
                          aria-describedby={formErrors.password ? 'signup-password-error' : undefined}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-black hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSigningIn || isSigningUp}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      {formErrors.password && (
                        <p id="signup-password-error" className="text-sm text-red-300 mt-1">
                          {formErrors.password}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="confirm-password" className="text-xs font-mono font-bold uppercase text-gray-500">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                          className={`pl-10 pr-12 h-12 bg-gray-50 border border-gray-300 text-black placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-0 rounded-none font-mono text-sm transition-all duration-200 hover:border-gray-400 ${formErrors.confirmPassword
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                            }`}
                          disabled={isSigningIn || isSigningUp}
                          autoComplete="new-password"
                          aria-describedby={formErrors.confirmPassword ? 'confirm-password-error' : undefined}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-black hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isSigningIn || isSigningUp}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      {formErrors.confirmPassword && (
                        <p id="confirm-password-error" className="text-sm text-red-300 mt-1">
                          {formErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-[#FF4D00] hover:bg-black hover:text-white text-white font-mono font-bold uppercase tracking-widest text-sm rounded-none transition-all duration-300 shadow-sm hover:shadow-md active:transform active:scale-[0.98]"
                      disabled={isSigningUp}
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin-gpu" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
