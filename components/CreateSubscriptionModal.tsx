import { icons } from "@/constants/icons";
import clsx from "clsx";
import dayjs from "dayjs";
import { styled } from "nativewind";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

const StyledScrollView = styled(ScrollView);

interface CreateSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (subscription: Subscription) => void;
}

const CATEGORIES = [
    "Entertainment",
    "AI Tools",
    "Developer Tools",
    "Design",
    "Productivity",
    "Cloud",
    "Music",
    "Other",
] as const;

const PAYMENT_METHODS = [
    "Credit Card",
    "Debit Card",
    "Paytm",
    "PhonePe",
    "RazorPay",
    "Google Pay",
    "Apple Pay",
    "Bank Transfer",
    "Other",
] as const;

const SUBSCRIPTION_ICON_MAP = {
    spotify: "spotify",
    notion: "notion",
    figma: "figma",
    adobe: "adobe",
    canva: "canva",
    github: "github",
    claude: "claude",
    openai: "openai",
    medium: "medium",
    dropbox: "dropbox",
    netflix: "netflix",
};

const CATEGORY_COLORS: Record<string, string> = {
    Entertainment: "#ff6b6b",
    "AI Tools": "#b8d4e3",
    "Developer Tools": "#e8def8",
    Design: "#f5c542",
    Productivity: "#a8d5ba",
    Cloud: "#ffc75f",
    Music: "#ff9a76",
    Other: "#d4a5a5",
};

// Wait this long after the user stops typing before hitting the CDN
const DEBOUNCE_DELAY = 4000;

const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
    visible,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

    // Icon states
    const [foundIconUrl, setFoundIconUrl] = useState<string | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);       // debounce countdown active
    const [isSearchingIcon, setIsSearchingIcon] = useState(false); // network fetch in progress
    const [iconResolved, setIconResolved] = useState(false);  // search finished (found or not)

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Ref to hold the debounce timer so we can cancel it on each new keystroke
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-detect icon from local map — instant, no network needed
    const suggestedIcon = useMemo(() => {
        const nameLower = name.toLowerCase();
        for (const [key, iconKey] of Object.entries(SUBSCRIPTION_ICON_MAP)) {
            if (nameLower.includes(key)) {
                return iconKey as keyof typeof icons;
            }
        }
        return null;
    }, [name]);

    // When the local map finds a match, resolve immediately — no CDN call needed
    useEffect(() => {
        if (suggestedIcon) {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            setIsWaiting(false);
            setIsSearchingIcon(false);
            setIconResolved(true);
        }
    }, [suggestedIcon]);

    // Schedule a debounced CDN icon search
    const scheduleCdnSearch = (subscriptionName: string) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!subscriptionName.trim()) {
            setIsWaiting(false);
            setIsSearchingIcon(false);
            setIconResolved(false);
            setFoundIconUrl(null);
            return;
        }

        // Show amber "waiting" state while the user is still typing
        setIsWaiting(true);
        setIconResolved(false);
        setFoundIconUrl(null);

        debounceTimer.current = setTimeout(async () => {
            setIsWaiting(false);
            setIsSearchingIcon(true);

            try {
                const iconName = subscriptionName.toLowerCase().replace(/\s+/g, "-");
                const url = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${iconName}.svg`;
                const response = await fetch(url, { method: "HEAD" });
                setFoundIconUrl(response.ok ? url : null);
            } catch {
                setFoundIconUrl(null);
            } finally {
                setIsSearchingIcon(false);
                // Search is done — unblock submit regardless of result
                setIconResolved(true);
            }
        }, DEBOUNCE_DELAY);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    // Resolved icon for display and submission
    const resolvedIcon = foundIconUrl
        ? { uri: foundIconUrl }
        : suggestedIcon
            ? icons[suggestedIcon]
            : null;

    // True while debounce is counting down OR network fetch is in flight
    const iconPending = isWaiting || isSearchingIcon;

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = "Subscription name is required";
        if (!price.trim()) {
            newErrors.price = "Price is required";
        } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            newErrors.price = "Price must be a positive number";
        }
        if (!selectedCategory) newErrors.category = "Please select a category";
        if (!paymentMethod) newErrors.paymentMethod = "Please select a payment method";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm() || !selectedCategory || !paymentMethod) return;

        const now = new Date().toISOString();
        const renewalDate =
            frequency === "monthly"
                ? dayjs().add(1, "month").toISOString()
                : dayjs().add(1, "year").toISOString();

        // Priority: web icon → local icon → wallet fallback
        const selectedIcon = foundIconUrl
            ? { uri: foundIconUrl }
            : suggestedIcon
                ? icons[suggestedIcon]
                : icons.wallet;

        const newSubscription: Subscription = {
            id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            name: name.trim(),
            icon: selectedIcon,
            price: parseFloat(price),
            currency: "INR",
            billing: frequency === "monthly" ? "Monthly" : "Yearly",
            frequency: frequency,
            category: selectedCategory,
            paymentMethod: paymentMethod,
            status: "active",
            startDate: now,
            renewalDate: renewalDate,
            color: CATEGORY_COLORS[selectedCategory] || "#5b5b5b",
        };

        onSubmit(newSubscription);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setName("");
        setPrice("");
        setFrequency("monthly");
        setSelectedCategory(null);
        setPaymentMethod(null);
        setFoundIconUrl(null);
        setIsWaiting(false);
        setIsSearchingIcon(false);
        setIconResolved(false);
        setErrors({});
    };

    // Submit is blocked until: form is filled AND icon is not pending AND search resolved
    const isFormValid =
        name.trim() &&
        price.trim() &&
        !isNaN(parseFloat(price)) &&
        parseFloat(price) > 0 &&
        selectedCategory &&
        paymentMethod &&
        !iconPending &&
        iconResolved;

    return (
        <Modal
            visible={ visible }
            onRequestClose={ onClose }
            animationType="slide"
            transparent
            statusBarTranslucent
        >
            <View className="modal-overlay">
                <KeyboardAvoidingView
                    behavior={ Platform.OS === "ios" ? "padding" : "height" }
                    className="flex-1"
                >
                    <View className="modal-container" style={ { paddingBottom: 20 } }>
                        {/* Header */ }
                        <View className="modal-header">
                            <Text className="modal-title">New Subscription</Text>
                            <Pressable onPress={ onClose } className="modal-close" hitSlop={ 8 }>
                                <Text className="modal-close-text">✕</Text>
                            </Pressable>
                        </View>

                        {/* Body */ }
                        <StyledScrollView
                            className="modal-body"
                            showsVerticalScrollIndicator={ false }
                            scrollEventThrottle={ 16 }
                        >
                            {/* Name Field */ }
                            <View className="auth-field">
                                <Text className="auth-label">Subscription Name</Text>

                                <View style={ { flexDirection: "row", alignItems: "center", gap: 10 } }>
                                    {/* Icon preview badge */ }
                                    { (resolvedIcon || iconPending) && (
                                        <View
                                            style={ {
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                backgroundColor: "#f3f4f6",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderWidth: 1,
                                                borderColor: "#e5e7eb",
                                            } }
                                        >
                                            { resolvedIcon && !iconPending ? (
                                                <Image
                                                    source={ resolvedIcon }
                                                    style={ { width: 28, height: 28 } }
                                                    resizeMode="contain"
                                                />
                                            ) : (
                                                <Text style={ { fontSize: 18 } }>⏳</Text>
                                            ) }
                                        </View>
                                    ) }

                                    <View style={ { flex: 1 } }>
                                        <TextInput
                                            placeholder="e.g., Netflix"
                                            placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                            value={ name }
                                            onChangeText={ (text) => {
                                                setName(text);
                                                if (errors.name) setErrors({ ...errors, name: "" });
                                                // Only hit CDN if local map didn't match
                                                if (!suggestedIcon) {
                                                    scheduleCdnSearch(text);
                                                }
                                            } }
                                            className={ clsx("auth-input", errors.name && "auth-input-error") }
                                        />
                                    </View>
                                </View>

                                {/* Status label — changes colour with state */ }
                                { name.trim() !== "" && (
                                    <Text
                                        style={ {
                                            fontSize: 11,
                                            marginTop: 4,
                                            color: isWaiting
                                                ? "#f59e0b"   // amber — debounce in progress
                                                : isSearchingIcon
                                                    ? "#9ca3af"   // grey — network fetch
                                                    : foundIconUrl
                                                        ? "#16a34a"   // green — web icon found
                                                        : suggestedIcon
                                                            ? "#6b7280"   // grey — local icon matched
                                                            : iconResolved
                                                                ? "#ef4444"   // red — nothing found
                                                                : "#9ca3af",
                                        } }
                                    >
                                        { isWaiting
                                            ? "⏸ Waiting for you to stop typing…"
                                            : isSearchingIcon
                                                ? "🔍 Searching for icon…"
                                                : foundIconUrl
                                                    ? "✓ Icon found from web"
                                                    : suggestedIcon
                                                        ? `✓ Using built-in icon for ${suggestedIcon}`
                                                        : iconResolved
                                                            ? "✕ No icon found — wallet icon will be used"
                                                            : "" }
                                    </Text>
                                ) }

                                { errors.name && (
                                    <Text className="auth-error">{ errors.name }</Text>
                                ) }
                            </View>

                            {/* Price Field */ }
                            <View className="auth-field">
                                <Text className="auth-label">Price</Text>
                                <TextInput
                                    placeholder="0.00"
                                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                    value={ price }
                                    onChangeText={ (text) => {
                                        setPrice(text);
                                        if (errors.price) setErrors({ ...errors, price: "" });
                                    } }
                                    keyboardType="decimal-pad"
                                    className={ clsx("auth-input", errors.price && "auth-input-error") }
                                />
                                { errors.price && (
                                    <Text className="auth-error">{ errors.price }</Text>
                                ) }
                            </View>

                            {/* Frequency Picker */ }
                            <View className="auth-field">
                                <Text className="auth-label">Billing Frequency</Text>
                                <View className="picker-row">
                                    <Pressable
                                        onPress={ () => setFrequency("monthly") }
                                        className={ clsx(
                                            "picker-option",
                                            frequency === "monthly" && "picker-option-active"
                                        ) }
                                    >
                                        <Text
                                            className={ clsx(
                                                "picker-option-text",
                                                frequency === "monthly" && "picker-option-text-active"
                                            ) }
                                        >
                                            Monthly
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={ () => setFrequency("yearly") }
                                        className={ clsx(
                                            "picker-option",
                                            frequency === "yearly" && "picker-option-active"
                                        ) }
                                    >
                                        <Text
                                            className={ clsx(
                                                "picker-option-text",
                                                frequency === "yearly" && "picker-option-text-active"
                                            ) }
                                        >
                                            Yearly
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Category Selection */ }
                            <View className="auth-field">
                                <Text className="auth-label">Category</Text>
                                <View className="category-scroll">
                                    { CATEGORIES.map((category) => (
                                        <Pressable
                                            key={ category }
                                            onPress={ () => {
                                                setSelectedCategory(category);
                                                if (errors.category) setErrors({ ...errors, category: "" });
                                            } }
                                            className={ clsx(
                                                "category-chip",
                                                selectedCategory === category && "category-chip-active"
                                            ) }
                                        >
                                            <Text
                                                className={ clsx(
                                                    "category-chip-text",
                                                    selectedCategory === category && "category-chip-text-active"
                                                ) }
                                            >
                                                { category }
                                            </Text>
                                        </Pressable>
                                    )) }
                                </View>
                                { errors.category && (
                                    <Text className="auth-error">{ errors.category }</Text>
                                ) }
                            </View>

                            {/* Payment Method Selection */ }
                            <View className="auth-field">
                                <Text className="auth-label">Payment Method</Text>
                                <View className="category-scroll">
                                    { PAYMENT_METHODS.map((method) => (
                                        <Pressable
                                            key={ method }
                                            onPress={ () => {
                                                setPaymentMethod(method);
                                                if (errors.paymentMethod) setErrors({ ...errors, paymentMethod: "" });
                                            } }
                                            className={ clsx(
                                                "category-chip",
                                                paymentMethod === method && "category-chip-active"
                                            ) }
                                        >
                                            <Text
                                                className={ clsx(
                                                    "category-chip-text",
                                                    paymentMethod === method && "category-chip-text-active"
                                                ) }
                                            >
                                                { method }
                                            </Text>
                                        </Pressable>
                                    )) }
                                </View>
                                { errors.paymentMethod && (
                                    <Text className="auth-error">{ errors.paymentMethod }</Text>
                                ) }
                            </View>

                            {/* Submit — label changes to reflect icon state */ }
                            <Pressable
                                onPress={ handleSubmit }
                                disabled={ !isFormValid }
                                className={ clsx(
                                    "auth-button",
                                    !isFormValid && "auth-button-disabled"
                                ) }
                            >
                                <Text className="auth-button-text">
                                    { iconPending ? "Fetching icon…" : "Add Subscription" }
                                </Text>
                            </Pressable>

                            <View className="pb-20" />
                        </StyledScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default CreateSubscriptionModal;