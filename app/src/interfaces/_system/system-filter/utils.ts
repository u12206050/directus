import type { ClientFilterOperator, Field, FieldFilter, FieldFilterOperator, Filter, Relation } from '@directus/types';
import { getRelationType, toArray } from '@directus/utils';
import { get, isPlainObject, set } from 'lodash';

export type RelatedCollectionResolverDeps = {
	getField: (collection: string, field: string) => Field | null;
	getRelationsForField: (collection: string, field: string) => Relation[];
};

export const JSON_VALUE_KEY = '$jsonValue';

export const JSON_FILTER_OPERATORS: ClientFilterOperator[] = [
	'eq',
	'neq',
	'lt',
	'lte',
	'gt',
	'gte',
	'in',
	'nin',
	'null',
	'nnull',
	'contains',
	'ncontains',
	'icontains',
	'starts_with',
	'nstarts_with',
	'istarts_with',
	'nistarts_with',
	'ends_with',
	'nends_with',
	'iends_with',
	'niends_with',
	'between',
	'nbetween',
	'empty',
	'nempty',
];

export function getNodeName(node: Filter): string {
	if (!node) return '';
	return Object.keys(node)[0] ?? '';
}

export function getField(node: Record<string, any>): string {
	const name = getNodeName(node);
	if (name.startsWith('_')) return '';
	if (!isPlainObject(node[name])) return '';

	const subFields = getField(node[name]);
	return subFields !== '' ? `${name}.${subFields}` : name;
}

export function fieldHasFunction(field: string) {
	return field.includes('(') && field.includes(')');
}

export function getComparator(node: Record<string, any>): string {
	const field = getField(node);
	if (!field) return '';
	const fieldNode = get(node, field);
	if (!fieldNode) return '';
	return getNodeName(fieldNode);
}

const arrayComparators = ['_in', '_nin'];
const rangeComparators = ['_between', '_nbetween'];
const booleanComparators = ['_null', '_nnull', '_empty', '_nempty'];
const geometryComparators = ['_intersects', '_nintersects', '_intersects_bbox', '_nintersects_bbox'];

export function initialValueForComparator(comparator: string, value: unknown, previousComparator?: string): unknown {
	if (arrayComparators.includes(comparator)) {
		return toArray(value);
	}

	if (rangeComparators.includes(comparator)) {
		return toArray(value).slice(0, 2);
	}

	if (booleanComparators.includes(comparator)) {
		return true;
	}

	if (geometryComparators.includes(comparator)) {
		return previousComparator && geometryComparators.includes(previousComparator) ? value : null;
	}

	if (previousComparator && booleanComparators.includes(previousComparator)) {
		return null;
	}

	return Array.isArray(value) ? value[0] : value;
}

export function fieldToFilter(field: string, operator: string, value: any): Record<string, any> {
	return fieldToFilterR(field.split('.'));

	function fieldToFilterR(sections: string[]): Record<string, any> {
		const section = sections.shift();

		if (section !== undefined) {
			return {
				[section]: fieldToFilterR(sections),
			};
		} else {
			return {
				[operator]: value,
			};
		}
	}
}

export type JsonFilterParts = {
	field: string;
	path: string;
	operator: keyof FieldFilterOperator;
	value: unknown;
};

export function buildJsonFilter(
	field: string,
	path: string,
	operator: keyof FieldFilterOperator,
	value: unknown,
): FieldFilter {
	const jsonFilter = path ? { [path]: { [operator]: value } } : {};
	return fieldToFilter(field, '_json', jsonFilter) as FieldFilter;
}

export function getJsonFilterParts(node: Filter): JsonFilterParts {
	const field = getField(node as Record<string, any>);
	const jsonFilter = (get(node, `${field}._json`) ?? {}) as Record<string, FieldFilterOperator>;
	const [path = '', innerFilter = { _eq: null }] = Object.entries(jsonFilter)[0] ?? [];
	const [operator = '_eq', value = null] = Object.entries(innerFilter)[0] ?? [];

	return {
		field,
		path,
		operator: operator as keyof FieldFilterOperator,
		value,
	};
}

export function isJsonFilter(node: Filter): boolean {
	if (getComparator(node as Record<string, any>) !== '_json') {
		return false;
	}

	const field = getField(node as Record<string, any>);
	const paths = Object.keys((get(node, `${field}._json`) ?? {}) as Record<string, unknown>);

	return paths.length === 0 || (paths.length === 1 && !['_and', '_or'].includes(paths[0]!));
}

const stringComparators: (keyof FieldFilterOperator)[] = [
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
];

export function coerceJsonFilterValue(value: unknown, operator: keyof FieldFilterOperator): unknown {
	if (stringComparators.includes(operator)) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((entry) => coerceJsonFilterValue(entry, operator));
	}

	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/**
 * Strip relationship field prefix from filter field paths
 * Used when displaying filters within a _none group to show cleaner field names
 */
export function stripRelationshipPrefix(filters: Filter[], relationshipField: string): Filter[] {
	return filters.map((filter) => {
		const result: Record<string, any> = {};

		for (const [key, value] of Object.entries(filter)) {
			if (key === '_and' || key === '_or') {
				result[key] = stripRelationshipPrefix(value as Filter[], relationshipField);
			} else if (key.startsWith(relationshipField + '.')) {
				const newKey = key.slice(relationshipField.length + 1);
				result[newKey] = value;
			} else {
				result[key] = value;
			}
		}

		return result as Filter;
	});
}

/**
 * Add relationship field prefix to filter field paths
 * Used when saving filters within a _none group to ensure correct path structure
 */
export function addRelationshipPrefix(filters: Filter[], relationshipField: string): Filter[] {
	return filters.map((filter) => {
		const result: Record<string, any> = {};

		for (const [key, value] of Object.entries(filter)) {
			if (key === '_and' || key === '_or') {
				result[key] = addRelationshipPrefix(value as Filter[], relationshipField);
			} else if (!key.startsWith(relationshipField + '.')) {
				const newKey = `${relationshipField}.${key}`;
				result[newKey] = value;
			} else {
				result[key] = value;
			}
		}

		return result as Filter;
	});
}

function findRelationForField(relations: Relation[], field: string): Relation | undefined {
	return relations.find((relation) => relation.field === field || relation.meta?.one_field === field);
}

function getNextCollectionForSegment(
	currentCollection: string,
	segment: string,
	deps: RelatedCollectionResolverDeps,
): string | null {
	if (segment.includes(':')) {
		const [, relatedCollection] = segment.split(':', 2);
		return relatedCollection || null;
	}

	const relations = deps.getRelationsForField(currentCollection, segment);
	const relation = findRelationForField(relations, segment);
	if (!relation) return null;

	const nextCollection = relation.field === segment ? relation.related_collection : relation.collection;
	return nextCollection || null;
}

/**
 * Walks a dot-separated field path and returns the collection at the end of the prefix.
 */
export function getCollectionAtFieldPath(
	collection: string,
	fieldPath: string,
	deps: RelatedCollectionResolverDeps,
): string | null {
	if (!fieldPath) return collection;

	let currentCollection = collection;

	for (const segment of fieldPath.split('.')) {
		const nextCollection = getNextCollectionForSegment(currentCollection, segment, deps);
		if (!nextCollection) return null;
		currentCollection = nextCollection;
	}

	return currentCollection;
}

function getRelatedCollectionFromRelation(
	collection: string,
	field: string,
	deps: RelatedCollectionResolverDeps,
): string | null {
	const fieldInfo = deps.getField(collection, field);
	if (!fieldInfo || fieldInfo.type !== 'alias') return null;

	const relations = deps.getRelationsForField(collection, field);
	const relation = findRelationForField(relations, field);
	if (!relation) return null;

	const relationType = getRelationType({
		relation,
		collection,
		field,
	});

	// o2m and m2m: _none/_some conditions apply on the many/junction side
	if (relationType === 'o2m') {
		return relation.meta?.many_collection ?? relation.collection;
	}

	return null;
}

/**
 * Builds a nested filter node for a `_none` group on a relational field path.
 */
export function buildNoneFilterNode(relationshipField: string, noneFilter: Filter = {}): Filter {
	return set({}, relationshipField, { _none: noneFilter }) as Filter;
}

/**
 * Reads the `_none` sub-filter for a relationship field path (nested or m2a flat keys).
 */
export function getNoneFilter(node: Record<string, unknown>, fieldKey: string): Filter {
	const noneFilter = get(node, `${fieldKey}._none`);

	return noneFilter && typeof noneFilter === 'object' && !Array.isArray(noneFilter) ? (noneFilter as Filter) : {};
}

/**
 * Resolves the target collection for nested filters within a `_none` group on a relational alias field.
 */
export function getRelatedCollectionForField(
	collection: string | null | undefined,
	fieldPath: string,
	deps: RelatedCollectionResolverDeps,
): string | null {
	if (!collection) return null;

	const parts = fieldPath.split('.');
	const lastSegment = parts.at(-1)!;

	// m2a target collection is encoded in the last segment (e.g. `item:articles`)
	if (lastSegment.includes(':')) {
		const [, relatedCollection] = lastSegment.split(':', 2);
		if (!relatedCollection) return null;
		if (parts.length === 1) return relatedCollection;

		const parentPath = parts.slice(0, -1).join('.');
		const parentCollection = getCollectionAtFieldPath(collection, parentPath, deps);
		return parentCollection ? relatedCollection : null;
	}

	if (parts.length === 1) {
		return getRelatedCollectionFromRelation(collection, fieldPath, deps);
	}

	const parentPath = parts.slice(0, -1).join('.');
	const parentCollection = getCollectionAtFieldPath(collection, parentPath, deps);
	if (!parentCollection) return null;

	return getRelatedCollectionFromRelation(parentCollection, lastSegment, deps);
}
