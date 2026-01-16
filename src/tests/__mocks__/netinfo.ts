// Mock for @react-native-community/netinfo
export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

export default {
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: NetInfoStateType.wifi,
    details: null,
  })),
  addEventListener: jest.fn(() => () => {}),
};
