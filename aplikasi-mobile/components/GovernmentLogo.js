import { Image, StyleSheet, View } from 'react-native';

export const GovernmentLogo = ({ size = 64 }) => {
  return (
    <View style={[styles.logoContainer, { width: size, height: size }]}>
      <Image 
        source={require('../assets/images/icon.png')}
        style={[styles.logoImage, { width: size * 0.9, height: size * 0.9 }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoImage: {
    borderRadius: 12,
  },
});