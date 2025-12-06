/**
 * @file components/auth/login-form.tsx
 * @description Main login form component with email/password authentication
 * @created 2025-01-01
 * @updated 2025-12-06
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
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle, UserCircle, ArrowRight } from 'lucide-react';
import type { SignInData, SignUpData } from '@/lib/types/auth'; // Ensure this matches actual file
import { AUTH_ERROR_MESSAGES } from '@/constants/auth.constants';
import { GuestModeWarningDialog } from '@/components/modals/guest-mode-warning-dialog';
import { guestStorageService } from '@/lib/services/guest-storage.service';
import { AnimatedButton } from '@/components/ui/animated-button';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, error, loading, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      const redirectTo = searchParams?.get('redirectTo') || '/app';
      router.replace(redirectTo);
    }
  }, [user, loading, router, searchParams]);

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  useEffect(() => {
    try {
      const tab = searchParams?.get('tab');
      if (tab === 'signup') {
        setActiveTab('signup');
      }
      const guestParam = searchParams?.get('guest');
      if (guestParam === 'true') {
        setShowGuestWarning(true);
        router.replace('/login');
      }
      const expired = searchParams?.get('expired');
      if (expired === 'true') {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        router.replace('/login');
      }
    } catch (error) {
      logger.warn('Error reading search params:', error);
    }
  }, [searchParams, router, toast]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [signInData, setSignInData] = useState<SignInData>({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState<SignUpData>({ email: '', password: '', displayName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignInEmailChange = (value: string) => {
    setSignInData({ ...signInData, email: value });
    if (formErrors.email || formErrors.general) setFormErrors({ ...formErrors, email: undefined, general: undefined });
  };
  const handleSignInPasswordChange = (value: string) => {
    setSignInData({ ...signInData, password: value });
    if (formErrors.password || formErrors.general) setFormErrors({ ...formErrors, password: undefined, general: undefined });
  };
  const handleSignUpEmailChange = (value: string) => {
    setSignUpData({ ...signUpData, email: value });
    if (formErrors.email || formErrors.general) setFormErrors({ ...formErrors, email: undefined, general: undefined });
  };
  const handleSignUpPasswordChange = (value: string) => {
    setSignUpData({ ...signUpData, password: value });
    if (formErrors.password || formErrors.general) setFormErrors({ ...formErrors, password: undefined, general: undefined });
  };
  const handleSignUpNameChange = (value: string) => {
    setSignUpData({ ...signUpData, displayName: value });
    if (formErrors.displayName || formErrors.general) setFormErrors({ ...formErrors, displayName: undefined, general: undefined });
  };
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (formErrors.confirmPassword || formErrors.general) setFormErrors({ ...formErrors, confirmPassword: undefined, general: undefined });
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password: string) => password.length >= 8;

  const validateSignInForm = (): boolean => {
    const errors: FormErrors = {};
    if (!signInData.email) errors.email = 'Email is required';
    else if (!isValidEmail(signInData.email)) errors.email = 'Enter a valid email';
    if (!signInData.password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignUpForm = (): boolean => {
    const errors: FormErrors = {};
    if (!signUpData.email) errors.email = 'Email is required';
    else if (!isValidEmail(signUpData.email)) errors.email = 'Enter a valid email';
    if (!signUpData.password) errors.password = 'Password is required';
    else if (!isValidPassword(signUpData.password)) errors.password = 'Min 8 chars required';
    if (!confirmPassword) errors.confirmPassword = 'Confirm your password';
    else if (signUpData.password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!signUpData.displayName?.trim()) errors.displayName = 'Display name required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateSignInForm()) return;
    if (isSigningIn) return;
    try {
      setIsSigningIn(true);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setFormErrors({ general: 'You are offline.' });
        setIsSigningIn(false);
        return;
      }
      const { error } = await signIn(signInData);
      if (!error) {
        setSignInData({ email: '', password: '' });
        router.push('/app');
      } else {
        let errorMessage = error.message || AUTH_ERROR_MESSAGES.UNEXPECTED_ERROR;
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')) {
          errorMessage = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
        }
        setFormErrors({ general: errorMessage });
        setIsSigningIn(false);
      }
    } catch (err) {
      logger.error('Sign in error:', err);
      setFormErrors({ general: 'Unexpected error.' });
      setIsSigningIn(false);
    }
  };

  const handleGuestModeConfirm = () => {
    guestStorageService.activateGuestMode();
    setShowGuestWarning(false);
    window.location.replace('/app');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateSignUpForm()) return;
    if (isSigningUp) return;
    try {
      setIsSigningUp(true);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setFormErrors({ general: 'You are offline.' });
        setIsSigningUp(false);
        return;
      }
      const { error } = await signUp(signUpData);
      if (!error) {
        toast({ title: "Check your email", description: "Verification link sent", variant: "success", icon: <CheckCircle className="size-4" /> });
        setActiveTab('signin');
        setSignUpData({ email: '', password: '', displayName: '' });
        setConfirmPassword('');
      } else {
        let errorMessage = error.message || 'Unexpected error.';
        if (error.message?.includes('already registered')) errorMessage = 'Email already exists.';
        else if (error.message?.includes('password')) errorMessage = 'Password too weak.';
        setFormErrors({ general: errorMessage });
      }
    } catch (err) {
      logger.error('Sign up error:', err);
      setFormErrors({ general: 'Unexpected error.' });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <>
      {/* Min-height ensures stability when switching tabs */}
      <Card className="w-full max-w-[400px] mx-auto border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none transition-all duration-300 min-h-[560px] flex flex-col">
        <CardHeader className="text-center pb-4 pt-8 border-b border-gray-100 flex-none">
          <CardTitle className="text-2xl font-display font-bold text-black mb-1 uppercase tracking-tight">
            {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">
            {activeTab === 'signin' ? '// System Access' : '// New User Registration'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-6 flex-1 flex flex-col">
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-100 py-2">
              <AlertCircle className="size-3 text-red-500" />
              <AlertDescription className="text-red-600 text-xs font-mono ml-2">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-10 bg-gray-100 p-1 rounded-none border border-gray-200 shrink-0">
              <TabsTrigger value="signin" className="text-[10px] font-mono font-bold uppercase text-gray-400 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=active]:border-black border border-transparent rounded-none transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-[10px] font-mono font-bold uppercase text-gray-400 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=active]:border-black border border-transparent rounded-none transition-all">Sign Up</TabsTrigger>
            </TabsList>

            <div className="flex-1 relative">
              <TabsContent value="signin" className="mt-0 absolute inset-0 transition-opacity duration-300 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-[10px] font-mono font-bold uppercase text-gray-500">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="signin-email" type="email" value={signInData.email} onChange={(e) => handleSignInEmailChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.email ? 'border-red-500' : ''}`} placeholder="user@example.com" />
                    </div>
                    {formErrors.email && <p className="text-[10px] text-red-500 font-mono">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password" className="text-[10px] font-mono font-bold uppercase text-gray-500">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="signin-password" type={showPassword ? 'text' : 'password'} value={signInData.password} onChange={(e) => handleSignInPasswordChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.password ? 'border-red-500' : ''}`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                    {formErrors.password && <p className="text-[10px] text-red-500 font-mono">{formErrors.password}</p>}
                  </div>

                  <AnimatedButton type="submit" disabled={isSigningIn} variant="primary" className="mt-4">
                    {isSigningIn ? <Loader2 className="size-4 animate-spin text-white z-30" /> : 'Enter Vault'}
                  </AnimatedButton>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 absolute inset-0 transition-opacity duration-300 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="signup-name" type="text" value={signUpData.displayName} onChange={(e) => handleSignUpNameChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.displayName ? 'border-red-500' : ''}`} placeholder="Display Name" />
                    </div>
                    {formErrors.displayName && <p className="text-[10px] text-red-500 font-mono">{formErrors.displayName}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="signup-email" type="email" value={signUpData.email} onChange={(e) => handleSignUpEmailChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.email ? 'border-red-500' : ''}`} placeholder="Email" />
                    </div>
                    {formErrors.email && <p className="text-[10px] text-red-500 font-mono">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} value={signUpData.password} onChange={(e) => handleSignUpPasswordChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.password ? 'border-red-500' : ''}`} placeholder="Password (Min 8)" />
                    </div>
                    {formErrors.password && <p className="text-[10px] text-red-500 font-mono">{formErrors.password}</p>}
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                      <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        className={`pl-9 h-10 rounded-none bg-gray-50 border-gray-200 focus:border-black font-mono text-sm ${formErrors.confirmPassword ? 'border-red-500' : ''}`} placeholder="Confirm Password" />
                    </div>
                    {formErrors.confirmPassword && <p className="text-[10px] text-red-500 font-mono">{formErrors.confirmPassword}</p>}
                  </div>

                  <AnimatedButton type="submit" disabled={isSigningUp} variant="primary" className="mt-4 bg-black" hoverColor="bg-[#FF4D00]">
                    {isSigningUp ? <Loader2 className="size-4 animate-spin text-white z-30" /> : 'Create Account'}
                  </AnimatedButton>
                </form>
              </TabsContent>
            </div>
          </Tabs>

          {/* Guest Mode Option - Pushed to bottom */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowGuestWarning(true)}
              className="w-full group flex items-center justify-center gap-2 h-10 border border-gray-200 text-gray-500 hover:border-black hover:text-black hover:bg-gray-50 font-mono text-[10px] font-bold uppercase tracking-wider rounded-none transition-all duration-200"
              disabled={isSigningIn || isSigningUp}
            >
              <UserCircle className="size-3.5 group-hover:text-[#FF4D00] transition-colors" />
              Try Guest Mode
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:translate-x-1 duration-200" />
            </button>
          </div>

        </CardContent>
      </Card>

      <div className="max-w-xs mx-auto text-center mt-6">
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
          By proceeding, you agree to our <a href="/terms" className="underline hover:text-black">Terms</a> & <a href="/privacy" className="underline hover:text-black">Privacy</a>.
        </p>
      </div>

      <GuestModeWarningDialog
        isOpen={showGuestWarning}
        onConfirm={handleGuestModeConfirm}
        onCancel={() => setShowGuestWarning(false)}
      />
    </>
  );
}
