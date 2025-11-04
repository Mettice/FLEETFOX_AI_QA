// QA Upload module - handles photo upload and submission
class QAUpload {
    constructor() {
        this.uploadedImages = {};
        this.totalUploaded = 0;
        // Read from config (environment variables)
        this.N8N_WEBHOOK_URL = window.config?.N8N_WEBHOOK_URL || 
            'http://localhost:5678/webhook-test/vehicle-qa-trigger';
    }

    init() {
        this.setupEventListeners();
        this.presetGeneratedIds();
        this.loadClientsIntoSelect();
        // Restore images after DOM is ready (slight delay to ensure inputs exist)
        setTimeout(() => {
            this.restoreUploadedImages();
        }, 100);
    }
    
    // Save uploaded images to localStorage
    saveUploadedImages() {
        try {
            localStorage.setItem('qa_uploaded_images', JSON.stringify(this.uploadedImages));
        } catch (e) {
            console.warn('Could not save uploaded images to localStorage:', e);
        }
    }
    
    // Restore uploaded images from localStorage and display them
    restoreUploadedImages() {
        try {
            const saved = localStorage.getItem('qa_uploaded_images');
            if (!saved) return;
            
            const savedImages = JSON.parse(saved);
            if (!savedImages || Object.keys(savedImages).length === 0) return;
            
            // Restore the data
            this.uploadedImages = savedImages;
            
            // Restore visual state for each uploaded image
            Object.entries(savedImages).forEach(([imageType, imageData]) => {
                this.restoreImagePreview(imageType, imageData);
            });
            
            // Update progress
            this.updateProgress();
            
            console.log(`✅ Restored ${Object.keys(savedImages).length} uploaded images`);
        } catch (e) {
            console.warn('Could not restore uploaded images:', e);
            // Clear corrupted data
            localStorage.removeItem('qa_uploaded_images');
        }
    }
    
    // Restore visual preview for a single image
    restoreImagePreview(imageType, imageData) {
        // Map image_type (snake_case) to input ID (kebab-case)
        const inputId = imageType.replace(/_/g, '-');
        const input = document.getElementById(inputId);
        if (!input) {
            // Retry after a short delay (DOM might not be ready yet)
            setTimeout(() => this.restoreImagePreview(imageType, imageData), 100);
            return;
        }
        
        const uploadBox = input.parentElement;
        if (!uploadBox) return;
        
        // Recreate the uploaded state
        uploadBox.classList.add('uploaded');
        
        // Create image preview
        const img = document.createElement('img');
        img.src = imageData.image_url; // Use the saved URL
        img.className = 'preview-image';
        img.onerror = () => {
            // If image URL is invalid, remove it
            delete this.uploadedImages[imageType];
            this.saveUploadedImages();
            uploadBox.innerHTML = '';
            uploadBox.appendChild(input);
            const icon = document.createElement('div');
            icon.className = 'upload-icon';
            icon.textContent = '📷';
            const label = document.createElement('div');
            label.className = 'upload-label';
            label.textContent = this.getDefaultLabel(imageType);
            uploadBox.appendChild(icon);
            uploadBox.appendChild(label);
        };
        
        uploadBox.innerHTML = '';
        uploadBox.appendChild(img);
        
        // Add label
        const label = document.createElement('div');
        label.className = 'upload-label';
        label.textContent = '✓ Uploaded';
        uploadBox.appendChild(label);
        
        // Re-add file input (hidden)
        input.value = '';
        input.style.display = 'none';
        uploadBox.appendChild(input);
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('data-type', imageType);
        uploadBox.appendChild(removeBtn);
    }

    generateSimpleId(prefix) {
        const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const rand = Math.random().toString(36).slice(2,6).toUpperCase();
        return `${prefix}_${d}_${rand}`;
    }

    presetGeneratedIds() {
        const taskInput = document.getElementById('taskId');
        const foxInput = document.getElementById('foxId');
        if (!taskInput) return;
        if (!taskInput.value) taskInput.value = this.generateSimpleId('TASK');
        if (!foxInput.value) foxInput.value = this.generateSimpleId('FOX');
    }

    async loadClientsIntoSelect() {
        const sel = document.getElementById('clientIdSelect');
        if (!sel) return;
        if (!window.supabaseClient) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('client_sla')
                .select('id,client_id,active')
                .eq('active', true)
                .order('client_id');
            
            if (error) throw error;
            
            sel.innerHTML = '<option value="" disabled selected>Select client...</option>';
            data.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.client_id || r.id.slice(0, 8);
                sel.appendChild(opt);
            });
        } catch (err) {
            console.error('Failed to load clients:', err);
            sel.innerHTML = '<option value="" disabled selected>Failed to load clients</option>';
        }
    }

    generateId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }

    async uploadToSupabase(file, imageType, imageId) {
        const useId = imageId || this.generateId();
        const fileName = `${useId}_${imageType}.jpg`;
        const filePath = `uploads/${fileName}`;
        
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        try {
            const { data, error } = await window.supabaseClient.storage
                .from('vehicle-qa-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('vehicle-qa-images')
                .getPublicUrl(filePath);
            
            return publicUrl;
        } catch (error) {
            console.error('Supabase upload error:', error);
            // Fallback to base64
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }
    }

    getDefaultLabel(imageType) {
        const labels = {
            exterior_front: 'Front View',
            exterior_back: 'Back View',
            exterior_left: 'Left Side',
            exterior_right: 'Right Side',
            interior_dashboard: 'Dashboard',
            interior_seats: 'Seats',
            interior_floor: 'Floor Mats'
        };
        return labels[imageType] || 'Upload';
    }

    // Save image record to Supabase qa_images table
    // This is for tracking/reporting - images are already saved to Storage
    async saveImageRecord(record) {
        if (!window.supabaseClient) return null;
        
        // Don't try to save if no user ID (can't satisfy foreign key)
        if (!record.fox_id) {
            console.debug('Skipping qa_images save: no user ID');
            return null;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('qa_images')
                .insert(record)
                .select()
                .single();
            
            if (error) {
                // Foreign key constraint = user doesn't exist (should be rare now that we auto-create users)
                if (error.code === '23503' || error.message?.includes('foreign key constraint') || error.message?.includes('violates foreign key')) {
                    console.debug('Image metadata not saved (user not in users table) - images are still in Storage');
                    return null;
                }
                // RLS or permission errors - might need RLS policy update
                if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('RLS') || error.message?.includes('permission')) {
                    console.debug('Image metadata not saved (RLS/permission) - images are still in Storage. Check RLS policies.');
                    return null;
                }
                // Log other unexpected errors
                console.warn('Unexpected error saving image metadata:', error.message || error);
                return null;
            }
            return data;
        } catch (error) {
            console.warn('Error saving image metadata:', error.message || error);
            return null;
        }
    }

    setupEventListeners() {
        // File upload handlers
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        });

        // Remove button handlers
        document.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.remove-btn');
            if (btn) {
                ev.stopPropagation();
                this.handleRemove(btn);
            }
        });

        // Form submission
        const form = document.getElementById('qaForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const imageType = e.target.dataset.type;
        const uploadBox = e.target.parentElement;
        const imageId = this.generateId();
        const inputEl = e.target;
        
        uploadBox.innerHTML = '<div class="loader"></div><div class="upload-label">Uploading...</div>';
        
        try {
            const imageUrl = await this.uploadToSupabase(file, imageType, imageId);
            
            uploadBox.classList.add('uploaded');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'preview-image';
            uploadBox.innerHTML = '';
            uploadBox.appendChild(img);
            
            const label = document.createElement('div');
            label.className = 'upload-label';
            label.textContent = '✓ Uploaded';
            uploadBox.appendChild(label);

            inputEl.value = '';
            inputEl.style.display = 'none';
            uploadBox.appendChild(inputEl);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.setAttribute('data-type', imageType);
            uploadBox.appendChild(removeBtn);
            
            // Get authenticated user ID for proper data tracking and RLS security
            const user = auth.getUser();
            const userId = user?.id || null;
            
            const record = {
                image_id: imageId,
                image_url: imageUrl,
                image_type: imageType,
                uploaded_at: new Date().toISOString(),
                fox_id: userId // Include user ID for RLS policy verification
            };

            this.uploadedImages[imageType] = record;
            
            // Save to localStorage to persist across navigation
            this.saveUploadedImages();
            
            // Save to Supabase qa_images table (for tracking/reporting)
            // This will succeed if:
            // 1. User record exists in users table (we auto-create on sign-in)
            // 2. RLS policy allows insert
            // If it fails, images are still uploaded to Storage and workflow works
            this.saveImageRecord(record).then(saved => {
                if (saved) {
                    console.debug('✅ Image metadata saved to qa_images table');
                }
            });
            
            this.updateProgress();
        } catch (error) {
            console.error('Upload error:', error);
            uploadBox.innerHTML = '<div class="upload-icon">❌</div><div class="upload-label">Upload failed. Click to retry.</div>';
        }
    }

    handleRemove(btn) {
        const imageType = btn.getAttribute('data-type');
        const box = btn.parentElement;
        const input = box.querySelector('input[type="file"]');
        
        delete this.uploadedImages[imageType];
        if (input) input.value = '';

        box.classList.remove('uploaded');
        box.innerHTML = '';
        if (input) box.appendChild(input);
        const icon = document.createElement('div');
        icon.className = 'upload-icon';
        icon.textContent = '📷';
        const label = document.createElement('div');
        label.className = 'upload-label';
        label.textContent = this.getDefaultLabel(imageType);
        box.appendChild(icon);
        box.appendChild(label);

        // Save to localStorage after removal
        this.saveUploadedImages();
        
        this.updateProgress();
    }

    updateProgress() {
        this.totalUploaded = Object.keys(this.uploadedImages).length;
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = (this.totalUploaded / 7) * 100 + '%';
        }
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            if (this.totalUploaded === 7) {
                submitBtn.disabled = false;
                submitBtn.textContent = `Submit for Quality Check (${this.totalUploaded}/7 photos)`;
            } else {
                submitBtn.disabled = true;
                submitBtn.textContent = `Upload All Photos (${this.totalUploaded}/7)`;
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const resultDiv = document.getElementById('result');
        const submitBtn = document.getElementById('submitBtn');
        
        // Validate all 7 required images
        const requiredTypes = [
            'exterior_front', 'exterior_back', 'exterior_left', 'exterior_right',
            'interior_dashboard', 'interior_seats', 'interior_floor'
        ];
        const uploadedTypes = Object.keys(this.uploadedImages);
        const missingTypes = requiredTypes.filter(type => !uploadedTypes.includes(type));
        
        if (missingTypes.length > 0) {
            resultDiv.className = 'result fail';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>❌ Missing Required Photos</h3>
                <p><strong>Please upload all 7 required photos before submitting:</strong></p>
                <p>Missing: ${missingTypes.map(type => type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}</p>
            `;
            submitBtn.disabled = false;
            return;
        }
        
        resultDiv.className = 'result processing';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loader"></div><strong>Processing Quality Check...</strong><br>You\'ll receive a notification when complete!';
        submitBtn.disabled = true;
        
        const task_id = document.getElementById('taskId').value;
        const fox_id = document.getElementById('foxId').value;
        const client_id = document.getElementById('clientIdSelect').value;
        const vehicle_id = document.getElementById('vehicleId').value || 'UNKNOWN';
        const user = auth.getUser();
        const userId = user?.id || fox_id;

        const images = Object.values(this.uploadedImages).map((img) => ({
            ...img,
            task_id,
            fox_id: userId, // Use authenticated user ID
            client_id,
            vehicle_id
        }));

        const payload = { task_id, fox_id: userId, client_id, vehicle_id, images };
        
        // Ensure config is loaded and get webhook URL
        if (window.config) {
            await window.config.waitForLoad();
        }
        
        // Get webhook URL from config (may have loaded after constructor)
        let webhookUrl = window.config?.N8N_WEBHOOK_URL || this.N8N_WEBHOOK_URL;
        
        // Debug: Log config state (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔍 Config state:', {
                hasConfig: !!window.config,
                configLoaded: window.config?.loaded,
                webhookFromConfig: window.config?.N8N_WEBHOOK_URL,
                finalWebhookUrl: webhookUrl
            });
        }
        
        if (!webhookUrl) {
            resultDiv.className = 'result fail';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>❌ Configuration Error</h3>
                <p><strong>Webhook URL not configured.</strong></p>
                <p><small>Please ensure N8N_WEBHOOK_URL is set in your environment variables or Vercel deployment.</small></p>
                <p><small>Check browser console for more details.</small></p>
            `;
            submitBtn.disabled = false;
            console.error('❌ N8N_WEBHOOK_URL is not set. Config:', window.config?.getAll?.());
            return;
        }
        
        // Check if URL is localhost (won't work from production)
        const isProduction = !window.location.hostname.includes('localhost') && 
                             !window.location.hostname.includes('127.0.0.1') &&
                             window.location.protocol === 'https:';
        const isLocalhostUrl = webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1');
        
        if (isProduction && isLocalhostUrl) {
            resultDiv.className = 'result fail';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>❌ Configuration Error</h3>
                <p><strong>Webhook URL points to localhost.</strong></p>
                <p><small>In production, you must use a publicly accessible n8n instance URL.</small></p>
                <p><small>Current URL: ${webhookUrl}</small></p>
                <p><small>Update N8N_WEBHOOK_URL in Vercel environment variables to your production n8n URL.</small></p>
            `;
            submitBtn.disabled = false;
            console.error('❌ Cannot use localhost URL in production:', webhookUrl);
            return;
        }
        
        // Only log in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📤 Submitting to webhook:', webhookUrl);
            console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
        }
        
        // Create abort controller for timeout (if browser supports it)
        let abortController = null;
        let timeoutId = null;
        
        try {
            // Use AbortSignal.timeout if available, otherwise fallback to setTimeout
            if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                abortController = AbortSignal.timeout(30000); // 30 second timeout
            } else {
                // Fallback for browsers without AbortSignal.timeout
                abortController = new AbortController();
                timeoutId = setTimeout(() => abortController.abort(), 30000);
            }
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: abortController.signal
            });
            
            // Clear timeout if request succeeds
            if (timeoutId) clearTimeout(timeoutId);
            
            // Log response status (only in development)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('📡 Webhook response status:', response.status, response.statusText);
            }
            
            // Get response text once (can only be read once)
            const contentType = response.headers.get('content-type') || '';
            let responseText = '';
            try {
                responseText = await response.text();
            } catch (e) {
                console.error('❌ Could not read response body:', e);
            }
            
            // Handle HTTP error statuses
            if (!response.ok) {
                console.error('❌ HTTP Error Response Body:', responseText);
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }
            
            // Parse webhook response - n8n should return results when workflow completes
            let webhookResponse = null;
            try {
                // Only log full response in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('📥 Webhook response content-type:', contentType);
                    console.log('📥 Webhook response body:', responseText.substring(0, 500));
                }
                
                if (responseText && (contentType.includes('application/json') || responseText.trim().startsWith('{'))) {
                    webhookResponse = JSON.parse(responseText);
                    // Only log parsed response in development
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        console.log('✅ Parsed webhook response');
                    }
                } else if (responseText && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                    console.log('⚠️ Non-JSON response:', responseText.substring(0, 200));
                }
            } catch (e) {
                console.error('❌ Could not parse webhook response:', e);
                // Only log full error in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error('Raw response text:', responseText);
                }
            }
            
            // Check for errors in webhook response FIRST
            const hasError = webhookResponse?.error || 
                           webhookResponse?.workflow_error || 
                           webhookResponse?.status === 'error' ||
                           webhookResponse?.failed === true;
            
            if (hasError) {
                // Workflow failed - show error details
                const errorMessage = webhookResponse?.error_message || 
                                   webhookResponse?.error || 
                                   webhookResponse?.message || 
                                   'Workflow execution failed';
                const errorNode = webhookResponse?.error_node || webhookResponse?.failed_node || 'Unknown';
                const errorDetails = webhookResponse?.error_details || webhookResponse?.details || '';
                
                console.error('❌ Workflow error detected:', errorMessage);
                // Only log full details in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error('Error details:', {
                        node: errorNode,
                        details: errorDetails,
                        fullResponse: webhookResponse
                    });
                }
                
                resultDiv.className = 'result fail';
                resultDiv.innerHTML = `
                    <h3>❌ Quality Check Failed</h3>
                    <p><strong>Workflow Error:</strong> ${errorMessage}</p>
                    ${errorNode !== 'Unknown' ? `<p><small>Failed in node: ${errorNode}</small></p>` : ''}
                    ${errorDetails ? `<p><small style="white-space: pre-line;">${errorDetails}</small></p>` : ''}
                    <p><small>Task ID: ${task_id}</small></p>
                    <p><small style="color: var(--muted); font-size: 11px;">
                        💡 The workflow encountered an error. Please try again in a few moments.<br>
                        If this persists, contact support. Check browser console (F12) for details.
                    </small></p>
                    <button onclick="window.location.reload()" class="btn-primary" style="margin-top: 12px;">Retry Submission</button>
                `;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Try Again';
                return;
            }
            
            // Show results if webhook returned them, otherwise show "processing" message
            resultDiv.className = 'result success';
            
            // Check for results in webhook response - handle multiple possible formats
            const status = webhookResponse?.status || webhookResponse?.overall_status;
            const hasResults = status && (status === 'pass' || status === 'fail' || status === 'review_needed');
            
            if (webhookResponse && hasResults) {
                // Webhook returned results - display them immediately!
                const totalIssues = webhookResponse.total_issues || 0;
                const feedback = webhookResponse.feedback || webhookResponse.feedback_text || '';
                const processingTime = webhookResponse.processing_time_seconds || 0;
                const issues = webhookResponse.issues || webhookResponse.all_issues || [];
                
                // Check if there are actual issues (even if status is 'pass' - this is a bug we need to fix)
                const hasActualIssues = issues.length > 0 || totalIssues > 0 || (feedback && feedback.toLowerCase().includes('clean') === false);
                
                // Override status if issues detected but status is 'pass' (temporary frontend fix)
                let displayStatus = status;
                if (status === 'pass' && hasActualIssues) {
                    displayStatus = 'review_needed'; // Change to review_needed instead of fail
                    // Only log in development
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        console.warn('⚠️ Status mismatch: Workflow returned "pass" but issues detected. Overriding to "review_needed".');
                    }
                }
                
                // Set appropriate CSS class based on status
                if (displayStatus === 'pass') {
                    resultDiv.className = 'result success';
                } else if (displayStatus === 'review_needed') {
                    resultDiv.className = 'result review';
                } else {
                    resultDiv.className = 'result fail';
                }
                
                // Build formatted output
                let contentHtml = '';
                
                if (displayStatus === 'pass') {
                    contentHtml = `
                        <h3>✅ Quality Check: PASSED</h3>
                        <p class="result-summary"><strong>Great job! All photos look clean.</strong></p>
                    `;
                } else if (displayStatus === 'review_needed') {
                    // Display review needed status
                    contentHtml = `
                        <h3>⚠️ Quality Check: REVIEW NEEDED</h3>
                        <p class="result-summary"><strong>Issues Found: ${totalIssues || issues.length || 'Multiple'}</strong></p>
                        <p class="review-notice"><strong>Manual review required.</strong> Please address the issues below and resubmit.</p>
                    `;
                } else {
                    // Display failed status
                    contentHtml = `
                        <h3>❌ Quality Check: FAILED</h3>
                        <p class="result-summary"><strong>Critical Issues Found: ${totalIssues || issues.length || 'Multiple'}</strong></p>
                        <p class="fail-notice"><strong>Action Required:</strong> Critical issues detected. Please address immediately and resubmit.</p>
                    `;
                }
                
                // Display issues if status is not 'pass'
                if (displayStatus !== 'pass') {
                    
                    // Display detailed issues list if available
                    if (issues.length > 0) {
                        contentHtml += `
                            <div class="issues-section">
                                <h4>🔍 Detected Issues:</h4>
                                <ul class="issues-list">
                                    ${issues.map((issue, idx) => {
                                        const issueType = (issue.type || issue.dirt_category || 'Issue').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        const location = (issue.location || 'Unknown location').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        const description = issue.description || issue.location || 'Issue detected';
                                        const severity = issue.severity || issue.confidence || 'N/A';
                                        const severityClass = severity >= 7 ? 'severity-critical' : severity >= 4 ? 'severity-moderate' : 'severity-minor';
                                        
                                        return `
                                            <li class="issue-item ${severityClass}" data-severity="${severity}">
                                                <div class="issue-header">
                                                    <span class="issue-type">${issueType}</span>
                                                    <span class="issue-severity-badge severity-${severity >= 7 ? 'critical' : severity >= 4 ? 'moderate' : 'minor'}">
                                                        ${severity >= 7 ? '🔴 Critical' : severity >= 4 ? '🟡 Moderate' : '🟢 Minor'}
                                                    </span>
                                                </div>
                                                <div class="issue-location">
                                                    📍 <strong>Location:</strong> ${location}
                                                </div>
                                                <div class="issue-description">
                                                    ${description}
                                                </div>
                                            </li>
                                        `;
                                    }).join('')}
                                </ul>
                            </div>
                        `;
                    }
                    
                    // Display feedback/cleaning instructions
                    if (feedback) {
                        // Parse markdown-style formatting in feedback
                        const formattedFeedback = feedback
                            .replace(/^#\s+(.+)$/gm, '<h4 class="feedback-header">$1</h4>')
                            .replace(/\*\*Priority (\d+)[-\s]+(.+?):\*\*/g, '<div class="feedback-priority"><strong>Priority $1 - $2:</strong></div>')
                            .replace(/\n\n/g, '</p><p>')
                            .replace(/^(.+)$/gm, '<p>$1</p>');
                        
                        contentHtml += `
                            <div class="feedback-section">
                                <h4>📋 Cleaning Instructions:</h4>
                                <div class="feedback-content">
                                    ${formattedFeedback}
                                </div>
                            </div>
                        `;
                    }
                }
                
                // Add summary info
                contentHtml += `
                    <div class="result-meta">
                        ${processingTime ? `<div class="meta-item"><span class="meta-label">⏱️ Processing Time:</span> ${processingTime} seconds</div>` : ''}
                        ${webhookResponse.images_analyzed ? `
                            <div class="meta-item">
                                <span class="meta-label">📊 Images:</span> 
                                ${webhookResponse.images_analyzed} analyzed | 
                                <span class="text-success">${webhookResponse.images_passed || 0} passed</span> | 
                                <span class="text-error">${webhookResponse.images_failed || 0} failed</span>
                            </div>
                        ` : ''}
                        <div class="meta-item"><span class="meta-label">🆔 Task ID:</span> ${task_id}</div>
                    </div>
                `;
                
                resultDiv.innerHTML = contentHtml;
            } else if (webhookResponse) {
                // Webhook responded but format is unexpected - log it and show what we got
                // Only log in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('⚠️ Webhook responded with unexpected format:', webhookResponse);
                }
                
                // Check if it's a simple success message
                if (webhookResponse.message || webhookResponse.success) {
                    resultDiv.innerHTML = `
                        <h3>✅ Photos Submitted!</h3>
                        <p><strong>${webhookResponse.message || 'Quality check is processing...'}</strong></p>
                        <p>You'll receive a <strong>real-time notification</strong> when the AI analysis is complete (1-2 minutes).</p>
                        <p><small>Task ID: ${task_id}</small></p>
                        <p><small style="color: var(--muted); font-size: 11px;">Note: Check browser console for full response details.</small></p>
                    `;
                } else {
                    // Unknown format - show processing message
                    resultDiv.innerHTML = `
                        <h3>✅ Photos Submitted!</h3>
                        <p><strong>Quality check is processing...</strong></p>
                        <p>You'll receive a <strong>real-time notification</strong> when the AI analysis is complete (1-2 minutes).</p>
                        <p><small>Task ID: ${task_id}</small></p>
                        <p><small style="color: var(--muted); font-size: 11px;">Note: Check browser console (F12) for full response details.</small></p>
                    `;
                }
            } else {
                // No webhook response or empty - workflow might be processing asynchronously
                resultDiv.innerHTML = `
                    <h3>✅ Photos Submitted!</h3>
                    <p><strong>Quality check is processing...</strong></p>
                    <p>You'll receive a <strong>real-time notification</strong> when the AI analysis is complete (1-2 minutes).</p>
                    <p><small>Task ID: ${task_id}</small></p>
                    <p><small style="color: var(--muted); font-size: 11px;">Note: If you don't receive a notification within 3 minutes, check the browser console (F12) or try resubmitting.</small></p>
                `;
            }
            
            // Reset form
            this.uploadedImages = {};
            this.totalUploaded = 0;
            
            // Clear localStorage after successful submission
            localStorage.removeItem('qa_uploaded_images');
            
            this.updateProgress();
            document.getElementById('qaForm').reset();
            this.presetGeneratedIds();
            
            submitBtn.textContent = 'Submit Another Task';
            submitBtn.disabled = false;
        } catch (error) {
            // Clear timeout if request fails
            if (timeoutId) clearTimeout(timeoutId);
            
            console.error('❌ Submission error:', error.message);
            // Only log full details in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.error('Webhook URL attempted:', webhookUrl);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            
            // Provide more specific error messages
            let errorMessage = error.message;
            let errorDetails = '';
            
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                errorMessage = 'Request timed out. The webhook took too long to respond.';
                errorDetails = 'This usually means n8n is not responding or is overloaded.';
            } else if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Could not reach webhook.';
                errorDetails = 'Possible causes:\n' +
                    '• n8n is not running or not accessible\n' +
                    '• CORS is not configured in n8n\n' +
                    '• Webhook URL is incorrect\n' +
                    '• Network/firewall blocking the request';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS error: Browser blocked the request.';
                errorDetails = 'n8n must allow requests from your domain. Check n8n CORS settings.';
            }
            
            resultDiv.className = 'result fail';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>❌ Submission Failed</h3>
                <p><strong>Failed to submit photos. Please try again.</strong></p>
                <p><small>Error: ${errorMessage}</small></p>
                ${errorDetails ? `<p><small style="white-space: pre-line;">${errorDetails}</small></p>` : ''}
                <p><small style="color: var(--muted); font-size: 11px;">Webhook URL: ${webhookUrl || 'Not configured'}</small></p>
                <p><small style="color: var(--muted); font-size: 11px;">Check browser console (F12) for more details.</small></p>
            `;
            submitBtn.disabled = false;
        }
    }
}

window.qaUpload = new QAUpload();
