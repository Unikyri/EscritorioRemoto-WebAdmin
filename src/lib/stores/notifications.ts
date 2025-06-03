import { writable } from 'svelte/store';

export interface Notification {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	timeout?: number;
}

function createNotificationStore() {
	const { subscribe, update } = writable<Notification[]>([]);

	return {
		subscribe,
		add: (notification: Omit<Notification, 'id'>) => {
			const id = Math.random().toString(36).substring(2, 9);
			const newNotification = { ...notification, id };
			
			update(notifications => [...notifications, newNotification]);
			
			// Auto-remove after timeout
			if (notification.timeout) {
				setTimeout(() => {
					update(notifications => notifications.filter(n => n.id !== id));
				}, notification.timeout);
			}
		},
		remove: (id: string) => {
			update(notifications => notifications.filter(n => n.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const notifications = createNotificationStore(); 