// src/components/Text.tsx
import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

export default function Text(props: TextProps) {
    const { style, ...rest } = props;

    return (
        <RNText
            style={[
                { fontFamily: 'Inter-Variable' }, // default regular
                style,
            ]}
            {...rest}
        />
    );
}