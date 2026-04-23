import { useEnv } from '@directus/env';
import { CORE_LICENSE } from '@directus/license';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getSchema } from '../utils/get-schema.js';
import { getLicenseManager } from './manager.js';
import { computeLicenseStatus } from './utils/compute-license-status.js';
import { getLicenseToken } from './utils/get-license-token.js';

vi.mock('@directus/env', async () => {
	const { mockEnv } = await import('../test-utils/env.js');
	return mockEnv({ SKIP_LICENSE: true, LICENSE_NAMESPACE: 'license' });
});

vi.mock('@directus/license', () => ({
	CORE_LICENSE: {
		entitlements: {},
		meta: { validation_interval: -1 },
	},
	COUNTABLE_ENTITLEMENT_KEYS: ['seats', 'collections', 'flows'],
	activateKey: vi.fn(),
	billingPortal: vi.fn(),
	deactivateKey: vi.fn(),
	deleteAddon: vi.fn(),
	previewKey: vi.fn(),
	readAddons: vi.fn(),
	refreshLicense: vi.fn(),
	updateAddonQuantity: vi.fn(),
	updateKey: vi.fn(),
	verifyLicense: vi.fn(),
	LicenseServerError: class LicenseServerError extends Error {},
}));

vi.mock('../utils/store.js', () => ({
	useStore: vi.fn(() => vi.fn()),
}));

vi.mock('../bus/index.js', () => ({
	useBus: () => ({
		subscribe: vi.fn(),
		publish: vi.fn(),
	}),
}));

vi.mock('../logger/index.js', () => ({
	useLogger: () => ({
		fatal: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	}),
}));

vi.mock('../utils/get-schema.js', () => ({
	getSchema: vi.fn(async () => {
		throw new Error('getSchema should not be called when SKIP_LICENSE is true');
	}),
}));

vi.mock('./utils/get-license-token.js', () => ({
	getLicenseToken: vi.fn(async () => {
		throw new Error('getLicenseToken should not be called when SKIP_LICENSE is true');
	}),
}));

vi.mock('./utils/get-license-key.js', () => ({
	getLicenseKey: vi.fn(async () => {
		throw new Error('getLicenseKey should not be called when SKIP_LICENSE is true');
	}),
}));

vi.mock('../services/settings.js', () => ({
	SettingsService: class {
		constructor() {
			throw new Error('SettingsService should not be constructed when SKIP_LICENSE is true');
		}
	},
}));

vi.mock('../services/index.js', () => ({
	UsersService: vi.fn(),
}));

vi.mock('../permissions/cache.js', () => ({
	clearCache: vi.fn(),
}));

vi.mock('../schedules/license.js', () => ({
	default: vi.fn(),
	stopLicenseCheck: vi.fn(),
}));

vi.mock('./utils/compute-license-status.js', () => ({
	computeLicenseStatus: vi.fn(async () => {
		throw new Error('computeLicenseStatus should not be called when SKIP_LICENSE is true');
	}),
}));

vi.mock('./entitlements/manager.js', () => ({
	getEntitlementManager: vi.fn(() => ({
		setEntitlements: vi.fn(),
	})),
	EntitlementManager: vi.fn(),
}));

vi.mock('./entitlements/lib/collections.js', () => ({
	getActiveCollections: vi.fn(),
}));

vi.mock('./entitlements/lib/flows.js', () => ({
	getActiveFlows: vi.fn(),
}));

vi.mock('./entitlements/lib/seats.js', () => ({
	getActiveSeats: vi.fn(),
}));

describe('LicenseManager SKIP_LICENSE', () => {
	beforeEach(() => {
		vi.mocked(useEnv).mockReturnValue({ SKIP_LICENSE: true, LICENSE_NAMESPACE: 'license' } as any);
	});

	test('initialize does not read settings or activate a license', async () => {
		const manager = getLicenseManager();

		await expect(manager.initialize()).resolves.toBeUndefined();
		expect(getSchema).not.toHaveBeenCalled();
	});

	test('isLocked returns false without computing status', async () => {
		const manager = getLicenseManager();

		await manager.initialize();

		await expect(manager.isLocked()).resolves.toBe(false);
		expect(computeLicenseStatus).not.toHaveBeenCalled();
	});

	test('getStatus returns active', async () => {
		const manager = getLicenseManager();

		await manager.initialize();

		await expect(manager.getStatus()).resolves.toBe('active');
		expect(computeLicenseStatus).not.toHaveBeenCalled();
	});

	test('getLicense returns CORE_LICENSE without token lookup', async () => {
		const manager = getLicenseManager();

		await manager.initialize();

		await expect(manager.getLicense()).resolves.toBe(CORE_LICENSE);
		expect(getLicenseToken).not.toHaveBeenCalled();
	});
});
