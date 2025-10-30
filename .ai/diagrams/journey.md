```mermaid
stateDiagram-v2

[*] --> LandingPage

state "Authentication" as Auth {
  [*] --> LandingPage

  LandingPage --> LoginForm: Click "Log in"
  LandingPage --> RegisterForm: Click "Sign up"

  state "Login Process" as Login {
    LoginForm --> email_check
    email_check --> Dashboard: Email verified
    email_check --> VerificationPage: Email unverified
    email_check --> LoginForm: Invalid credentials

    note right of email_check
      Check if user email
      is verified after login
    end note
  }

  state "Registration Process" as Registration {
    RegisterForm --> EmailVerificationScreen: Submit form
    EmailVerificationScreen --> VerificationPending

    state "Verification Flow" as Verification {
      VerificationPending --> EmailVerified: Click email link
      VerificationPending --> VerificationPending: Resend verification
      EmailVerified --> LoginForm: Redirect to login
    }

    note right of EmailVerificationScreen
      User must verify email
      before accessing app
    end note
  }

  state "Password Reset Process" as PasswordReset {
    LoginForm --> ForgotPasswordForm: Click "Forgot password?"
    ForgotPasswordForm --> PasswordResetEmailSent: Submit email
    PasswordResetEmailSent --> ResetPasswordForm: Click reset link
    ResetPasswordForm --> LoginForm: Password updated
    ResetPasswordForm --> ResetPasswordForm: Invalid token

    note right of PasswordResetEmailSent
      Email sent with reset link
      Link valid for 1 hour
    end note
  }

  VerificationPage --> VerificationPending: Resend verification
}

state "Application" as App {
  Dashboard --> ProjectList: Navigate to projects
  ProjectList --> ProjectDetails: Select project
  ProjectDetails --> KeysList: View keys
  KeysList --> TranslationJobs: Start translation
  TranslationJobs --> ExportPage: Export translations

  Dashboard --> Logout: Click logout
  ProjectList --> Logout
  ProjectDetails --> Logout
  KeysList --> Logout
  TranslationJobs --> Logout
  ExportPage --> Logout

  note right of Dashboard
    All app features available
    only to verified users
  end note
}

Logout --> LandingPage
LandingPage --> [*]

note right of LandingPage
  Entry point for all users
  Choice between login/register
end note

note left of Dashboard
  Main authenticated area
  Projects, translations, export
end note
```
