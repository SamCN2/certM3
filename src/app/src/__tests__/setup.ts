import '@testing-library/jest-dom';

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockLocation.href = '';
  mockLocation.pathname = '';
  mockLocation.search = '';
  mockLocation.hash = '';
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  (global.fetch as jest.Mock).mockClear();
}); 