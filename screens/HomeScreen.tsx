// screens/HomeScreen.tsx
import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Title, Subtitle } from '../components/Ui';
import { colors, spacing } from '../theme';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
LocaleConfig.locales.en = {
    monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ],
    monthNamesShort: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    today: 'Today',
};
LocaleConfig.defaultLocale = 'en';

type RootStackParamList = {
    Home: undefined;
    // add other screens if needed
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
    const { width } = Dimensions.get('window');
    const cardWidth = width;
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const [selected, setSelected] = React.useState<string>(new Date().toISOString().slice(0, 10));

    // PAVYZDINIAI workout’ai (vėliau galėsim krauti iš AsyncStorage / API)
    const workoutDays = [
        '2024-04-14',
        '2024-04-15',
        '2024-04-17',
        '2024-04-18',
        '2024-04-20',
    ];

    const marked: Record<string, any> = workoutDays.reduce((acc, d) => {
        acc[d] = {
            marked: true,
            dotColor: '#C7EA46',
        };
        return acc;
    }, {} as Record<string, any>);

    // pažymim pasirinktą dieną
    marked[selected] = {
        ...(marked[selected] || {}),
        selected: true,
        selectedColor: '#C7EA46',
        selectedTextColor: '#121212',
    };

    const insets = useSafeAreaInsets();

    const stats = [
        { id: '1', label: 'This Week Workouts', value: '3 Sessions', icon: 'dumbbell' },
        { id: '2', label: 'Total Time', value: '4h 30m', icon: 'timer-outline' },
        { id: '3', label: 'Calories Burned', value: '1,500 kcal', icon: 'fire' },
    ];

    const recentWorkouts = [
        { id: '1', date: 'April 17', title: 'Upper Body', duration: '1h 00m', progress: 0.9 },
        { id: '2', date: 'April 15', title: 'Running', duration: '30m', progress: 0.3 },
        { id: '3', date: 'April 14', title: 'Full Body', duration: '45m', progress: 0.6 },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                    <Title style={styles.greeting}>Hi, Aismantas</Title>
                    <Subtitle style={styles.quote}>Believe in yourself and all that you are.</Subtitle>
                </View>

                {/* Calendar */}
                <View style={[styles.calendar, { marginBottom: spacing.lg }]}>
                    <Calendar
                        onDayPress={(day: { dateString: string }) => setSelected(day.dateString)}
                        markedDates={marked}
                        theme={{
                            backgroundColor: '#1A1A1A',
                            calendarBackground: '#1A1A1A',
                            monthTextColor: colorsTheme.primary,
                            textSectionTitleColor: colorsTheme.text,
                            dayTextColor: colorsTheme.text,
                            todayTextColor: colorsTheme.primary,
                            arrowColor: '#C7EA46',
                            textDisabledColor: '#555555',
                            selectedDayBackgroundColor: '#C7EA46',
                            selectedDayTextColor: colorsTheme.background,
                            textDayFontSize: 18,
                            textMonthFontSize: 22,
                            textDayHeaderFontSize: 14,
                            textDayFontWeight: 'bold',
                            textMonthFontWeight: 'bold',
                        }}
                        firstDay={1} // savaitė prasideda nuo pirmadienio
                        hideExtraDays
                        enableSwipeMonths
                    />
                </View>

                {/* Stats Carousel */}
                <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
                    <FlatList
                        data={stats}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={{ width: cardWidth, justifyContent: 'center', alignItems: 'center' }}>
                                <LinearGradient
                                    colors={['#1A1A1A', '#0E0E0E']}
                                    style={styles.statCardBig}
                                >
                                    <MaterialCommunityIcons
                                        name={item.icon}
                                        size={28}
                                        color={colorsTheme.primary}
                                        style={{ marginBottom: 8 }}
                                    />
                                    <Subtitle style={styles.statLabel}>{item.label.toUpperCase()}</Subtitle>
                                    <Title style={styles.statValue}>{item.value}</Title>
                                </LinearGradient>
                            </View>
                        )}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: false }
                        )}
                    />
                    {/* Dots */}
                    <View style={styles.dotsContainer}>
                        {stats.map((_, index) => {
                            const opacity = scrollX.interpolate({
                                inputRange: [
                                    (index - 1) * cardWidth,
                                    index * cardWidth,
                                    (index + 1) * cardWidth,
                                ],
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });
                            return <Animated.View key={index} style={[styles.dot, { opacity }]} />;
                        })}
                    </View>
                </View>

                {/* Recent Workouts */}
                <View style={styles.sectionHeader}>
                    <Title style={styles.sectionTitle}>Recent Workouts</Title>
                </View>
                <View style={{ paddingHorizontal: spacing.md }}>
                    {recentWorkouts.map((w) => (
                        <LinearGradient key={w.id} colors={['#1A1A1A', '#0E0E0E']} style={styles.workoutCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons
                                    name={
                                        w.title === 'Upper Body' ? 'dumbbell' :
                                            w.title === 'Running' ? 'run' :
                                                'weight-lifter'
                                    }
                                    size={24}
                                    color={colorsTheme.primary}
                                    style={{ marginRight: 8 }}
                                />
                                <View>
                                    <Subtitle style={styles.workoutDate}>{w.date}</Subtitle>
                                    <Title style={styles.workoutTitle}>{w.title}</Title>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Subtitle style={styles.workoutDuration}>{w.duration}</Subtitle>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { flex: w.progress }]} />
                                    <View style={{ flex: 1 - w.progress }} />
                                </View>
                            </View>
                        </LinearGradient>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const colorsTheme = {
    primary: '#C7EA46',
    background: '#121212',
    text: '#FFFFFF',
    sub: '#B3B3B3',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colorsTheme.background,
    },
    header: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    greeting: {
        fontSize: 42,
        color: colorsTheme.primary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    quote: {
        color: colorsTheme.sub,
        marginTop: 8,
        marginBottom: 22,
        textAlign: 'center',
    },
    calendar: {
        marginTop: spacing.lg,
        marginHorizontal: spacing.md,
        padding: spacing.lg,
        borderRadius: 16,
        backgroundColor: '#1A1A1A',
        marginBottom: spacing.lg,
    },
    statCardBig: {
        width: Dimensions.get('window').width - spacing.lg * 2,
        borderRadius: 16,
        padding: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 6,
    },
    statLabel: {
        color: colorsTheme.sub,
        fontSize: 14,
        marginBottom: 4,
    },
    statValue: {
        color: colorsTheme.text,
        fontSize: 26,   // padidintas
        fontWeight: 'bold',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colorsTheme.primary,
        marginHorizontal: 4,
    },

    sectionHeader: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    sectionTitle: {
        color: colorsTheme.text,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    workoutCard: {
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    workoutDate: {
        color: colorsTheme.sub,
        fontSize: 16,
    },
    workoutTitle: {
        color: colorsTheme.text,
        fontSize: 18,
        marginTop: 2,
        fontWeight: 'bold',
    },
    workoutDuration: {
        color: colorsTheme.sub,
        fontSize: 16,
    },
    progressBar: {
        flexDirection: 'row',
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginTop: 6,
        width: 80,
    },
    progressFill: {
        backgroundColor: colorsTheme.primary,
        borderRadius: 2,
    },
});