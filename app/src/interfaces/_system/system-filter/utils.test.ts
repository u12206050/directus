import type { Field, Relation } from '@directus/types';
import { describe, expect, test } from 'vitest';
import {
	buildJsonFilter,
	buildNoneFilterNode,
	coerceJsonFilterValue,
	getJsonFilterParts,
	getNoneFilter,
	getRelatedCollectionForField,
	initialValueForComparator,
	isJsonFilter,
	JSON_FILTER_OPERATORS,
} from './utils';

describe('JSON filter serialization', () => {
	test('detects only JSON filters supported by the visual row', () => {
		expect(isJsonFilter({ metadata: { _json: {} } })).toBe(true);
		expect(isJsonFilter({ metadata: { _json: { author: { _eq: 'jane' } } } })).toBe(true);
		expect(isJsonFilter({ metadata: { _eq: 'jane' } })).toBe(false);
		expect(isJsonFilter({ metadata: { _json: { author: { _eq: 'jane' }, rating: { _gte: 3 } } } })).toBe(false);
	});

	test('keeps dot and bracket notation as one literal path key', () => {
		expect(buildJsonFilter('metadata', 'data.tags[0]', '_eq', 'featured')).toEqual({
			metadata: { _json: { 'data.tags[0]': { _eq: 'featured' } } },
		});
	});

	test('splits a relational field path without splitting the JSON path', () => {
		expect(buildJsonFilter('category.metadata', 'settings.theme', '_eq', 'dark')).toEqual({
			category: { metadata: { _json: { 'settings.theme': { _eq: 'dark' } } } },
		});
	});

	test('uses an empty JSON block for an incomplete draft', () => {
		expect(buildJsonFilter('metadata', '', '_eq', null)).toEqual({
			metadata: { _json: {} },
		});
	});

	test('round trips a complete JSON condition', () => {
		const node = buildJsonFilter('metadata', 'rating', '_between', [3, 5]);

		expect(getJsonFilterParts(node)).toEqual({
			field: 'metadata',
			path: 'rating',
			operator: '_between',
			value: [3, 5],
		});
	});

	test('returns editable defaults for an incomplete draft', () => {
		expect(getJsonFilterParts({ metadata: { _json: {} } })).toEqual({
			field: 'metadata',
			path: '',
			operator: '_eq',
			value: null,
		});
	});

	test('exposes all scalar JSON operators and no specialized operators', () => {
		expect(JSON_FILTER_OPERATORS).toContain('istarts_with');
		expect(JSON_FILTER_OPERATORS).toContain('between');
		expect(JSON_FILTER_OPERATORS).not.toContain('json');
		expect(JSON_FILTER_OPERATORS).not.toContain('regex');
		expect(JSON_FILTER_OPERATORS).not.toContain('intersects');
	});
});

describe('JSON filter values', () => {
	test.each([
		['3', 3],
		['-2.5', -2.5],
		['true', true],
		['false', false],
		['null', null],
		['jane', 'jane'],
		['"3"', '3'],
	])('coerces %s to the expected JSON scalar', (input, expected) => {
		expect(coerceJsonFilterValue(input, '_eq')).toEqual(expected);
	});

	test('coerces array entries independently', () => {
		expect(coerceJsonFilterValue(['3', 'true', 'jane', '"3"'], '_in')).toEqual([3, true, 'jane', '3']);
	});

	test.each([
		'_contains',
		'_ncontains',
		'_icontains',
		'_starts_with',
		'_nstarts_with',
		'_istarts_with',
		'_nistarts_with',
		'_ends_with',
		'_nends_with',
		'_iends_with',
		'_niends_with',
	] as const)('preserves string values for %s', (operator) => {
		expect(coerceJsonFilterValue('42', operator)).toBe('42');
		expect(coerceJsonFilterValue('true', operator)).toBe('true');
	});

	test('creates the correct value shape when an operator changes', () => {
		expect(initialValueForComparator('_in', 'value')).toEqual(['value']);
		expect(initialValueForComparator('_between', [1, 2, 3])).toEqual([1, 2]);
		expect(initialValueForComparator('_null', 'value')).toBe(true);
		expect(initialValueForComparator('_eq', true, '_null')).toBeNull();
	});
});

describe('getRelatedCollectionForField', () => {
	const o2mRelation: Relation = {
		collection: 'posts',
		field: 'user_id',
		related_collection: 'users',
		schema: null,
		meta: {
			id: 1,
			many_collection: 'posts',
			many_field: 'user_id',
			one_collection: 'users',
			one_field: 'posts',
			one_collection_field: null,
			one_allowed_collections: null,
			junction_field: null,
			sort_field: null,
			one_deselect_action: 'nullify',
		},
	};

	const m2mPrimaryRelation: Relation = {
		collection: 'articles_tags',
		field: 'articles_id',
		related_collection: 'articles',
		schema: null,
		meta: {
			id: 2,
			many_collection: 'articles_tags',
			many_field: 'articles_id',
			one_collection: 'articles',
			one_field: 'tags',
			one_collection_field: null,
			one_allowed_collections: null,
			junction_field: 'tags_id',
			sort_field: null,
			one_deselect_action: 'nullify',
		},
	};

	const m2mSecondaryRelation: Relation = {
		collection: 'articles_tags',
		field: 'tags_id',
		related_collection: 'tags',
		schema: null,
		meta: {
			id: 3,
			many_collection: 'articles_tags',
			many_field: 'tags_id',
			one_collection: 'tags',
			one_field: null,
			one_collection_field: null,
			one_allowed_collections: null,
			junction_field: 'articles_id',
			sort_field: null,
			one_deselect_action: 'nullify',
		},
	};

	test('returns the many-side collection for o2m alias fields', () => {
		const result = getRelatedCollectionForField('users', 'posts', {
			getField: () => ({ type: 'alias' }) as Field,
			getRelationsForField: () => [o2mRelation],
		});

		expect(result).toBe('posts');
	});

	test('returns the junction collection for m2m alias fields', () => {
		const result = getRelatedCollectionForField('articles', 'tags', {
			getField: () => ({ type: 'alias' }) as Field,
			getRelationsForField: (collection, field) => {
				if (collection === 'articles' && field === 'tags') return [m2mPrimaryRelation];
				if (collection === 'articles_tags' && field === 'tags_id') return [m2mSecondaryRelation];
				return [];
			},
		});

		expect(result).toBe('articles_tags');
	});

	test('returns the collection suffix for m2a field paths', () => {
		const result = getRelatedCollectionForField('pages', 'item:articles', {
			getField: () => null,
			getRelationsForField: () => [],
		});

		expect(result).toBe('articles');
	});

	test('returns null when the field is missing or not an alias', () => {
		expect(
			getRelatedCollectionForField('users', 'posts', {
				getField: () => null,
				getRelationsForField: () => [o2mRelation],
			}),
		).toBeNull();

		expect(
			getRelatedCollectionForField('users', 'posts', {
				getField: () => ({ type: 'string' }) as Field,
				getRelationsForField: () => [o2mRelation],
			}),
		).toBeNull();
	});

	test('returns null when collection is not provided', () => {
		expect(
			getRelatedCollectionForField(null, 'posts', {
				getField: () => ({ type: 'alias' }) as Field,
				getRelationsForField: () => [o2mRelation],
			}),
		).toBeNull();
	});

	const m2oRelation: Relation = {
		collection: 'orders',
		field: 'customer',
		related_collection: 'customers',
		schema: null,
		meta: {
			id: 4,
			many_collection: 'orders',
			many_field: 'customer',
			one_collection: 'customers',
			one_field: null,
			one_collection_field: null,
			one_allowed_collections: null,
			junction_field: null,
			sort_field: null,
			one_deselect_action: 'nullify',
		},
	};

	const nestedO2mRelation: Relation = {
		collection: 'posts',
		field: 'customer_id',
		related_collection: 'customers',
		schema: null,
		meta: {
			id: 5,
			many_collection: 'posts',
			many_field: 'customer_id',
			one_collection: 'customers',
			one_field: 'orders',
			one_collection_field: null,
			one_allowed_collections: null,
			junction_field: null,
			sort_field: null,
			one_deselect_action: 'nullify',
		},
	};

	test('returns the many-side collection for nested o2m alias fields', () => {
		const result = getRelatedCollectionForField('orders', 'customer.orders', {
			getField: (collection, field) => {
				if (collection === 'customers' && field === 'orders') return { type: 'alias' } as Field;
				return null;
			},
			getRelationsForField: (collection, field) => {
				if (collection === 'orders' && field === 'customer') return [m2oRelation];
				if (collection === 'customers' && field === 'orders') return [nestedO2mRelation];
				return [];
			},
		});

		expect(result).toBe('posts');
	});

	test('returns the collection suffix for nested m2a field paths', () => {
		const blockM2oRelation: Relation = {
			collection: 'pages',
			field: 'block',
			related_collection: 'blocks',
			schema: null,
			meta: {
				id: 6,
				many_collection: 'pages',
				many_field: 'block',
				one_collection: 'blocks',
				one_field: null,
				one_collection_field: null,
				one_allowed_collections: null,
				junction_field: null,
				sort_field: null,
				one_deselect_action: 'nullify',
			},
		};

		const result = getRelatedCollectionForField('pages', 'block.item:articles', {
			getField: () => null,
			getRelationsForField: (collection, field) => {
				if (collection === 'pages' && field === 'block') return [blockM2oRelation];
				return [];
			},
		});

		expect(result).toBe('articles');
	});

	test('returns null for nested paths where the leaf field is not an alias', () => {
		const result = getRelatedCollectionForField('orders', 'customer.name', {
			getField: (collection, field) => {
				if (collection === 'customers' && field === 'name') return { type: 'string' } as Field;
				return null;
			},
			getRelationsForField: (collection, field) => {
				if (collection === 'orders' && field === 'customer') return [m2oRelation];
				return [];
			},
		});

		expect(result).toBeNull();
	});

	test('returns the junction collection for nested m2m alias fields', () => {
		const personM2oRelation: Relation = {
			collection: 'registrations',
			field: 'person',
			related_collection: 'persons',
			schema: null,
			meta: {
				id: 7,
				many_collection: 'registrations',
				many_field: 'person',
				one_collection: 'persons',
				one_field: null,
				one_collection_field: null,
				one_allowed_collections: null,
				junction_field: null,
				sort_field: null,
				one_deselect_action: 'nullify',
			},
		};

		const membershipsM2mRelation: Relation = {
			collection: 'memberships',
			field: 'person_id',
			related_collection: 'persons',
			schema: null,
			meta: {
				id: 8,
				many_collection: 'memberships',
				many_field: 'person_id',
				one_collection: 'persons',
				one_field: 'memberships',
				one_collection_field: null,
				one_allowed_collections: null,
				junction_field: 'organization_id',
				sort_field: null,
				one_deselect_action: 'nullify',
			},
		};

		const result = getRelatedCollectionForField('registrations', 'person.memberships', {
			getField: (collection, field) => {
				if (collection === 'persons' && field === 'memberships') return { type: 'alias' } as Field;
				return null;
			},
			getRelationsForField: (collection, field) => {
				if (collection === 'registrations' && field === 'person') return [personM2oRelation];
				if (collection === 'persons' && field === 'memberships') return [membershipsM2mRelation];
				return [];
			},
		});

		expect(result).toBe('memberships');
	});
});

describe('getNoneFilter', () => {
	test('reads _none filter from nested relationship paths', () => {
		const node = {
			person: {
				organizations: {
					_none: {
						id: { _eq: 'draft' },
					},
				},
			},
		};

		expect(getNoneFilter(node, 'person.organizations')).toEqual({
			id: { _eq: 'draft' },
		});
	});

	test('reads _none filter from m2a relationship keys', () => {
		const node = {
			'item:articles': {
				_none: {
					status: { _eq: 'draft' },
				},
			},
		};

		expect(getNoneFilter(node, 'item:articles')).toEqual({
			status: { _eq: 'draft' },
		});
	});

	test('returns empty object when the relationship key is missing', () => {
		expect(getNoneFilter({}, 'person.organizations')).toEqual({});
	});
});

describe('buildNoneFilterNode', () => {
	test('builds nested structure for dotted relationship paths', () => {
		expect(buildNoneFilterNode('person.organizations', { id: { _eq: 1 } })).toEqual({
			person: {
				organizations: {
					_none: {
						id: { _eq: 1 },
					},
				},
			},
		});
	});

	test('builds flat structure for m2a relationship keys', () => {
		expect(buildNoneFilterNode('item:articles', {})).toEqual({
			'item:articles': {
				_none: {},
			},
		});
	});
});
