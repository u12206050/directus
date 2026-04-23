import { useEnv } from '@directus/env';
import { CORE_LICENSE } from '@directus/license';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { countActiveCollections } from './lib/collections.js';
import { checkCustomLLM } from './lib/custom-llms-enabled.js';
import { checkCustomPermissionRules } from './lib/custom-permission-rules-enabled.js';
import { countActiveFlows } from './lib/flows.js';
import { countActiveSeats } from './lib/seats.js';
import { checkUsersSSO } from './lib/sso-enabled.js';
import { EntitlementManager } from './manager.js';

vi.mock('@directus/env', async () => {
	const { mockEnv } = await import('../../test-utils/env.js');
	return mockEnv({ SKIP_LICENSE: false });
});

vi.mock('@directus/license', () => ({
	CORE_LICENSE: {
		entitlements: {
			sso_enabled: { default: false },
			custom_llms_enabled: { default: false },
			custom_permission_rules_enabled: { default: false },
			seats: { limit: 1, overage: 0, addon: 0 },
			collections: { limit: 1, overage: 0, addon: 0 },
			flows: { limit: 1, overage: 0, addon: 0 },
			production_enabled: { default: false },
			display_powered_by: true,
			ai_translations_enabled: { default: false },
		},
		meta: { validation_interval: -1 },
	},
	COUNTABLE_ENTITLEMENT_KEYS: ['seats', 'collections', 'flows'],
	FEATURE_FLAG_ENTITLEMENT_KEYS: ['sso_enabled', 'custom_llms_enabled', 'custom_permission_rules_enabled'],
}));

vi.mock('../../bus/index.js', () => ({
	useBus: () => ({
		subscribe: vi.fn(),
		publish: vi.fn(),
	}),
}));

vi.mock('./lib/collections.js', () => ({
	countActiveCollections: vi.fn(),
	resolveCollections: vi.fn(),
}));

vi.mock('./lib/flows.js', () => ({
	countActiveFlows: vi.fn(),
	resolveFlows: vi.fn(),
}));

vi.mock('./lib/seats.js', () => ({
	countActiveSeats: vi.fn(),
	resolveSeats: vi.fn(),
}));

vi.mock('./lib/sso-enabled.js', () => ({
	checkUsersSSO: vi.fn(),
	resolveSSOUsers: vi.fn(),
}));

vi.mock('./lib/custom-llms-enabled.js', () => ({
	checkCustomLLM: vi.fn(),
}));

vi.mock('./lib/custom-permission-rules-enabled.js', () => ({
	checkCustomPermissionRules: vi.fn(),
}));

describe('EntitlementManager', () => {
	beforeEach(() => {
		vi.mocked(useEnv).mockReturnValue({ SKIP_LICENSE: false } as any);
		vi.mocked(countActiveSeats).mockReset();
		vi.mocked(countActiveCollections).mockReset();
		vi.mocked(countActiveFlows).mockReset();
		vi.mocked(checkUsersSSO).mockReset();
		vi.mocked(checkCustomLLM).mockReset();
		vi.mocked(checkCustomPermissionRules).mockReset();
	});

	describe('SKIP_LICENSE', () => {
		beforeEach(() => {
			vi.mocked(useEnv).mockReturnValue({ SKIP_LICENSE: true } as any);
		});

		test('isEntitled returns true', () => {
			const manager = new EntitlementManager();

			expect(manager.isEntitled('sso_enabled')).toBe(true);
			expect(manager.isEntitled('custom_llms_enabled')).toBe(true);
			expect(manager.isEntitled('custom_permission_rules_enabled')).toBe(true);
		});

		test('getEntitlementLimit returns -1', () => {
			const manager = new EntitlementManager();

			expect(manager.getEntitlementLimit('seats')).toBe(-1);
			expect(manager.getEntitlementLimit('collections')).toBe(-1);
			expect(manager.getEntitlementLimit('flows')).toBe(-1);
		});

		test('assert does not throw and does not invoke counters', async () => {
			const manager = new EntitlementManager();

			await expect(manager.assert('seats', { adding: 1 })).resolves.toBeUndefined();
			await expect(manager.assert('sso_enabled')).resolves.toBeUndefined();
			expect(countActiveSeats).not.toHaveBeenCalled();
			expect(checkUsersSSO).not.toHaveBeenCalled();
		});

		test('check returns allowed without invoking counters or validators', async () => {
			const manager = new EntitlementManager();

			await expect(manager.check('seats')).resolves.toEqual({
				allowed: true,
				hardLimit: -1,
				usage: 0,
				remaining: null,
			});

			await expect(manager.check('sso_enabled')).resolves.toEqual({
				valid: true,
				entitled: true,
			});

			expect(countActiveSeats).not.toHaveBeenCalled();
			expect(countActiveCollections).not.toHaveBeenCalled();
			expect(countActiveFlows).not.toHaveBeenCalled();
			expect(checkUsersSSO).not.toHaveBeenCalled();
			expect(checkCustomLLM).not.toHaveBeenCalled();
			expect(checkCustomPermissionRules).not.toHaveBeenCalled();
		});

		test('getUsage and isValid skip registered sources', async () => {
			const manager = new EntitlementManager();

			await expect(manager.getUsage('seats')).resolves.toBe(0);
			await expect(manager.isValid('sso_enabled')).resolves.toBe(true);
			expect(countActiveSeats).not.toHaveBeenCalled();
			expect(checkUsersSSO).not.toHaveBeenCalled();
		});

		test('checkAll and assertAll short-circuit', async () => {
			const manager = new EntitlementManager();

			await expect(manager.checkAll()).resolves.toBe(true);
			await expect(manager.assertAll()).resolves.toBeUndefined();
			expect(countActiveSeats).not.toHaveBeenCalled();
			expect(checkUsersSSO).not.toHaveBeenCalled();
		});
	});

	test('isEntitled uses core entitlements when skip is disabled', () => {
		const manager = new EntitlementManager();

		expect(manager.isEntitled('sso_enabled')).toBe(
			CORE_LICENSE.entitlements.sso_enabled.override ?? CORE_LICENSE.entitlements.sso_enabled.default,
		);
	});
});
