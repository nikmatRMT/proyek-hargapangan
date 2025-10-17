import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="login" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="dataEntry" 
        options={{ headerShown: false }}
      />
      
      {/* --- BARIS YANG HILANG ADA DI SINI --- */}
      <Stack.Screen 
        name="profile" 
        options={{ headerShown: false }}
      />

    </Stack>
  );
}