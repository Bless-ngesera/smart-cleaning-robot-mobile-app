// src/services/auth.ts
import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

export type AuthError = {
    message: string;
    status?: number;
    code?: string;
};

export type AuthResponse = {
    success: boolean;
    error?: AuthError;
    data?: any;
};

class AuthService {
    // ============================================================
    // SIGNUP FLOW — owned by the handle-signup Edge Function
    // The Edge Function creates the user via admin API (no Supabase
    // email triggered) then sends the branded confirmation email via
    // Resend. This completely avoids Supabase's rate-limited mailer.
    // ============================================================
    async signUp(email: string, password: string, fullName: string, phone?: string): Promise<AuthResponse> {
        try {
            console.log('🚀 [AuthService] Starting signup for:', email);

            if (!this.validateEmail(email)) {
                return { success: false, error: { message: 'Please enter a valid email address', code: 'INVALID_EMAIL' } };
            }

            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.isValid) {
                return { success: false, error: { message: passwordValidation.errors[0], code: 'INVALID_PASSWORD' } };
            }

            const redirectUrl = Linking.createURL('/verified-account', { scheme: 'smartcleanerpro' });

            const { error: fnError } = await supabase.functions.invoke('handle-signup', {
                body: {
                    email: email.trim().toLowerCase(),
                    password,
                    fullName: fullName.trim(),
                    redirectTo: redirectUrl,
                },
            });

            if (fnError) {
                let fnBody: Record<string, any> = {};
                try {
                    if ((fnError as any).context?.json) {
                        fnBody = await (fnError as any).context.json();
                    }
                } catch { /* not JSON */ }

                const code: string = fnBody.code ?? '';
                const msg: string  = fnBody.error ?? fnError.message ?? '';
                console.error('❌ [AuthService] handle-signup error:', JSON.stringify(fnBody));

                if (code === 'USER_EXISTS' || msg.toLowerCase().includes('already in use')) {
                    return { success: false, error: { message: 'Email already used by another user', code: 'USER_EXISTS' } };
                }
                if (code === 'EMAIL_FAILED') {
                    return { success: false, error: { message: 'Account creation failed — could not send confirmation email. Please try again.', code: 'EMAIL_FAILED' } };
                }
                return { success: false, error: { message: msg || 'Signup failed. Please try again.', code: code || 'SIGNUP_ERROR' } };
            }

            console.log('✅ [AuthService] Signup complete, confirmation email sent to:', email);
            return {
                success: true,
                data: {
                    needsEmailConfirmation: true,
                    message: 'Please check your email to confirm your account.',
                },
            };

        } catch (error: any) {
            console.error('❌ [AuthService] SignUp error:', error);
            return { success: false, error: { message: this.getFriendlyErrorMessage(error), status: error.status, code: error.code } };
        }
    }

    // ============================================================
    // LOGIN FLOW - ENHANCED
    // ============================================================
    async signIn(email: string, password: string): Promise<AuthResponse> {
        try {
            console.log('🚀 [AuthService] Starting login process for:', email);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                console.error('❌ [AuthService] Login error:', error.message);

                // Handle rate limit errors
                if (error.status === 429 ||
                    error.message?.toLowerCase().includes('rate limit')) {
                    return {
                        success: false,
                        error: {
                            message: 'Too many login attempts. Please wait a few minutes before trying again.',
                            code: 'RATE_LIMIT_EXCEEDED',
                            status: 429,
                        },
                    };
                }

                // Handle specific login errors
                if (error.message.includes('Invalid login credentials')) {
                    return {
                        success: false,
                        error: {
                            message: 'Invalid email or password. Please try again.',
                            code: 'INVALID_CREDENTIALS',
                        },
                    };
                }

                if (error.message.includes('Email not confirmed')) {
                    return {
                        success: false,
                        error: {
                            message: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
                            code: 'UNVERIFIED_EMAIL',
                        },
                    };
                }

                throw error;
            }

            // Check if email is verified
            if (!data.user?.email_confirmed_at) {
                return {
                    success: false,
                    error: {
                        message: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
                        code: 'UNVERIFIED_EMAIL',
                    },
                };
            }

            console.log('✅ [AuthService] Login successful for:', data.user.email);

            return {
                success: true,
                data: {
                    user: data.user,
                    session: data.session,
                },
            };
        } catch (error: any) {
            console.error('❌ [AuthService] SignIn error:', error);
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
                scheme: 'smartcleanerpro',
            });

            console.log('📧 [AuthService] Reset password redirect URL:', redirectUrl);

            // Call Edge Function so the email is sent via Resend (custom domain),
            // not Supabase's built-in mailer.
            const { error } = await supabase.functions.invoke('send-reset-email', {
                body: { email: email.trim().toLowerCase(), redirectTo: redirectUrl },
            });

            if (error) {
                // Extract the actual JSON body from the Edge Function response
                let fnBody: Record<string, any> = {};
                try {
                    if (error.context?.json) {
                        fnBody = await error.context.json();
                    }
                } catch { /* body not JSON */ }

                const msg: string = fnBody.error ?? fnBody.message ?? error.message ?? '';
                const code: string = fnBody.code ?? '';
                console.error('❌ [AuthService] Edge Function error body:', fnBody);

                // Edge Function not deployed yet — fall back to Supabase's built-in mailer
                if (code === 'NOT_FOUND') {
                    console.warn('⚠️ [AuthService] send-reset-email function not deployed, falling back to Supabase mailer');
                    const { error: sbError } = await supabase.auth.resetPasswordForEmail(
                        email.trim().toLowerCase(),
                        { redirectTo: redirectUrl }
                    );

                    if (sbError) {
                        const sbMsg = sbError.message?.toLowerCase() ?? '';
                        // Supabase free-tier rate limit / email service temporarily unavailable
                        if (
                            sbMsg.includes('error sending recovery email') ||
                            sbMsg.includes('rate limit') ||
                            sbMsg.includes('email rate limit') ||
                            sbError.status === 429
                        ) {
                            return {
                                success: false,
                                error: {
                                    message: 'Email service is temporarily unavailable. Please try again in a few minutes.',
                                    code: 'EMAIL_SERVICE_ERROR',
                                },
                            };
                        }
                        throw sbError;
                    }

                    console.log('✅ [AuthService] Reset email sent (via Supabase fallback) to:', email);
                    return { success: true, data: { message: 'Password reset email sent! Check your inbox.' } };
                }

                if (error.status === 429 || msg.toLowerCase().includes('rate limit')) {
                    return {
                        success: false,
                        error: {
                            message: 'Too many password reset requests. Please wait a few minutes before trying again.',
                            code: 'RATE_LIMIT_EXCEEDED',
                            status: 429,
                        },
                    };
                }

                if (code === 'USER_NOT_FOUND' || msg.toLowerCase().includes('user not found')) {
                    return {
                        success: false,
                        error: {
                            message: 'No account found with this email address.',
                            code: 'USER_NOT_FOUND',
                        },
                    };
                }

                throw new Error(msg || 'Failed to send reset email');
            }

            console.log('✅ [AuthService] Reset email sent to:', email);

            return {
                success: true,
                data: {
                    message: 'Password reset email sent! Check your inbox.',
                },
            };
        } catch (error: any) {
            console.error('❌ [AuthService] Forgot password error:', error);
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
            console.log('🚀 [AuthService] Resetting password...');

            const passwordValidation = this.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    error: {
                        message: passwordValidation.errors[0],
                        code: 'INVALID_PASSWORD',
                    },
                };
            }

            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                if (error.message.includes('same as the old password')) {
                    return {
                        success: false,
                        error: {
                            message: 'New password must be different from your old password.',
                            code: 'SAME_PASSWORD',
                        },
                    };
                }
                throw error;
            }

            console.log('✅ [AuthService] Password reset successful');

            return {
                success: true,
                data: {
                    message: 'Password updated successfully!',
                    user: data.user,
                },
            };
        } catch (error: any) {
            console.error('❌ [AuthService] Reset password error:', error);
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
    // RESEND CONFIRMATION EMAIL — via send-confirmation-email Edge Function
    // ============================================================
    async resendConfirmationEmail(email: string): Promise<AuthResponse> {
        try {
            const redirectUrl = Linking.createURL('/verified-account', { scheme: 'smartcleanerpro' });

            const { error: fnError } = await supabase.functions.invoke('send-confirmation-email', {
                body: { email: email.trim().toLowerCase(), redirectTo: redirectUrl },
            });

            if (fnError) {
                let fnBody: Record<string, any> = {};
                try {
                    if ((fnError as any).context?.json) {
                        fnBody = await (fnError as any).context.json();
                    }
                } catch { /* not JSON */ }

                const msg: string = fnBody.error ?? fnError.message ?? '';
                console.error('❌ [AuthService] send-confirmation-email error:', JSON.stringify(fnBody));

                if (msg.toLowerCase().includes('rate limit')) {
                    return { success: false, error: { message: 'Too many requests. Please wait a few minutes before trying again.', code: 'RATE_LIMIT_EXCEEDED' } };
                }
                if (msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('not found')) {
                    return { success: false, error: { message: 'No account found with this email address.', code: 'USER_NOT_FOUND' } };
                }
                return { success: false, error: { message: 'Failed to send confirmation email. Please try again.', code: 'EMAIL_SERVICE_ERROR' } };
            }

            return { success: true, data: { message: 'Confirmation email sent! Check your inbox.' } };
        } catch (error: any) {
            console.error('❌ [AuthService] Resend confirmation error:', error);
            return { success: false, error: { message: this.getFriendlyErrorMessage(error), status: error.status } };
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
            console.error('❌ [AuthService] Sign out error:', error);
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
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            return { session: data?.session || null, error: null };
        } catch (error: any) {
            console.error('❌ [AuthService] Get session error:', error);
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
            console.error('❌ [AuthService] Get user error:', error);
            return { user: null, error };
        }
    }

    // ============================================================
    // REFRESH SESSION
    // ============================================================
    async refreshSession() {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            return { session: data?.session || null, error: null };
        } catch (error: any) {
            console.error('❌ [AuthService] Refresh session error:', error);
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
                .maybeSingle();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error: any) {
            console.error('❌ [AuthService] Get user profile error:', error);
            return { profile: null, error };
        }
    }

    // ============================================================
    // UPDATE USER PROFILE
    // ============================================================
    async updateUserProfile(userId: string, updates: Partial<{ full_name: string; avatar_url: string }>) {
        try {
            // First check if profile exists
            const { profile: existingProfile } = await this.getUserProfile(userId);

            if (!existingProfile) {
                return {
                    success: false,
                    error: {
                        message: 'Profile not found',
                        code: 'PROFILE_NOT_FOUND',
                    },
                };
            }

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
            console.error('❌ [AuthService] Update user profile error:', error);
            return { profile: null, error };
        }
    }

    // ============================================================
    // CHECK IF USER EXISTS
    // ============================================================
    async checkUserExists(email: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (error) throw error;
            return !!data;
        } catch (error) {
            console.error('❌ [AuthService] Check user exists error:', error);
            return false;
        }
    }

    // ============================================================
    // COMPLETE PROFILE CHECK
    // ============================================================
    async getCompleteUserProfile() {
        try {
            const { user } = await this.getCurrentUser();
            if (!user) {
                return { profile: null, user: null, error: 'Not authenticated' };
            }

            const { profile } = await this.getUserProfile(user.id);

            return {
                user,
                profile,
                error: null,
            };
        } catch (error: any) {
            console.error('❌ [AuthService] Get complete profile error:', error);
            return { user: null, profile: null, error };
        }
    }

    // ============================================================
    // HELPER: Get user-friendly error messages
    // ============================================================
    private getFriendlyErrorMessage(error: any): string {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code?.toLowerCase() || '';
        const status = error?.status;

        // Handle rate limit errors first (most important)
        if (status === 429 ||
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('too many attempts') ||
            code === 'over_email_send_rate_limit' ||
            message.includes('email rate limit')) {

            return 'Too many attempts. Please wait about an hour before trying again. This is a security measure to prevent abuse.';
        }

        // Handle specific error codes
        if (code === '42501') {
            return 'Account created but profile setup is pending. Please try logging in after verifying your email.';
        }

        if (code === '23505') {
            return 'Email already used by another user';
        }

        if (code === '23503') {
            return 'Account created successfully. Profile will be set up momentarily.';
        }

        if (code === 'PGRST116') {
            return 'No profile found. Please complete your setup.';
        }

        // Auth specific errors
        if (message.includes('email already registered') || message.includes('already registered')) {
            return 'Email already used by another user';
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
        if (message.includes('error sending recovery email') || message.includes('email rate limit')) {
            return 'Email service is temporarily unavailable. Please try again in a few minutes.';
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
        if (message.includes('new row violates row-level security')) {
            return 'Account created. Please log in after verifying your email.';
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
        if (!/[a-z]/.test(password)) {
            errors.push('Include at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Include at least one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Include at least one special character (!@#$%^&*)');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

export default new AuthService();