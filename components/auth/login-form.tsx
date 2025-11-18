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
   * Handles sign in form submission with retry logic and better error handling
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
        // OPTIMIZED: Verify session immediately without artificial delay
        const supabaseClient = createClient();
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
          setFormErrors({
            general: 'Session not established. Please try again.',
          });
          setIsSigningIn(false);
          return;
        }
        
        // Clear form ONLY after session is confirmed
        setSignInData({ email: '', password: '' });
        
        // OPTIMIZED: Redirect immediately - data loading will start in background
        // Redirect using window.location for more reliable navigation
        window.location.href = '/app';
        
        // Note: Toast won't show because we're redirecting, but that's okay
      } else {
        // Enhanced error messages
        let errorMessage = error.message || 'An unexpected error occurred. Please try again.';
        
        // User-friendly error messages
        if (error.message?.includes('Invalid login credentials') || 
            error.message?.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox for a verification link.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        setFormErrors({
          general: errorMessage,
        });
      }
    } catch (err) {
      logger.error('Sign in error:', err);
      setFormErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
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
      <Card className="w-full max-w-md mx-auto border-2 border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to LinkVault
          </CardTitle>
          <CardDescription className="text-gray-300 text-sm sm:text-base">
            Organize and manage your links with ease
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8">
          {error && (
            <Alert className="mb-5 border-2 border-red-500/50 bg-red-500/10 backdrop-blur-sm">
              <AlertCircle className="size-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 bg-white/5 border border-white/10">
              <TabsTrigger value="signin" className="text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md transition-all">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-gray-200">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className={`pl-10 pr-4 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.email
                          ? 'border-red-400/50 focus:border-red-400'
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
                  <Label htmlFor="signin-password" className="text-sm font-medium text-gray-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className={`pl-10 pr-12 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.password
                          ? 'border-red-400/50 focus:border-red-400'
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
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-white/10"
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
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-black font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-gray-200">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your display name"
                      value={signUpData.displayName}
                      onChange={(e) => setSignUpData({ ...signUpData, displayName: e.target.value })}
                      className={`pl-10 pr-4 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.displayName
                          ? 'border-red-400/50 focus:border-red-400'
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
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-200">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className={`pl-10 pr-4 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.email
                          ? 'border-red-400/50 focus:border-red-400'
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
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password (min. 8 characters)"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className={`pl-10 pr-12 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.password
                          ? 'border-red-400/50 focus:border-red-400'
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
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-white/10"
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
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-200">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-12 h-11 bg-white/10 border-2 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-orange-500/50 ${
                        formErrors.confirmPassword
                          ? 'border-red-400/50 focus:border-red-400'
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
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-white/10"
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
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-black font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
