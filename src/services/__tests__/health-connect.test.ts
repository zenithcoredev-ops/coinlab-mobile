import { aggregateRecord, getGrantedPermissions, initialize, requestPermission } from 'react-native-health-connect';

// Jest resolves the iOS stub for '../health-connect'; load the Android implementation by its file name.
const { hasBackgroundStepsAccess, readTodaySteps, requestStepsPermission } = require('../health-connect.ts') as typeof import('../health-connect');

jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  aggregateRecord: jest.fn().mockResolvedValue({ COUNT_TOTAL: 6240 }),
  getGrantedPermissions: jest.fn(),
  requestPermission: jest.fn(),
  getSdkStatus: jest.fn(),
  readRecords: jest.fn(),
  SdkAvailabilityStatus: {},
}));

const STEPS = { accessType: 'read', recordType: 'Steps' };
const BACKGROUND = { accessType: 'read', recordType: 'BackgroundAccessPermission' };

describe('health connect', () => {
  it('reads every step since local midnight', async () => {
    const now = new Date(2026, 9, 30, 14, 30);
    expect(await readTodaySteps(now)).toBe(6240);
    expect(initialize).toHaveBeenCalled();
    expect(aggregateRecord).toHaveBeenCalledWith({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: new Date(2026, 9, 30).toISOString(), endTime: now.toISOString() },
    });
  });

  it('asks for background reading together with steps; steps alone is enough to connect', async () => {
    (requestPermission as jest.Mock).mockResolvedValue([STEPS]);
    expect(await requestStepsPermission()).toBe(true);
    expect(requestPermission).toHaveBeenCalledWith([STEPS, BACKGROUND]);
  });

  it('tells whether background reading was granted', async () => {
    (getGrantedPermissions as jest.Mock).mockResolvedValue([STEPS]);
    expect(await hasBackgroundStepsAccess()).toBe(false);
    (getGrantedPermissions as jest.Mock).mockResolvedValue([STEPS, BACKGROUND]);
    expect(await hasBackgroundStepsAccess()).toBe(true);
  });
});
