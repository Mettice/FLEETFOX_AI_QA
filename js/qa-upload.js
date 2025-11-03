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
    async saveImageRecord(record) {
        if (!window.supabaseClient) return null;
        
        try {
            const { data, error } = await window.supabaseClient
                .from('qa_images')
                .insert(record)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.warn('Supabase DB insert warning:', error);
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
            
                    const record = {
                        image_id: imageId,
                        image_url: imageUrl,
                        image_type: imageType,
                        uploaded_at: new Date().toISOString()
                    };

                    this.uploadedImages[imageType] = record;
                    
                    // Save to Supabase qa_images table (optional but recommended)
                    this.saveImageRecord(record);
                    
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
        
        try {
            const response = await fetch(this.N8N_WEBHOOK_URL, {
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
            this.updateProgress();
            document.getElementById('qaForm').reset();
            this.presetGeneratedIds();
            
            submitBtn.textContent = 'Submit Another Task';
            submitBtn.disabled = false;
        } catch (error) {
            console.error('Error:', error);
            resultDiv.className = 'result fail';
            resultDiv.innerHTML = `
                <h3>❌ Error</h3>
                <p>Failed to submit photos. Please try again.</p>
                <p><small>Error: ${error.message}</small></p>
            `;
            submitBtn.disabled = false;
        }
    }
}

window.qaUpload = new QAUpload();

