import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import DocumentPage from './components/DocumentPage';
import './bootstrap'; // Initialize custom element

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// For standalone development
root.render(
  <StrictMode>
    <DocumentPage
      ownerIdType="EID"
      ownerIdValue="E123456"
      ownerDisplayName="John Doe"
      theme="light"
    />
  </StrictMode>
);
