console.log('Simple app starting...');

class SimpleApp {
    private static instance: SimpleApp;

    private constructor() {
        console.log('SimpleApp constructor called');
        this.initializeApp();
    }

    public static getInstance(): SimpleApp {
        if (!SimpleApp.instance) {
            SimpleApp.instance = new SimpleApp();
        }
        return SimpleApp.instance;
    }

    private initializeApp(): void {
        console.log('Initializing simple app');
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        console.log('Setting up event listeners');
        const form = document.getElementById('simpleForm');
        if (form) {
            form.addEventListener('submit', (event: Event) => {
                event.preventDefault();
                console.log('Form submitted');
                const input = document.getElementById('simpleInput') as HTMLInputElement;
                if (input) {
                    console.log('Input value:', input.value);
                }
            });
        }
    }
}

// Initialize the application
console.log('Starting simple application...');
SimpleApp.getInstance(); 