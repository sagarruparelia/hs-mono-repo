import { useEffect } from 'react';
import { useAuth } from '@hs-mono-repo/shared-auth';
import './CallbackPage.css';

/**
 * OAuth Callback Page
 *
 * Handles the OAuth redirect after successful authentication at IDP.
 * The AuthProvider automatically handles the callback logic.
 * This page just shows a loading state during processing.
 */
export function CallbackPage() {
  const { isLoading, error } = useAuth();

  useEffect(() => {
    // AuthProvider will automatically handle the callback
    // and redirect to the appropriate page
  }, []);

  if (error) {
    return (
      <div className="callback-page">
        <div className="callback-error">
          <div className="error-icon">❌</div>
          <h2>Authentication Failed</h2>
          <p>{error.message || 'Unknown error'}</p>
          <p className="error-hint">
            Please try logging in again. If the problem persists, contact support.
          </p>
          <a href="/" className="back-button">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-page">
      <div className="callback-loading">
        <div className="spinner"></div>
        <h2>Completing Sign In...</h2>
        <p>Please wait while we verify your credentials</p>
      </div>
    </div>
  );
}

export default CallbackPage;
