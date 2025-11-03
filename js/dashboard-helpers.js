// Dashboard helper functions for loading data

// Load tasks for Fox (field worker)
async function loadFoxTasks() {
    const container = document.getElementById('foxTasksContainer');
    if (!container) return;
    
    const user = auth.getUser();
    if (!user) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('quality_checks')
            .select('*')
            .eq('fox_id', user.id)
            .order('processing_completed_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            container.innerHTML = `
                <h3 style="margin-top: 32px; margin-bottom: 16px;">Recent QA Submissions</h3>
                <div class="tasks-list">
                    ${data.map(task => `
                        <div class="task-item">
                            <div class="task-header">
                                <strong>Task: ${task.task_id}</strong>
                                <span class="task-status ${task.overall_status}">${task.overall_status === 'pass' ? '✅ PASS' : '❌ FAIL'}</span>
                            </div>
                            <div class="task-details">
                                <p>Vehicle: ${task.vehicle_id || 'N/A'}</p>
                                <p>Issues: ${task.total_issues || 0}</p>
                                <p>Completed: ${new Date(task.processing_completed_at).toLocaleString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 32px;">No tasks yet. Upload your first photos!</p>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        container.innerHTML = '<p style="color: var(--orange);">Error loading tasks. Please try again.</p>';
    }
}

// Load reports for Client
async function loadClientReports() {
    const container = document.getElementById('clientReportsContainer');
    if (!container) return;
    
    const user = auth.getUser();
    if (!user) return;
    
    // Get client_id associated with this user
    // For now, we'll query all quality_checks - in production, match by client_id from clients table
    try {
        const { data, error } = await window.supabaseClient
            .from('quality_checks')
            .select('*')
            .order('processing_completed_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            container.innerHTML = `
                <h3 style="margin-top: 32px; margin-bottom: 16px;">Quality Reports</h3>
                <div class="tasks-list">
                    ${data.map(report => `
                        <div class="task-item">
                            <div class="task-header">
                                <strong>Task: ${report.task_id}</strong>
                                <span class="task-status ${report.overall_status}">${report.overall_status === 'pass' ? '✅ PASS' : '❌ NEEDS ATTENTION'}</span>
                            </div>
                            <div class="task-details">
                                <p>Vehicle: ${report.vehicle_id || 'N/A'}</p>
                                <p>Fox ID: ${report.fox_id || 'N/A'}</p>
                                <p>Issues Found: ${report.total_issues || 0}</p>
                                <p>Completed: ${new Date(report.processing_completed_at).toLocaleString()}</p>
                                ${report.feedback_text ? `<p><strong>Feedback:</strong> ${report.feedback_text}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 32px;">No reports yet.</p>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = '<p style="color: var(--orange);">Error loading reports. Please try again.</p>';
    }
}

// Load all quality checks for Admin
async function loadAllQualityChecks() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('quality_checks')
            .select('*')
            .order('processing_completed_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        container.innerHTML = `
            <h3 style="margin-top: 32px; margin-bottom: 16px;">All Quality Checks</h3>
            <div class="tasks-list">
                ${data.map(check => `
                    <div class="task-item">
                        <div class="task-header">
                            <strong>Task: ${check.task_id}</strong>
                            <span class="task-status ${check.overall_status}">${check.overall_status === 'pass' ? '✅ PASS' : '❌ FAIL'}</span>
                        </div>
                        <div class="task-details">
                            <p>Fox: ${check.fox_id}</p>
                            <p>Client: ${check.client_id}</p>
                            <p>Vehicle: ${check.vehicle_id || 'N/A'}</p>
                            <p>Issues: ${check.total_issues || 0}</p>
                            <p>Completed: ${new Date(check.processing_completed_at).toLocaleString()}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading quality checks:', error);
        container.innerHTML = '<p style="color: var(--orange);">Error loading data.</p>';
    }
}

// Load users for Admin
async function loadUsers() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = `
            <h3 style="margin-top: 32px; margin-bottom: 16px;">Users Management</h3>
            <div class="tasks-list">
                ${data.map(user => `
                    <div class="task-item" id="user-${user.id}">
                        <div class="task-header">
                            <strong>${user.full_name}</strong>
                            <span class="task-status role-badge role-${user.role || 'fox'}">${(user.role || 'fox').toUpperCase()}</span>
                        </div>
                        <div class="task-details">
                            <p>Email: ${user.email}</p>
                            <p>Active: ${user.is_active ? '✅' : '❌'}</p>
                            <p>Created: ${new Date(user.created_at).toLocaleString()}</p>
                            <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                                <label style="font-size: 13px; color: var(--muted);">Assign Role:</label>
                                <select id="role-select-${user.id}" style="padding: 6px 10px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: white; font-size: 13px;">
                                    <option value="fox" ${(user.role || 'fox') === 'fox' ? 'selected' : ''}>🦊 Fox (Field Worker)</option>
                                    <option value="client" ${user.role === 'client' ? 'selected' : ''}>👔 Client</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>⚙️ Admin</option>
                                </select>
                                <button onclick="updateUserRole('${user.id}')" class="btn-secondary" style="padding: 6px 16px; font-size: 13px;">Update Role</button>
                            </div>
                            <div id="role-update-status-${user.id}" style="margin-top: 8px; font-size: 12px;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p style="color: var(--orange);">Error loading users.</p>';
    }
}

// Update user role (called from admin dashboard)
async function updateUserRole(userId) {
    const roleSelect = document.getElementById(`role-select-${userId}`);
    const statusDiv = document.getElementById(`role-update-status-${userId}`);
    
    if (!roleSelect || !statusDiv) return;
    
    const newRole = roleSelect.value;
    
    // Show loading
    statusDiv.innerHTML = '<span style="color: var(--orange);">Updating...</span>';
    statusDiv.style.display = 'block';
    
    try {
        const { error } = await window.supabaseClient
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Update UI
        const userItem = document.getElementById(`user-${userId}`);
        if (userItem) {
            const roleBadge = userItem.querySelector('.role-badge');
            if (roleBadge) {
                roleBadge.className = `task-status role-badge role-${newRole}`;
                roleBadge.textContent = newRole.toUpperCase();
            }
        }
        
        statusDiv.innerHTML = '<span style="color: #48bb78;">✅ Role updated successfully!</span>';
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error updating role:', error);
        statusDiv.innerHTML = `<span style="color: var(--orange);">❌ Error: ${error.message}</span>`;
    }
}

// Make function globally available
window.updateUserRole = updateUserRole;

// Load clients for Admin
async function loadClients() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = `
            <h3 style="margin-top: 32px; margin-bottom: 16px;">Clients Management</h3>
            <div class="tasks-list">
                ${data.map(client => `
                    <div class="task-item">
                        <div class="task-header">
                            <strong>${client.name}</strong>
                            <span class="task-status">${client.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="task-details">
                            <p>Email: ${client.contact_email || 'N/A'}</p>
                            <p>Phone: ${client.contact_phone || 'N/A'}</p>
                            <p>Industry: ${client.industry || 'N/A'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading clients:', error);
        container.innerHTML = '<p style="color: var(--orange);">Error loading clients.</p>';
    }
}

