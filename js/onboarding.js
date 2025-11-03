// Onboarding module - guides new users through first-time setup
class Onboarding {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                title: 'Welcome to FleetFox! 🦊',
                content: `
                    <p>You're about to upload vehicle photos for AI-powered quality checks.</p>
                    <p>We'll need <strong>7 photos</strong> total:</p>
                    <ul style="text-align: left; margin: 20px auto; max-width: 400px;">
                        <li>4 exterior photos (front, back, left, right)</li>
                        <li>3 interior photos (dashboard, seats, floor)</li>
                    </ul>
                `
            },
            {
                title: 'Photo Guidelines 📸',
                content: `
                    <p><strong>Tips for best results:</strong></p>
                    <ul style="text-align: left; margin: 20px auto; max-width: 400px;">
                        <li>✅ Good lighting is key</li>
                        <li>✅ Keep camera steady</li>
                        <li>✅ Make sure photos are in focus</li>
                        <li>✅ Upload the correct photo type for each slot</li>
                    </ul>
                `
            },
            {
                title: 'AI Quality Check 🤖',
                content: `
                    <p>Our AI will automatically:</p>
                    <ul style="text-align: left; margin: 20px auto; max-width: 400px;">
                        <li>✅ Verify photo types match content</li>
                        <li>✅ Detect dirt, stains, and debris</li>
                        <li>✅ Provide actionable feedback</li>
                        <li>✅ Notify you instantly when done</li>
                    </ul>
                `
            }
        ];
    }

    show() {
        const container = document.getElementById('app-content');
        if (!container) return;

        container.innerHTML = `
            <div class="onboarding-container">
                <div class="onboarding-card">
                    <div class="onboarding-step">
                        <h2>${this.steps[this.currentStep].title}</h2>
                        <div class="onboarding-content">
                            ${this.steps[this.currentStep].content}
                        </div>
                        <div class="onboarding-actions">
                            ${this.currentStep > 0 ? '<button class="btn-secondary" onclick="onboarding.prev()">← Back</button>' : ''}
                            ${this.currentStep < this.steps.length - 1 
                                ? '<button class="btn-primary" onclick="onboarding.next()">Next →</button>'
                                : '<button class="btn-primary" onclick="onboarding.complete()">Get Started! 🚀</button>'
                            }
                        </div>
                        <div class="onboarding-progress">
                            ${this.steps.map((_, i) => 
                                `<div class="progress-dot ${i === this.currentStep ? 'active' : i < this.currentStep ? 'completed' : ''}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.show();
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.show();
        }
    }

    async complete() {
        const result = await auth.completeOnboarding();
        if (result.success) {
            // Navigate to upload page (even if there's a warning)
            window.app.navigate('/upload');
        } else {
            const errorMsg = result.error || 'Unknown error';
            console.error('Onboarding completion error:', errorMsg);
            
            // More helpful error message
            if (errorMsg.includes('permission') || errorMsg.includes('RLS')) {
                // Still proceed - we stored it in localStorage
                console.log('Proceeding despite database error (using localStorage fallback)');
                window.app.navigate('/upload');
            } else if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
                // Table doesn't exist - use localStorage fallback
                console.log('Table not found, using localStorage fallback');
                const user = auth.getUser();
                if (user) {
                    localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
                }
                window.app.navigate('/upload');
            } else {
                // For any other error, still try to proceed
                console.log('Error occurred but proceeding anyway:', errorMsg);
                const user = auth.getUser();
                if (user) {
                    localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
                }
                window.app.navigate('/upload');
            }
        }
    }
}

window.onboarding = new Onboarding();

