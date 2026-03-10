// src/services/auth.ts
import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';

export type AuthError = {
    message: string;
    status?: number;
};

export type AuthResponse = {
    success: boolean;
    error?: AuthError;
    data?: any;
};

class AuthService {
    // ============================================================
    // SIGNUP FLOW
    // ============================================================
    async signUp(email: string, password: string, fullName: string): Promise<AuthResponse> {
        try {
            // Create redirect URL for email confirmation
            const redirectUrl = Linking.createURL('/verified-account', {
                scheme: 'smartcleaner',
            });

            console.log('SignUp redirect URL:', redirectUrl);

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: redirectUrl,
                },
            });

            if (authError) throw authError;

            // ✅ PROFILE CREATION REMOVED - Now handled by Supabase trigger
            // The trigger `on_auth_user_created` automatically creates the profile
            // This eliminates the RLS policy violation error

            return {
                success: true,
                data: {
                    user: authData.user,
                    session: authData.session,
                    needsEmailConfirmation: !authData.user?.email_confirmed_at,
                },
            };
        } catch (error: any) {
            console.error('SignUp error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                    status: error.status,
                },
            };
        }
    }

    // ============================================================
    // LOGIN FLOW
    // ============================================================
    async signIn(email: string, password: string): Promise<AuthResponse> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check if email is verified
            if (!data.user?.email_confirmed_at) {
                return {
                    success: false,
                    error: {
                        message: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
                    },
                };
            }

            return {
                success: true,
                data: {
                    user: data.user,
                    session: data.session,
                },
            };
        } catch (error: any) {
            console.error('SignIn error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                    status: error.status,
                },
            };
        }
    }

    // ============================================================
    // FORGOT PASSWORD FLOW
    // ============================================================
    async forgotPassword(email: string): Promise<AuthResponse> {
        try {
            const redirectUrl = Linking.createURL('/reset-password', {
                scheme: 'smartcleaner',
            });

            console.log('Reset password redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            return {
                success: true,
                data: {
                    message: 'Password reset email sent! Check your inbox.',
                },
            };
        } catch (error: any) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                    status: error.status,
                },
            };
        }
    }

    // ============================================================
    // RESET PASSWORD (after clicking email link)
    // ============================================================
    async resetPassword(newPassword: string): Promise<AuthResponse> {
        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            return {
                success: true,
                data: {
                    message: 'Password updated successfully!',
                    user: data.user,
                },
            };
        } catch (error: any) {
            console.error('Reset password error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                    status: error.status,
                },
            };
        }
    }

    // ============================================================
    // RESEND CONFIRMATION EMAIL
    // ============================================================
    async resendConfirmationEmail(email: string): Promise<AuthResponse> {
        try {
            const redirectUrl = Linking.createURL('/verified-account', {
                scheme: 'smartcleaner',
            });

            const { data, error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: redirectUrl,
                },
            });

            if (error) throw error;

            return {
                success: true,
                data: {
                    message: 'Confirmation email sent! Check your inbox.',
                },
            };
        } catch (error: any) {
            console.error('Resend confirmation error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                    status: error.status,
                },
            };
        }
    }

    // ============================================================
    // SIGN OUT
    // ============================================================
    async signOut(): Promise<AuthResponse> {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: {
                    message: this.getFriendlyErrorMessage(error),
                },
            };
        }
    }

    // ============================================================
    // CHECK SESSION
    // ============================================================
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            return { session, error: null };
        } catch (error: any) {
            console.error('Get session error:', error);
            return { session: null, error };
        }
    }

    // ============================================================
    // GET CURRENT USER
    // ============================================================
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return { user, error: null };
        } catch (error: any) {
            console.error('Get user error:', error);
            return { user: null, error };
        }
    }

    // ============================================================
    // REFRESH SESSION
    // ============================================================
    async refreshSession() {
        try {
            const { data: { session }, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            return { session, error: null };
        } catch (error: any) {
            console.error('Refresh session error:', error);
            return { session: null, error };
        }
    }

    // ============================================================
    // GET USER PROFILE
    // ============================================================
    async getUserProfile(userId: string) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error: any) {
            console.error('Get user profile error:', error);
            return { profile: null, error };
        }
    }

    // ============================================================
    // UPDATE USER PROFILE
    // ============================================================
    async updateUserProfile(userId: string, updates: Partial<{ full_name: string; avatar_url: string }>) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error: any) {
            console.error('Update user profile error:', error);
            return { profile: null, error };
        }
    }

    // ============================================================
    // HELPER: Get user-friendly error messages
    // ============================================================
    private getFriendlyErrorMessage(error: any): string {
        const message = error?.message?.toLowerCase() || '';

        // Auth specific errors
        if (message.includes('email already registered')) {
            return 'This email is already registered. Try logging in instead.';
        }
        if (message.includes('invalid login credentials')) {
            return 'Invalid email or password. Please try again.';
        }
        if (message.includes('email not confirmed')) {
            return 'Please verify your email before logging in. Check your inbox for the confirmation link.';
        }
        if (message.includes('password should be at least 6 characters')) {
            return 'Password must be at least 6 characters long.';
        }
        if (message.includes('rate limit')) {
            return 'Too many attempts. Please wait a few minutes and try again.';
        }
        if (message.includes('network')) {
            return 'Network error. Please check your internet connection.';
        }
        if (message.includes('user not found')) {
            return 'No account found with this email address.';
        }
        if (message.includes('invalid email')) {
            return 'Please enter a valid email address.';
        }
        if (message.includes('weak password')) {
            return 'Password is too weak. Please use a stronger password.';
        }
        if (message.includes('session not found')) {
            return 'Your session has expired. Please log in again.';
        }
        if (message.includes('jwt expired')) {
            return 'Your session has expired. Please log in again.';
        }
        if (message.includes('email rate limit')) {
            return 'Too many email requests. Please wait a few minutes before trying again.';
        }
        if (message.includes('new row violates row-level security')) {
            return 'Account created but profile setup failed. Please contact support.';
        }

        // Default fallback
        return error?.message || 'An unexpected error occurred. Please try again.';
    }

    // ============================================================
    // VALIDATION HELPERS
    // ============================================================
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password: string): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Include at least one uppercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Include at least one number');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

export default new AuthService();