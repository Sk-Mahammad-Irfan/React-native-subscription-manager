import { Link } from 'expo-router'
import React from 'react'
import { Text, View } from 'react-native'

const signup = () => {
    return (
        <View>
            <Text>sign-in</Text>
            <Link href="/(auth)/sign-up">Sign In</Link>
        </View>
    )
}

export default signup