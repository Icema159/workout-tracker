import type { ImageSourcePropType } from 'react-native';

const workoutImages = {
    push: require('../assets/workouts/pushday.jpg'),
    pull: require('../assets/workouts/backday.jpg'),
    leg: require('../assets/workouts/legday.jpg'),
    chest: require('../assets/workouts/pushday1.jpg'),
    back: require('../assets/workouts/backday1.jpg'),
    shoulder: require('../assets/workouts/shoulders.jpg'),
    arms: require('../assets/workouts/armsday.jpg'),
    fullBody: require('../assets/workouts/pushday1.jpg'),
    upper: require('../assets/workouts/pushday1.jpg'),
    lower: require('../assets/workouts/lowerbody.jpg'),
    cardio: require('../assets/workouts/abs.jpg'),
    fallback: require('../assets/workouts/abs.jpg'),
} satisfies Record<string, ImageSourcePropType>;

const workoutImageMatchers: Array<{
    keywords: string[];
    image: ImageSourcePropType;
}> = [
    { keywords: ['full body', 'full-body', 'fullbody'], image: workoutImages.fullBody },
    { keywords: ['upper'], image: workoutImages.upper },
    { keywords: ['lower'], image: workoutImages.lower },
    { keywords: ['shoulder', 'shoulders', 'delts'], image: workoutImages.shoulder },
    { keywords: ['chest', 'pec'], image: workoutImages.chest },
    { keywords: ['back', 'lat', 'lats'], image: workoutImages.back },
    { keywords: ['arms', 'arm', 'bicep', 'biceps', 'tricep', 'triceps'], image: workoutImages.arms },
    { keywords: ['push'], image: workoutImages.push },
    { keywords: ['pull'], image: workoutImages.pull },
    { keywords: ['leg', 'legs', 'quad', 'quads', 'hamstring', 'hamstrings'], image: workoutImages.leg },
    { keywords: ['cardio', 'conditioning', 'run', 'running'], image: workoutImages.cardio },
];

export function getWorkoutImageSource(workoutName: string): ImageSourcePropType {
    const normalizedName = workoutName.toLowerCase().replace(/[_-]+/g, ' ');
    const match = workoutImageMatchers.find(({ keywords }) =>
        keywords.some((keyword) => normalizedName.includes(keyword))
    );

    return match?.image ?? workoutImages.fallback;
}
