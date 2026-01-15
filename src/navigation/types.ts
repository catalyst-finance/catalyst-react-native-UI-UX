/**
 * Navigation Type Definitions
 * 
 * Defines the parameter lists for all navigators in the app.
 */

export type RootStackParamList = {
  MainTabs: undefined;
  StockDetail: {
    ticker: string;
  };
};

export type TabParamList = {
  Timeline: undefined;
  Copilot: undefined;
  Discover: undefined;
  Profile: undefined;
  Components: undefined;
  'Data Test': undefined;
  'Service Test': undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
