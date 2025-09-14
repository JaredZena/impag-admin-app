import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock API module
export const mockApiRequest = vi.fn();

// Mock localStorage for auth token
const localStorageMock = {
  getItem: vi.fn((key) => {
    if (key === 'google_token') return 'mock-google-token';
    if (key === 'returnToBalance') return null; // This key should not exist in tests
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

vi.mock('../utils/api', () => ({
  apiRequest: mockApiRequest,
  setSessionExpirationHandler: vi.fn(),
}));

// Mock AuthContext 
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  );
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    sessionExpired: false,
    isAuthenticated: true,
    user: { id: 1, name: 'Test User' },
    forceReauthenticate: vi.fn(),
    clearSessionExpired: vi.fn(),
    reauthenticate: vi.fn(() => Promise.resolve()),
    login: vi.fn(() => Promise.resolve()),
    logout: vi.fn(),
  }),
  AuthProvider: MockAuthProvider,
}));

// Mock NotificationProvider
const MockNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="mock-notification-provider">
      {children}
    </div>
  );
};

vi.mock('../components/ui/notification', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
  }),
  NotificationProvider: MockNotificationProvider,
}));

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  initialState?: any;
}

const AllTheProviders: React.FC<{ 
  children: React.ReactNode;
  initialEntries?: string[];
}> = ({ children, initialEntries = ['/'] }) => {
  return (
    <BrowserRouter>
      <MockAuthProvider>
        <MockNotificationProvider>
          {children}
        </MockNotificationProvider>
      </MockAuthProvider>
    </BrowserRouter>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Helper to reset all mocks between tests
export const resetAllMocks = () => {
  vi.clearAllMocks();
  mockApiRequest.mockReset();
};

// Helper to mock API responses
export const mockApiResponse = (endpoint: string, response: any, method = 'GET') => {
  mockApiRequest.mockImplementation((url, requestMethod = 'GET') => {
    if (url.includes(endpoint) && requestMethod === method) {
      return Promise.resolve({ data: response });
    }
    return Promise.reject(new Error(`Unmocked API call: ${requestMethod} ${url}`));
  });
};

// Helper to mock API errors
export const mockApiError = (endpoint: string, error: Error, method = 'GET') => {
  mockApiRequest.mockImplementation((url, requestMethod = 'GET') => {
    if (url.includes(endpoint) && requestMethod === method) {
      return Promise.reject(error);
    }
    return Promise.resolve({ data: [] });
  });
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to create mock file for export tests
export const createMockFile = (name: string, type: string): File => {
  const file = new File(['mock file content'], name, { type });
  return file;
};

// Helper to simulate user interactions with debounced inputs
export const simulateDebounceInput = async (element: HTMLElement, value: string) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.change(element, { target: { value } });
  fireEvent.blur(element);
  
  // Wait for debounce timeout (usually 300-500ms)
  await new Promise(resolve => setTimeout(resolve, 600));
};

// Helper for testing loading states
export const waitForLoadingToFinish = async () => {
  const { waitFor, screen } = await import('@testing-library/react');
  
  await waitFor(() => {
    // Check for loading spinners
    expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    // Check for loading spinner classes
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // Check that we're not in a loading state (no spinning elements)
    const spinners = screen.queryAllByRole('progressbar');
    expect(spinners).toHaveLength(0);
  }, { timeout: 5000 });
};

// Export everything from testing-library for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';