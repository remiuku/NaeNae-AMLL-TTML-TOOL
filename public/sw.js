// The website used to install an offline service worker at this URL. Browsers
// that still run it fetch this file on their update check, so it has to keep
// existing: it removes itself and its caches, then reloads open tabs from the
// network. Delete it once old installs have had time to update.

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await self.caches.keys();
			await Promise.all(cacheNames.map((name) => self.caches.delete(name)));
			await self.registration.unregister();
			const windows = await self.clients.matchAll({ type: "window" });
			for (const client of windows) {
				client.navigate(client.url);
			}
		})(),
	);
});
