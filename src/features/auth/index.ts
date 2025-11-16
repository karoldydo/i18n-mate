// error handling
export * from './api/auth.errors';

// schemas and types
export * from './api/auth.schemas';

// mutation hooks
export * from './api/useResendVerification';
export * from './api/useResetPassword';
export * from './api/useSignIn';
export * from './api/useSignOut';
export * from './api/useSignUp';
export * from './api/useUpdatePassword';

// component exports
export * from './components/common/EmailVerificationScreen';
export * from './components/forms/ForgotPasswordForm';
export * from './components/forms/LoginForm';
export * from './components/forms/RegisterForm';
export * from './components/forms/ResetPasswordForm';
export * from './components/guards/AuthGuard';
export * from './components/guards/RegistrationGuard';
export * from './components/guards/VerificationGuard';
export * from './components/layouts/AuthLayout';

// route exports
export * from './routes/EmailVerifiedPage';
export * from './routes/ForgotPasswordPage';
export * from './routes/LoginPage';
export * from './routes/RegisterPage';
export * from './routes/ResetPasswordPage';
export * from './routes/VerifyEmailPage';
