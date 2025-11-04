/**
 * Custom Element (Web Component) wrapper for DocumentPage
 * This allows the micro-frontend to be used as a web component in any framework
 */

import { createRoot, Root } from 'react-dom/client';
import DocumentPage from './components/DocumentPage';
import DocumentPageWithRouter from './components/DocumentPageWithRouter';

class DocumentPageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'theme',
      'owner-id-type',
      'owner-id-value',
      'owner-display-name',
      'logged-in-user-id-type',
      'logged-in-user-id-value',
      'use-router',
    ];
  }

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.mount();
    }
  }

  private mount() {
    const theme = (this.getAttribute('theme') as 'light' | 'dark') || 'light';
    const ownerIdType = this.getAttribute('owner-id-type') || 'EID';
    const ownerIdValue = this.getAttribute('owner-id-value') || '';
    const ownerDisplayName = this.getAttribute('owner-display-name') || undefined;
    const loggedInUserIdType = this.getAttribute('logged-in-user-id-type') || undefined;
    const loggedInUserIdValue = this.getAttribute('logged-in-user-id-value') || undefined;
    const useRouter = this.getAttribute('use-router') === 'true';

    if (!this.root) {
      this.root = createRoot(this);
    }

    const Component = useRouter ? DocumentPageWithRouter : DocumentPage;

    this.root.render(
      <Component
        theme={theme}
        ownerIdType={ownerIdType}
        ownerIdValue={ownerIdValue}
        ownerDisplayName={ownerDisplayName}
        loggedInUserIdType={loggedInUserIdType}
        loggedInUserIdValue={loggedInUserIdValue}
        onDataLoad={(data) => {
          this.dispatchEvent(
            new CustomEvent('document-data-load', {
              detail: data,
              bubbles: true,
              composed: true,
            })
          );
        }}
      />
    );
  }

  private unmount() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// Register the custom element
if (!customElements.get('mfe-documents')) {
  customElements.define('mfe-documents', DocumentPageElement);
}

export { DocumentPageElement };
