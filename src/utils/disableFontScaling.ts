// src/utils/disableFontScaling.ts
import { Text, TextInput } from 'react-native';

// Run this once at app startup
export function disableSystemFontScaling() {
    // @ts-ignore
    Text.defaultProps = Text.defaultProps || {};
    // @ts-ignore
    Text.defaultProps.allowFontScaling = false;

    // @ts-ignore
    TextInput.defaultProps = TextInput.defaultProps || {};
    // @ts-ignore
    TextInput.defaultProps.allowFontScaling = false;

    console.log('System font scaling disabled globally');
}