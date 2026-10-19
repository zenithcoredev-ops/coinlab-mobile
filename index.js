// Custom entry so the Android widget task handler is registered before the app starts
// (headless widget updates run without the UI).
import './src/widget/register';
import 'expo-router/entry';
