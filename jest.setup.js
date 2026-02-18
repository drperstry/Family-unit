import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
