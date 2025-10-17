import { StyleSheet, Text, View } from 'react-native';

export const GovernmentLogo = () => {
  return (
    <View style={styles.logoContainer}>
      <Text style={styles.logoText}>DKP3</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    // Ukuran diperkecil dari 80 menjadi 48
    width: 48,
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 8, // Sudut juga disesuaikan
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  logoText: {
    color: 'white',
    // Ukuran font juga diperkecil
    fontSize: 16,
    fontWeight: 'bold',
  },
});