// Real-time notifications module using Supabase Realtime
class Notifications {
    constructor() {
        this.channel = null;
        this.callbacks = [];
    }

    // Initialize realtime subscription for quality_checks
    subscribe(userId, callback, role = 'fox', clientId = null) {
        if (this.channel) {
            this.unsubscribe();
        }

        // Subscribe to quality_checks table changes
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return;
        }

        // Different filters based on role
        let filter = null;
        
        if (role === 'fox') {
            // Fox gets their own tasks
            filter = `fox_id=eq.${userId}`;
        } else if (role === 'client' && clientId) {
            // Clients get notifications for their client_id
            filter = `client_id=eq.${clientId}`;
        } else if (role === 'admin') {
            // Admin sees all (no filter)
            filter = null;
        } else {
            // Default: no filter
            filter = null;
        }

        const subscriptionConfig = {
            event: 'INSERT',
            schema: 'public',
            table: 'quality_checks',
            ...(filter ? { filter } : {})
        };

        this.channel = window.supabaseClient
            .channel('quality_checks_changes')
            .on('postgres_changes', subscriptionConfig, (payload) => {
                console.log('Quality check completed:', payload.new);
                this.showNotification(payload.new, role);
                if (callback) callback(payload.new);
            })
            .subscribe();

        console.log(`Subscribed to quality_checks realtime updates (role: ${role}, filter: ${filter || 'all'})`);
    }

    // Unsubscribe from realtime
    unsubscribe() {
        if (this.channel && window.supabaseClient) {
            window.supabaseClient.removeChannel(this.channel);
            this.channel = null;
        }
    }

    // Show browser notification
    showNotification(qaResult) {
        const status = qaResult.overall_status === 'pass' ? '✅ PASSED' : '❌ FAILED';
        const message = qaResult.overall_status === 'pass' 
            ? 'All photos look clean! Great job! 🎉'
            : `Found ${qaResult.total_issues} issues. Action needed.`;

        // Create in-app notification
        this.createInAppNotification(status, message, qaResult);

        // Browser notification (if permission granted)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Quality Check ${status}`, {
                body: message,
                icon: '/favicon.ico',
                tag: `qa-${qaResult.task_id}`
            });
        }
    }

    // Create in-app notification banner
    createInAppNotification(title, message, qaResult) {
        const notification = document.createElement('div');
        notification.className = 'notification-banner';
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${message}</p>
                <small>Task: ${qaResult.task_id}</small>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // Request browser notification permission
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
}

// Export singleton instance
window.notifications = new Notifications();

