import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

const signin = () => {
  return (
    <View>
      <Text>sign-in</Text>
      <Link href="/(auth)/sign-in">Create Account</Link>
      <Link href="/">Go Back</Link>
    </View>
  )
}

export default signin