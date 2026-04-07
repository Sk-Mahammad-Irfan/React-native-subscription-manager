import ListHeading from '@/components/ListHeading';
import SubscriptionCard from '@/components/SubscriptionCard';
import { useSubscriptionStore } from '@/lib/subscriptionStore';
import { styled } from 'nativewind';
import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView)

const Subscriptions = () => {
    const subscriptions = useSubscriptionStore((state) => state.subscriptions);
    const [searchText, setSearchText] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filter subscriptions based on search text
    const filteredSubscriptions = useMemo(() => {
        if (!searchText.trim()) return subscriptions;
        
        const query = searchText.toLowerCase().trim();
        return subscriptions.filter(sub => 
            sub.name.toLowerCase().includes(query) ||
            sub.category?.toLowerCase().includes(query) ||
            sub.plan?.toLowerCase().includes(query)
        );
    }, [searchText, subscriptions]);

    const handleCardPress = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderSubscriptionCard = ({ item }: { item: Subscription }) => (
        <View className="mb-3">
            <SubscriptionCard
                {...item}
                expanded={expandedId === item.id}
                onPress={() => handleCardPress(item.id)}
            />
        </View>
    );

    const renderEmptyState = () => (
        <View className="flex-1 items-center justify-center py-8">
            <Text className="text-center text-lg font-sans-semibold text-muted-foreground">
                {searchText.trim() ? 'No subscriptions found' : 'No subscriptions yet'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <FlatList
                data={filteredSubscriptions}
                keyExtractor={(item) => item.id}
                renderItem={renderSubscriptionCard}
                ListHeaderComponent={
                    <View className="px-5 py-3">
                        <ListHeading title="Subscriptions" />
                        <TextInput
                            className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-base font-sans-semibold text-primary placeholder-muted-foreground"
                            placeholder="Search subscriptions..."
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholderTextColor="#6b6b7f"
                        />
                    </View>
                }
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                scrollEnabled={true}
            />
        </SafeAreaView>
    )
}

export default Subscriptions