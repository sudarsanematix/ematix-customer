import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing } from '../theme/typography';
import MaterialIcon, { MaterialIconName } from './MaterialIcon';

export type RouteStop = {
  id: string;
  time: string;
  name: string;
  icon: string;
};

/**
 * A horizontal, geocode-free timeline of a trip's stops. Used in place of a
 * real map so any AI-generated trip renders correctly without coordinates.
 */
export default function RouteStrip({ stops }: { stops: RouteStop[] }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.item}>
            <View style={styles.nodeRow}>
              <View style={styles.node}>
                <MaterialIcon
                  name={stop.icon as MaterialIconName}
                  size={16}
                  color={colors.onPrimary}
                />
              </View>
              {index < stops.length - 1 ? <View style={styles.connector} /> : null}
            </View>
            <Text style={styles.time} numberOfLines={1}>
              {stop.time || `Stop ${index + 1}`}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {stop.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceContainer,
      paddingVertical: spacing.stackMd,
    },
    content: {
      paddingHorizontal: spacing.cardPadding,
      alignItems: 'flex-start',
    },
    item: { width: 96 },
    nodeRow: { flexDirection: 'row', alignItems: 'center' },
    node: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surfaceContainerLowest,
    },
    connector: {
      flex: 1,
      height: 2,
      backgroundColor: colors.primary,
      opacity: 0.35,
    },
    time: {
      ...type.labelSm,
      fontSize: 11,
      color: colors.onSurfaceVariant,
      marginTop: spacing.stackSm,
    },
    name: { ...type.labelMd, color: colors.onSurface, marginTop: 2 },
  });
