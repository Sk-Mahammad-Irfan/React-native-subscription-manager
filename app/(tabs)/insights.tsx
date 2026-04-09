import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { styled } from 'nativewind';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView)

const Insights = () => {
    const subscriptions = useSubscriptionStore((state) => state.subscriptions);

    const stats = useMemo(() => {
        const totalCount = subscriptions.length;
        const monthlyTotal = subscriptions
            .filter((sub) => sub.frequency === "monthly")
            .reduce((sum, sub) => sum + sub.price, 0);
        const yearlyTotal = subscriptions
            .filter((sub) => sub.frequency === "yearly")
            .reduce((sum, sub) => sum + sub.price, 0);

        const monthlyEquivalentFromYearly = yearlyTotal / 12;
        const estimatedMonthlySpend = monthlyTotal + monthlyEquivalentFromYearly;
        const estimatedYearlySpend = monthlyTotal * 12 + yearlyTotal;

        const categoryTotals = subscriptions.reduce<Record<string, number>>((acc, sub) => {
            const key = sub.category?.trim() || "Uncategorized";
            acc[key] = (acc[key] || 0) + sub.price;
            return acc;
        }, {});

        const topCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const nearestRenewal = subscriptions
            .filter((sub) => sub.renewalDate)
            .sort((a, b) => dayjs(a.renewalDate).valueOf() - dayjs(b.renewalDate).valueOf())[0];

        return {
            totalCount,
            monthlyTotal,
            yearlyTotal,
            estimatedMonthlySpend,
            estimatedYearlySpend,
            topCategories,
            nearestRenewal,
        };
    }, [subscriptions]);

    return (
        <SafeAreaView className="flex-1 bg-background p-5" >
            <ScrollView showsVerticalScrollIndicator={ false }>
                <Text className="text-3xl font-sans-bold text-primary mb-6">Insights</Text>

                <View className="auth-card mb-4">
                    <Text className="text-sm font-sans-medium text-muted-foreground">Total subscriptions</Text>
                    <Text className="text-2xl font-sans-bold text-primary mt-1">{ stats.totalCount }</Text>
                </View>

                <View className="auth-card mb-4">
                    <Text className="text-sm font-sans-medium text-muted-foreground">Estimated monthly spend</Text>
                    <Text className="text-2xl font-sans-bold text-primary mt-1">
                        { formatCurrency(stats.estimatedMonthlySpend, "INR") }
                    </Text>
                    <Text className="text-xs font-sans-medium text-muted-foreground mt-1">
                        Monthly plans + yearly plans converted to monthly equivalent
                    </Text>
                </View>

                <View className="auth-card mb-4">
                    <Text className="text-sm font-sans-medium text-muted-foreground">Estimated yearly spend</Text>
                    <Text className="text-2xl font-sans-bold text-primary mt-1">
                        { formatCurrency(stats.estimatedYearlySpend, "INR") }
                    </Text>
                </View>

                <View className="auth-card mb-4">
                    <Text className="text-base font-sans-semibold text-primary mb-2">Plan breakdown</Text>
                    <Text className="text-sm font-sans-medium text-muted-foreground">
                        Monthly plans total: { formatCurrency(stats.monthlyTotal, "INR") }
                    </Text>
                    <Text className="text-sm font-sans-medium text-muted-foreground mt-1">
                        Yearly plans total: { formatCurrency(stats.yearlyTotal, "INR") }
                    </Text>
                </View>

                <View className="auth-card mb-4">
                    <Text className="text-base font-sans-semibold text-primary mb-2">Top categories</Text>
                    { stats.topCategories.length === 0 ? (
                        <Text className="text-sm font-sans-medium text-muted-foreground">No category data yet.</Text>
                    ) : (
                        stats.topCategories.map(([category, total]) => (
                            <View key={ category } className="flex-row items-center justify-between py-1">
                                <Text className="text-sm font-sans-medium text-primary">{ category }</Text>
                                <Text className="text-sm font-sans-semibold text-primary">
                                    { formatCurrency(total, "INR") }
                                </Text>
                            </View>
                        ))
                    ) }
                </View>

                <View className="auth-card mb-10">
                    <Text className="text-base font-sans-semibold text-primary mb-2">Next renewal</Text>
                    { stats.nearestRenewal ? (
                        <>
                            <Text className="text-sm font-sans-medium text-primary">{ stats.nearestRenewal.name }</Text>
                            <Text className="text-sm font-sans-medium text-muted-foreground mt-1">
                                { dayjs(stats.nearestRenewal.renewalDate).format("DD MMM YYYY") }
                            </Text>
                        </>
                    ) : (
                        <Text className="text-sm font-sans-medium text-muted-foreground">No renewal dates available.</Text>
                    ) }
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Insights