# Screen Conversion Plan

## Main Screens

### 1. Home Screen (Timeline)
**Web**: `src/components/dashboard-with-events-clean.tsx`
**Complexity**: High
**Key Features**:
- Stock list with drag-to-reorder
- Event timeline with catalyst dots
- Portfolio chart
- Real-time price updates
- Scroll position restoration

**Conversion Steps**:
1. Replace ScrollView with FlatList for performance
2. Convert drag-drop to react-native-draggable-flatlist
3. Port chart components to Victory Native
4. Use AsyncStorage for scroll position
5. Implement pull-to-refresh

**Native Implementation**:
```typescript
import { FlatList, RefreshControl } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';

export const HomeScreen = ({ selectedTickers }) => {
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  return (
    <DraggableFlatList
      data={selectedTickers}
      renderItem={({ item, drag }) => (
        <StockListItem ticker={item} onLongPress={drag} />
      )}
      keyExtractor={(item) => item}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
};
```

### 2. Copilot Screen (AI Chat)
**Web**: `src/components/catalyst-copilot-screen.tsx`
**Complexity**: High
**Key Features**:
- Streaming chat interface
- Markdown rendering
- Stock cards and data cards
- Citation badges
- Thinking animation

**Conversion Steps**:
1. Use FlatList with inverted for chat messages
2. Port markdown renderer to react-native-markdown-display
3. Convert SSE streaming to native WebSocket/fetch
4. Implement keyboard-avoiding view
5. Add haptic feedback

**Native Implementation**:
```typescript
import { KeyboardAvoidingView, FlatList, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';

export const CopilotScreen = () => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <FlatList
        inverted
        data={messages}
        renderItem={({ item }) => (
          <View className="p-4">
            <Markdown>{item.content}</Markdown>
          </View>
        )}
      />
      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
};
```

### 3. Discover Screen (Search)
**Web**: `src/components/discovery-screen.tsx`
**Complexity**: Medium
**Key Features**:
- Search with autocomplete
- Trending catalysts
- Sector trends
- Event cards

**Conversion Steps**:
1. Use TextInput with debounced search
2. Convert to FlatList for performance
3. Port event cards to native components
4. Add search history with AsyncStorage

**Native Implementation**:
```typescript
import { TextInput, FlatList } from 'react-native';

export const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleSearch = useMemo(
    () => debounce(async (query) => {
      const data = await DataService.searchStocks(query);
      setResults(data);
    }, 300),
    []
  );
  
  return (
    <View className="flex-1">
      <TextInput
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          handleSearch(text);
        }}
        placeholder="Search stocks..."
        className="h-10 px-4 border-b"
      />
      <FlatList
        data={results}
        renderItem={({ item }) => <StockCard stock={item} />}
        keyExtractor={(item) => item.symbol}
      />
    </View>
  );
};
```

### 4. Profile Screen
**Web**: `src/components/profile-screen.tsx`
**Complexity**: Low
**Key Features**:
- User settings
- Theme toggle
- Account management

**Conversion Steps**:
1. Convert to ScrollView
2. Use Switch for toggles
3. Port settings to AsyncStorage

**Native Implementation**:
```typescript
import { ScrollView, Switch } from 'react-native';

export const ProfileScreen = () => {
  const { darkMode, setDarkMode } = useDarkMode();
  
  return (
    <ScrollView className="flex-1 p-4">
      <View className="flex-row justify-between items-center py-4">
        <Text>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>
    </ScrollView>
  );
};
```

## Sub-Screens

### 5. Stock Info Screen
**Web**: `src/components/stock-info-screen.tsx`
**Complexity**: High
**Key Features**:
- Stock chart with multiple timeframes
- Company info
- Events timeline
- Financials section
- Executives and ownership

**Conversion Steps**:
1. Use ScrollView with nested tabs
2. Port chart to Victory Native
3. Convert tabs to react-native-tab-view
4. Add share functionality

**Native Implementation**:
```typescript
import { ScrollView } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';

export const StockInfoScreen = ({ ticker }) => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'overview', title: 'Overview' },
    { key: 'events', title: 'Events' },
    { key: 'financials', title: 'Financials' },
  ]);
  
  return (
    <ScrollView>
      <StockChart ticker={ticker} />
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={(props) => <TabBar {...props} />}
      />
    </ScrollView>
  );
};
```

### 6. Portfolio Screen
**Web**: `src/components/portfolio-screen.tsx`
**Complexity**: High
**Key Features**:
- Portfolio chart
- Position list
- Connected accounts
- Plaid integration
- Manual position entry

**Conversion Steps**:
1. Port Plaid to react-native-plaid-link-sdk
2. Convert to FlatList for positions
3. Add biometric authentication
4. Port chart to Victory Native

**Native Implementation**:
```typescript
import PlaidLink from 'react-native-plaid-link-sdk';
import { FlatList } from 'react-native';

export const PortfolioScreen = () => {
  const handlePlaidSuccess = (token) => {
    // Exchange token and fetch holdings
  };
  
  return (
    <View className="flex-1">
      <PortfolioChart />
      <FlatList
        data={positions}
        renderItem={({ item }) => <PositionCard position={item} />}
      />
      <PlaidLink
        token={linkToken}
        onSuccess={handlePlaidSuccess}
      />
    </View>
  );
};
```

### 7. Event Analysis Screen
**Web**: `src/components/event-analysis.tsx`
**Complexity**: Medium
**Key Features**:
- Event details
- Impact analysis
- Related stocks
- Historical context

**Conversion Steps**:
1. Convert to ScrollView
2. Port markdown to react-native-markdown-display
3. Add share functionality

### 8. Onboarding Screen
**Web**: `src/components/onboarding-screen-fixed.tsx`
**Complexity**: Medium
**Key Features**:
- Multi-step wizard
- Stock selection
- Portfolio connection

**Conversion Steps**:
1. Use react-native-snap-carousel for steps
2. Port Plaid integration
3. Add skip functionality
