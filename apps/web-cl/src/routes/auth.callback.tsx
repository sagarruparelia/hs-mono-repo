import { createFileRoute } from '@tanstack/react-router';
import CallbackPage from '../app/pages/CallbackPage';

export const Route = createFileRoute('/auth/callback')({
  component: CallbackPage,
});
