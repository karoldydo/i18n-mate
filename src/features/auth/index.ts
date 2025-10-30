// api hooks and utilities
export {
  createAuthErrorResponse,
  forgotPasswordFormSchema,
  loginFormSchema,
  registerFormSchema,
  resetPasswordFormSchema,
  useResendVerification,
  useResetPassword,
  useSignIn,
  useSignOut,
  useSignUp,
  useUpdatePassword,
} from './api';
export type { ForgotPasswordFormData, LoginFormData, RegisterFormData, ResetPasswordFormData } from './api';

// common
export { EmailVerificationScreen } from './components/common/EmailVerificationScreen';
export { UserMenu } from './components/common/UserMenu';

// forms
export { ForgotPasswordForm } from './components/forms/ForgotPasswordForm';
export { LoginForm } from './components/forms/LoginForm';
export { RegisterForm } from './components/forms/RegisterForm';
export { ResetPasswordForm } from './components/forms/ResetPasswordForm';

// guards
export { AuthGuard } from './components/guards/AuthGuard';

// layouts
export { AuthLayout } from './components/layouts/AuthLayout';
export { ProtectedLayout } from './components/layouts/ProtectedLayout';

// routes
export { ForgotPasswordPage } from './routes/ForgotPasswordPage';
export { LoginPage } from './routes/LoginPage';
export { RegisterPage } from './routes/RegisterPage';
export { ResetPasswordPage } from './routes/ResetPasswordPage';
export { VerifyEmailPage } from './routes/VerifyEmailPage';
