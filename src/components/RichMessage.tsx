import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type } from '../theme/typography';

export type Span = { text: string; bold?: boolean };

export type Block =
  | { type: 'paragraph'; spans: Span[] }
  | { type: 'bullets'; items: Span[][] }
  | { type: 'numbered'; items: Span[][] };

type Props = {
  blocks?: Block[] | null;
  text?: string;
  textColor?: string;
};

const asParagraph = (text?: string): Block[] =>
  text ? [{ type: 'paragraph', spans: [{ text }] }] : [];

/**
 * Renders the small typed block model produced by the assistant backend
 * (`{ type: 'paragraph' | 'bullets' | 'numbered', ... }`). Falls back to
 * treating `text` as a single paragraph so plain strings still render.
 */
export default function RichMessage({ blocks, text, textColor }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors, textColor);

  const model: Block[] = Array.isArray(blocks) && blocks.length ? blocks : asParagraph(text);
  if (!model.length) return null;

  const spans = (items: Span[], keyPrefix: string) =>
    items.map((span, i) => (
      <Text key={`${keyPrefix}-${i}`} style={span.bold ? styles.bold : undefined}>
        {span.text}
      </Text>
    ));

  return (
    <View style={styles.container}>
      {model.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <Text key={`p-${index}`} style={styles.text}>
              {spans(block.spans, `p-${index}`)}
            </Text>
          );
        }

        return (
          <View key={`l-${index}`} style={styles.list}>
            {block.items.map((item, itemIndex) => (
              <View key={`i-${index}-${itemIndex}`} style={styles.listItem}>
                <Text style={styles.marker}>
                  {block.type === 'numbered' ? `${itemIndex + 1}.` : '\u2022'}
                </Text>
                <Text style={styles.text}>{spans(item, `i-${index}-${itemIndex}`)}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: any, textColor?: string) => {
  const color = textColor || colors.onSurface;
  return StyleSheet.create({
    container: { gap: 8 },
    text: { ...type.bodyMd, color, lineHeight: 20 },
    bold: { fontFamily: fonts.bold },
    list: { gap: 6 },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    marker: { ...type.bodyMd, color, lineHeight: 20, minWidth: 14 },
  });
};
