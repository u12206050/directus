import { useEnv } from '@directus/env';
import { toBoolean } from '@directus/utils';

export function isLicenseSkipped(): boolean {
	return toBoolean(useEnv()['SKIP_LICENSE']);
}
