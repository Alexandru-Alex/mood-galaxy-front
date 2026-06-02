import { fetchMonthSummary, fetchEntriesByMonth } from '@/lib/entries';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));
const mockGet = api.get as jest.MockedFunction<typeof api.get>;

describe('fetchMonthSummary', () => {
  it('returns the array from GET /entries/months', async () => {
    const payload = [{ month: '2024-01', constellationIds: ['c0'] }];
    mockGet.mockResolvedValueOnce(payload);
    const result = await fetchMonthSummary();
    expect(mockGet).toHaveBeenCalledWith('/entries/months');
    expect(result).toEqual(payload);
  });

  it('returns empty array on unexpected shape', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await fetchMonthSummary();
    expect(result).toEqual([]);
  });
});

describe('fetchEntriesByMonth', () => {
  it('converts BackendEntry[] to Entry[]', async () => {
    mockGet.mockResolvedValueOnce([
      { entryDate: '2024-01-03', mood: 'HAPPY', entryIndex: 1 },
      { entryDate: '2024-01-15', mood: 'SAD', entryIndex: 2 },
    ]);
    const result = await fetchEntriesByMonth('2024-01');
    expect(mockGet).toHaveBeenCalledWith('/entries/by-month/2024-01');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ entryIndex: 1, date: '2024-01-03', mood: 'HAPPY' });
  });

  it('returns empty array on unexpected shape', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await fetchEntriesByMonth('2024-01');
    expect(result).toEqual([]);
  });
});
