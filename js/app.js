// Main application router and controller
class App {
    constructor() {
        this.currentRoute = null;
        this.routes = {
            '/login': this.showLogin.bind(this),
            '/signup': this.showSignup.bind(this),
            '/onboarding': this.showOnboarding.bind(this),
            '/upload': this.showUpload.bind(this),
            '/dashboard': this.showDashboard.bind(this)
        };
    }

    async init() {
        // Initialize auth
        await auth.init();
        
        // Listen for auth changes
        auth.onAuthStateChange((event, user) => {
            console.log('Auth state changed:', event, user);
            this.handleAuthChange(event, user);
        });

        // Request notification permission (non-blocking - don't await)
        notifications.requestPermission().catch(() => {
            // Permission denied is fine, continue anyway
        });

        // Check onboarding status and route
        await this.checkAndRoute();

        // Setup navigation
        this.setupNavigation();
    }

    async checkAndRoute() {
        // Wait a bit for DOM to be ready
        const container = document.getElementById('app-content');
        if (!container) {
            setTimeout(() => this.checkAndRoute(), 100);
            return;
        }

        const user = auth.getUser();
        
        // Check hash first (for file:// protocol)
        const hash = window.location.hash.slice(1);
        const publicRoutes = ['/login', '/signup'];
        
        // If hash exists and is a valid route, use it
        if (hash && this.routes[hash]) {
            // Allow public routes even without user
            if (publicRoutes.includes(hash) || user) {
                this.navigate(hash, false);
                return;
            }
        }
        
        // If no user and no valid public route, go to login
        if (!user) {
            this.navigate('/login');
            return;
        }

        // Check onboarding status
        const onboardingStatus = await auth.getOnboardingStatus();
        if (!onboardingStatus.completed) {
            this.navigate('/onboarding');
            return;
        }

        // Route based on user role
        const role = await auth.getUserRole() || 'fox';
        if (role === 'fox') {
            this.navigate('/upload'); // Fox goes to upload
        } else {
            this.navigate('/dashboard'); // Client/Admin go to dashboard
        }
    }

    handleAuthChange(event, user) {
        if (event === 'SIGNED_OUT') {
            // Reset subscription flags on logout
            this._uploadNotificationsSubscribed = false;
            notifications.unsubscribe();
            this.navigate('/login');
        } else if (event === 'SIGNED_IN' && user) {
            // Don't override if user is navigating to a specific route
            const hash = window.location.hash.slice(1);
            const path = window.location.pathname;
            // Only auto-route if on login/signup pages or no route
            if ((!hash || hash === '/login' || hash === '/signup') && 
                (path === '/' || path === '/login' || path === '/signup')) {
                this.checkAndRoute();
            }
            // Otherwise let them stay on the route they're on
        }
    }

    setupNavigation() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.navigate(window.location.pathname, false);
        });

        // Handle hash changes (for file:// protocol)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && this.routes[hash]) {
                // Directly navigate to the route without checking auth
                const route = this.routes[hash];
                this.currentRoute = hash;
                route();
            }
        });
    }

    navigate(path, pushState = true) {
        // Check if we're on file:// protocol (local file) or localhost without SPA routing
        const isFileProtocol = window.location.protocol === 'file:';
        const isLocalServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Always use hash-based routing for local development (prevents 404 errors)
        // Python's http.server doesn't support SPA routing, so /upload will 404
        if (isFileProtocol || isLocalServer) {
            // Use hash routing for local development
            window.location.hash = path.startsWith('/') ? path : '/' + path;
        } else if (pushState && window.history) {
            // Use pushState for deployed environments (Vercel, etc. handle SPA routing)
            try {
                window.history.pushState({}, '', path);
            } catch (e) {
                console.warn('pushState failed, using hash routing:', e);
                window.location.hash = path.startsWith('/') ? path : '/' + path;
            }
        } else {
            // Fallback to hash routing
            window.location.hash = path.startsWith('/') ? path : '/' + path;
        }

        const route = this.routes[path] || this.routes['/upload'];
        this.currentRoute = path;
        route();
    }

    showLogin() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <h1>fleet<span class="accent">fox</span></h1>
                    <h2>Welcome Back</h2>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="loginEmail">Email</label>
                            <input type="email" id="loginEmail" required placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label for="loginPassword">Password</label>
                            <input type="password" id="loginPassword" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn-primary">Sign In</button>
                        <p class="auth-link">Don't have an account? <a href="#" onclick="app.navigate('/signup'); return false;">Sign up</a></p>
                    </form>
                    <div id="loginError" class="error-message" style="display: none;"></div>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            const result = await auth.signIn(email, password);
            if (result.success) {
                errorDiv.style.display = 'none';
                // Check onboarding and navigate
                await this.checkAndRoute();
            } else {
                errorDiv.textContent = result.error || 'Login failed';
                errorDiv.style.display = 'block';
            }
        });
    }

    showSignup() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <h1>fleet<span class="accent">fox</span></h1>
                    <h2>Create Account</h2>
                    <form id="signupForm">
                        <div class="form-group">
                            <label for="signupName">Full Name</label>
                            <input type="text" id="signupName" required placeholder="John Doe">
                        </div>
                        <div class="form-group">
                            <label for="signupEmail">Email</label>
                            <input type="email" id="signupEmail" required placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label for="signupPassword">Password</label>
                            <input type="password" id="signupPassword" required placeholder="••••••••" minlength="6">
                        </div>
                        <div class="form-group">
                            <small style="color: var(--muted); font-size: 12px; margin-top: 4px; display: block;">
                                💡 All new accounts default to Field Worker (Fox). Admin will assign your role if needed.
                            </small>
                        </div>
                        <button type="submit" class="btn-primary">Sign Up</button>
                        <p class="auth-link">Already have an account? <a href="#" onclick="app.navigate('/login'); return false;">Sign in</a></p>
                    </form>
                    <div id="signupError" class="error-message" style="display: none;"></div>
                </div>
            </div>
        `;

        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const errorDiv = document.getElementById('signupError');

            const result = await auth.signUp(email, password, name);
            if (result.success) {
                errorDiv.style.display = 'none';
                // Auto-login after signup
                await auth.signIn(email, password);
                await this.checkAndRoute();
            } else {
                errorDiv.textContent = result.error || 'Signup failed';
                errorDiv.style.display = 'block';
            }
        });
    }

    showOnboarding() {
        onboarding.show();
    }

    async showUpload() {
        const user = auth.getUser();
        const container = document.getElementById('app-content');
        
        container.innerHTML = `
            <div class="container">
                <h1>🚗 Vehicle QA Submission Portal</h1>
                <p class="subtitle">Upload photos for AI quality assessment</p>
                
                <form id="qaForm">
                    <div class="form-group">
                        <label for="taskId">Task ID *</label>
                        <input type="text" id="taskId" placeholder="e.g., TASK_2025_001" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="foxId">Fox ID *</label>
                        <input type="text" id="foxId" placeholder="Auto-generated" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="clientIdSelect">Client ID *</label>
                        <select id="clientIdSelect" required>
                            <option value="" disabled selected>Loading clients...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="vehicleId">Vehicle ID</label>
                        <input type="text" id="vehicleId" placeholder="e.g., ABC-123">
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressBar" style="width: 0%"></div>
                    </div>
                    
                    <div class="upload-section">
                        <h3>📸 Exterior Photos (4 required)</h3>
                        <div class="image-upload">
                            <div class="upload-box" onclick="document.getElementById('exterior-front').click()">
                                <input type="file" id="exterior-front" accept="image/*" data-type="exterior_front">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Front View</div>
                            </div>
                            <div class="upload-box" onclick="document.getElementById('exterior-back').click()">
                                <input type="file" id="exterior-back" accept="image/*" data-type="exterior_back">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Back View</div>
                            </div>
                            <div class="upload-box" onclick="document.getElementById('exterior-left').click()">
                                <input type="file" id="exterior-left" accept="image/*" data-type="exterior_left">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Left Side</div>
                            </div>
                            <div class="upload-box" onclick="document.getElementById('exterior-right').click()">
                                <input type="file" id="exterior-right" accept="image/*" data-type="exterior_right">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Right Side</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="upload-section">
                        <h3>🪑 Interior Photos (3 required)</h3>
                        <div class="image-upload">
                            <div class="upload-box" onclick="document.getElementById('interior-dashboard').click()">
                                <input type="file" id="interior-dashboard" accept="image/*" data-type="interior_dashboard">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Dashboard</div>
                            </div>
                            <div class="upload-box" onclick="document.getElementById('interior-seats').click()">
                                <input type="file" id="interior-seats" accept="image/*" data-type="interior_seats">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Seats</div>
                            </div>
                            <div class="upload-box" onclick="document.getElementById('interior-floor').click()">
                                <input type="file" id="interior-floor" accept="image/*" data-type="interior_floor">
                                <div class="upload-icon">📷</div>
                                <div class="upload-label">Floor Mats</div>
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="submit-btn" id="submitBtn" disabled>
                        Submit for Quality Check
                    </button>
                </form>
                
                <div id="result" class="result"></div>
            </div>
        `;

        // Initialize QA upload
        qaUpload.init();

        // Setup realtime subscription for notifications (only if not already subscribed)
        if (user && !this._uploadNotificationsSubscribed) {
            this._uploadNotificationsSubscribed = true;
            const role = await auth.getUserRole() || 'fox';
            notifications.subscribe(user.id, (qaResult) => {
                // Update UI when QA completes (received via Supabase Realtime)
                const resultDiv = document.getElementById('result');
                if (resultDiv) {
                    // Scroll to result
                    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    if (qaResult.overall_status === 'pass') {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = `
                            <h3>✅ Quality Check: PASSED</h3>
                            <p><strong>Great job!</strong> All photos look clean.</p>
                            ${qaResult.processing_time_seconds ? `<p><small>Processed in ${qaResult.processing_time_seconds} seconds</small></p>` : ''}
                            ${qaResult.task_id ? `<p><small>Task: ${qaResult.task_id}</small></p>` : ''}
                        `;
                    } else {
                        resultDiv.className = 'result fail';
                        resultDiv.innerHTML = `
                            <h3>❌ Quality Check: FAILED</h3>
                            <p><strong>Issues found:</strong> ${qaResult.total_issues || 0}</p>
                            <p><strong>Critical Issues:</strong> ${qaResult.critical_issues_count || 0}</p>
                            <p><strong>Minor Issues:</strong> ${qaResult.minor_issues_count || 0}</p>
                            ${qaResult.feedback_text ? `<p><strong>Feedback:</strong><br>${qaResult.feedback_text}</p>` : '<p>Please review the issues and resubmit.</p>'}
                            ${qaResult.processing_time_seconds ? `<p><small>Processed in ${qaResult.processing_time_seconds} seconds</small></p>` : ''}
                            ${qaResult.task_id ? `<p><small>Task: ${qaResult.task_id}</small></p>` : ''}
                        `;
                    }
                    resultDiv.style.display = 'block';
                }
            }, role);
        }
    }

    async showDashboard() {
        const container = document.getElementById('app-content');
        const user = auth.getUser();
        const role = await auth.getUserRole() || 'fox';
        const userName = user?.user_metadata?.full_name || user?.email || 'User';
        
        // Role-based dashboard content
        let dashboardContent = '';
        
        if (role === 'fox') {
            dashboardContent = `
                <div class="dashboard-header">
                    <h1>🦊 Fox Dashboard</h1>
                    <p class="role-badge">Role: Field Worker (Fox)</p>
                    <p style="color: var(--muted); margin-top: 8px;">Welcome, ${userName}</p>
                </div>
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Upload Photos</h3>
                        <p>Submit vehicle QA photos for AI analysis</p>
                        <button class="btn-primary" onclick="app.navigate('/upload')">Go to Upload</button>
                    </div>
                    <div class="stat-card">
                        <h3>My Tasks</h3>
                        <p>View your QA submission history</p>
                        <button class="btn-secondary" onclick="loadFoxTasks()">View Tasks</button>
                    </div>
                </div>
                <div id="foxTasksContainer"></div>
            `;
        } else if (role === 'client') {
            dashboardContent = `
                <div class="dashboard-header">
                    <h1>👔 Client Dashboard</h1>
                    <p class="role-badge">Role: Client</p>
                    <p style="color: var(--muted); margin-top: 8px;">Welcome, ${userName}</p>
                </div>
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Quality Reports</h3>
                        <p>View all QA results for your vehicles</p>
                        <button class="btn-primary" onclick="loadClientReports()">View Reports</button>
                    </div>
                    <div class="stat-card">
                        <h3>Notifications</h3>
                        <p id="notificationStatus">You'll receive instant notifications when QA completes</p>
                    </div>
                </div>
                <div id="clientReportsContainer"></div>
            `;
            // Set up client-specific notifications
            this.setupClientNotifications();
        } else if (role === 'admin') {
            dashboardContent = `
                <div class="dashboard-header">
                    <h1>⚙️ Admin Dashboard</h1>
                    <p class="role-badge">Role: Administrator</p>
                    <p style="color: var(--muted); margin-top: 8px;">Welcome, ${userName}</p>
                </div>
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>All Quality Checks</h3>
                        <p>Monitor all QA submissions</p>
                        <button class="btn-primary" onclick="loadAllQualityChecks()">View All</button>
                    </div>
                    <div class="stat-card">
                        <h3>Users</h3>
                        <p>Manage users and roles</p>
                        <button class="btn-secondary" onclick="loadUsers()">Manage Users</button>
                    </div>
                    <div class="stat-card">
                        <h3>Clients</h3>
                        <p>Manage client accounts</p>
                        <button class="btn-secondary" onclick="loadClients()">Manage Clients</button>
                    </div>
                </div>
                <div id="adminContentContainer"></div>
            `;
        }
        
        container.innerHTML = `
            <div class="container">
                ${dashboardContent}
            </div>
        `;
    }

    async setupClientNotifications() {
        const user = auth.getUser();
        if (!user) return;
        
        // Get client_id associated with this user
        const clientId = await auth.getUserClientId();
        
        if (!clientId) {
            console.warn('Client ID not found for user. Notifications may not work correctly.');
        }
        
        // Subscribe to quality_checks - clients will see notifications for their client_id
        notifications.subscribe(user.id, (qaResult) => {
            // Only show notification if this QA is for this client
            if (clientId && qaResult.client_id === clientId) {
                this.showClientNotification(qaResult);
            } else if (!clientId) {
                // If no client_id match, show all (for demo purposes)
                this.showClientNotification(qaResult);
            }
        }, 'client', clientId);
    }

    showClientNotification(qaResult) {
        const notification = document.createElement('div');
        notification.className = 'notification-banner';
        const status = qaResult.overall_status === 'pass' ? '✅ PASSED' : '❌ NEEDS ATTENTION';
        notification.innerHTML = `
            <div class="notification-content">
                <strong>Quality Check ${status}</strong>
                <p>Task: ${qaResult.task_id}</p>
                <p>Vehicle: ${qaResult.vehicle_id}</p>
                <p>Status: ${qaResult.overall_status === 'pass' ? 'All photos clean!' : `${qaResult.total_issues} issues found`}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 10000);
    }
}

window.app = new App();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

