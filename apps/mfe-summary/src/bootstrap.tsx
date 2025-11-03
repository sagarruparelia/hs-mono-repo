import { createRoot, Root } from 'react-dom/client';
import SummaryPage, { SummaryPageProps } from './components/SummaryPage';

/**
 * Mount the SummaryPage component to a DOM element
 * This function can be called from any framework or vanilla JS
 *
 * @param element - The DOM element to mount to
 * @param props - Props to pass to the SummaryPage component
 * @returns An object with unmount function
 */
export function mount(
  element: HTMLElement,
  props: SummaryPageProps = {}
): { unmount: () => void } {
  const root = createRoot(element);
  root.render(<SummaryPage {...props} />);

  return {
    unmount: () => {
      root.unmount();
    },
  };
}

/**
 * Framework-agnostic initialization
 * Automatically mounts to any element with data-mfe="summary"
 */
export function init() {
  const elements = document.querySelectorAll<HTMLElement>('[data-mfe="summary"]');
  const instances: Array<{ element: HTMLElement; unmount: () => void }> = [];

  elements.forEach((element) => {
    // Read props from data attributes
    const props: SummaryPageProps = {
      userId: element.dataset.userId,
      theme: (element.dataset.theme as 'light' | 'dark') || 'light',
      timeRange: (element.dataset.timeRange as 'week' | 'month' | 'year') || 'month',
      onDataLoad: (data) => {
        // Dispatch custom event for framework-agnostic communication
        const event = new CustomEvent('summaryDataLoad', { detail: data });
        element.dispatchEvent(event);
      },
    };

    const instance = mount(element, props);
    instances.push({ element, unmount: instance.unmount });
  });

  return {
    unmountAll: () => {
      instances.forEach((instance) => instance.unmount());
    },
  };
}

// Auto-initialize on DOMContentLoaded if not already loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already loaded
    init();
  }
}

export default { mount, init };
