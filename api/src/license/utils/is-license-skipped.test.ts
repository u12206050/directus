import { useEnv } from '@directus/env';
import { afterEach, expect, test, vi } from 'vitest';
import { isLicenseSkipped } from './is-license-skipped.js';

vi.mock('@directus/env', () => ({
	useEnv: vi.fn(),
}));

afterEach(() => {
	vi.mocked(useEnv).mockReset();
});

test('returns true when SKIP_LICENSE is true', () => {
	vi.mocked(useEnv).mockReturnValue({ SKIP_LICENSE: true });

	expect(isLicenseSkipped()).toBe(true);
});

test('returns false when SKIP_LICENSE is false', () => {
	vi.mocked(useEnv).mockReturnValue({ SKIP_LICENSE: false });

	expect(isLicenseSkipped()).toBe(false);
});

test('returns false when SKIP_LICENSE is undefined', () => {
	vi.mocked(useEnv).mockReturnValue({});

	expect(isLicenseSkipped()).toBe(false);
});
