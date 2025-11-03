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
            console.error('❌ N8N_WEBHOOK_URL is not set. Config:', window.config?.getAll());
            return;
        }
        
        console.log('📤 Submitting to webhook:', webhookUrl);
        console.log('📦 Payload:', payload);
        
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // Parse webhook response - n8n should return results when workflow completes
            let webhookResponse = null;
            let responseText = '';
            try {
                const contentType = response.headers.get('content-type') || '';
                responseText = await response.text();
                
                console.log('Webhook response status:', response.status);
                console.log('Webhook response content-type:', contentType);
                console.log('Webhook response body (first 500 chars):', responseText.substring(0, 500));
                
                if (responseText && (contentType.includes('application/json') || responseText.trim().startsWith('{'))) {
                    webhookResponse = JSON.parse(responseText);
                    console.log('✅ Parsed webhook response:', webhookResponse);
                } else if (responseText) {
                    console.log('Non-JSON response:', responseText.substring(0, 200));
                }
            } catch (e) {
                console.warn('⚠️ Could not parse webhook response:', e);
                console.log('Raw response text:', responseText);
            }
            
            // Show results if webhook returned them, otherwise show "processing" message
            resultDiv.className = 'result success';
            
            // Check for results in webhook response - handle multiple possible formats
            const status = webhookResponse?.status || webhookResponse?.overall_status;
            const hasResults = status && (status === 'pass' || status === 'fail' || status === 'review_needed');
            
            if (webhookResponse && hasResults) {
                // Webhook returned results - display them immediately!
                resultDiv.className = status === 'pass' ? 'result success' : 'result fail';
                const totalIssues = webhookResponse.total_issues || 0;
                const feedback = webhookResponse.feedback || webhookResponse.feedback_text || '';
                const processingTime = webhookResponse.processing_time_seconds || 0;
                
                resultDiv.innerHTML = `
                    <h3>${status === 'pass' ? '✅' : '❌'} Quality Check: ${status.toUpperCase()}</h3>
                    <p><strong>${status === 'pass' ? 'Great job! All photos look clean.' : `Issues found: ${totalIssues}`}</strong></p>
                    ${feedback ? `<p><strong>Feedback:</strong><br>${feedback}</p>` : ''}
                    ${processingTime ? `<p><small>Processed in ${processingTime} seconds</small></p>` : ''}
                    ${webhookResponse.images_analyzed ? `<p><small>Images analyzed: ${webhookResponse.images_analyzed} | Passed: ${webhookResponse.images_passed || 0} | Failed: ${webhookResponse.images_failed || 0}</small></p>` : ''}
                    <p><small>Task ID: ${task_id}</small></p>
                `;
            } else if (webhookResponse) {
                // Webhook responded but format is unexpected - log it and show what we got
                console.log('Webhook responded with unexpected format:', webhookResponse);
                resultDiv.innerHTML = `
                    <h3>✅ Photos Submitted!</h3>
                    <p><strong>Quality check completed!</strong></p>
                    <p><small>Processing finished. ${webhookResponse.feedback ? `Feedback: ${webhookResponse.feedback}` : 'No issues detected.'}</small></p>
                    <p><small>Task ID: ${task_id}</small></p>
                    <p><small style="color: var(--muted); font-size: 11px;">Note: Check browser console for full response details.</small></p>
                `;
            } else {
                // No webhook response or empty - workflow might be processing asynchronously
                resultDiv.innerHTML = `
                    <h3>✅ Photos Submitted!</h3>
                    <p><strong>Quality check is processing...</strong></p>
                    <p>You'll receive a <strong>real-time notification</strong> when the AI analysis is complete (1-2 minutes).</p>
                    <p><small>Task ID: ${task_id}</small></p>
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
            console.error('❌ Submission error:', error);
            console.error('Webhook URL attempted:', webhookUrl);
            console.error('Full error:', error);
            
            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Could not reach webhook. Check if n8n is running and CORS is configured.';
            }
            
            resultDiv.className = 'result fail';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>❌ Submission Failed</h3>
                <p><strong>Failed to submit photos. Please try again.</strong></p>
                <p><small>Error: ${errorMessage}</small></p>
                <p><small style="color: var(--muted); font-size: 11px;">Webhook URL: ${webhookUrl || 'Not configured'}</small></p>
                <p><small style="color: var(--muted); font-size: 11px;">Check browser console (F12) for more details.</small></p>
            `;
            submitBtn.disabled = false;
        }
    }
}

window.qaUpload = new QAUpload();
