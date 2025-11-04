import DocumentPage, { type DocumentPageProps } from './DocumentPage';

// Simple pass-through for now - router features can be added later
export default function DocumentPageWithRouter(props: DocumentPageProps) {
  return <DocumentPage {...props} />;
}
