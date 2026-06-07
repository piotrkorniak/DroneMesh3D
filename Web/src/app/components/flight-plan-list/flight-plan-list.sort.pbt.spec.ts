import * as fc from 'fast-check';
import { sortByCreatedAtDesc } from '../../utils/sort-by-date';

// Feature: ux-area-management-redesign, Property 6: Flight plans sorted descending by createdAt

/**
 * **Validates: Requirements 5.6**
 *
 * Property 6: Flight plans sorted descending by createdAt
 * For any list of flight plans returned for a selected area, for every consecutive pair
 * (plan[i], plan[i+1]), plan[i].createdAt >= plan[i+1].createdAt.
 */
describe('Feature: ux-area-management-redesign, Property 6: Flight plans sorted descending by createdAt', () => {

  it('should satisfy plan[i].createdAt >= plan[i+1].createdAt for all consecutive pairs after sort', () => {
    const planArbitrary = fc.record({
      id: fc.uuid(),
      createdAt: fc.integer({ min: new Date('2020-01-01T00:00:00.000Z').getTime(), max: new Date('2030-12-31T23:59:59.999Z').getTime() })
        .map(ts => new Date(ts).toISOString()),
    });

    const property = fc.property(
      fc.array(planArbitrary, { minLength: 0, maxLength: 50 }),
      (plans) => {
        const sorted = sortByCreatedAtDesc(plans);

        for (let i = 0; i < sorted.length - 1; i++) {
          const dateA = new Date(sorted[i].createdAt).getTime();
          const dateB = new Date(sorted[i + 1].createdAt).getTime();
          if (dateA < dateB) {
            return false;
          }
        }
        return true;
      }
    );

    expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
  });

  it('should handle plans with identical createdAt dates without violating sort order', () => {
    const property = fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          createdAt: fc.constantFrom(
            '2024-01-15T10:00:00.000Z',
            '2024-03-20T14:30:00.000Z',
            '2024-06-01T08:00:00.000Z'
          ),
        }),
        { minLength: 2, maxLength: 30 }
      ),
      (plans) => {
        const sorted = sortByCreatedAtDesc(plans);

        for (let i = 0; i < sorted.length - 1; i++) {
          const dateA = new Date(sorted[i].createdAt).getTime();
          const dateB = new Date(sorted[i + 1].createdAt).getTime();
          if (dateA < dateB) {
            return false;
          }
        }
        return true;
      }
    );

    expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
  });

  it('should preserve all elements after sorting (no items lost or added)', () => {
    const planArbitrary = fc.record({
      id: fc.uuid(),
      createdAt: fc.integer({ min: new Date('2020-01-01T00:00:00.000Z').getTime(), max: new Date('2030-12-31T23:59:59.999Z').getTime() })
        .map(ts => new Date(ts).toISOString()),
    });

    const property = fc.property(
      fc.array(planArbitrary, { minLength: 0, maxLength: 50 }),
      (plans) => {
        const sorted = sortByCreatedAtDesc(plans);

        if (sorted.length !== plans.length) {
          return false;
        }

        // Every original plan must appear in sorted output
        const sortedIds = new Set(sorted.map(p => p.id));
        return plans.every(p => sortedIds.has(p.id));
      }
    );

    expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
  });
});
