// Mock fetch API
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    replace: jest.fn(),
    href: '',
  },
  writable: true,
});

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set up DOM environment
document.body.innerHTML = `
  <div class="ui container">
    <main>
      <div class="ui segment">
        <form class="ui form" id="user-request-form">
          <div class="field">
            <label>Username</label>
            <div class="ui input">
              <input type="text" name="username" required 
                     pattern="[a-z0-9]+" 
                     title="Only lowercase letters and numbers allowed">
            </div>
            <div class="ui pointing label username-validation" style="display: none;"></div>
          </div>
          <div class="field">
            <label>Email Address</label>
            <div class="ui input">
              <input type="email" name="email" required>
            </div>
          </div>
          <div class="field">
            <label>Display Name</label>
            <div class="ui input">
              <input type="text" name="displayName" required 
                     minlength="2" maxlength="64"
                     title="2-64 characters">
            </div>
          </div>
          <button class="ui primary button" type="submit">
            <span class="button-text">Request Account</span>
            <div class="ui active inline loader" style="display: none;"></div>
          </button>
        </form>
        <div class="ui error message" style="display: none;"></div>
        <div class="ui success message" style="display: none;"></div>
      </div>
    </main>
  </div>
`; 