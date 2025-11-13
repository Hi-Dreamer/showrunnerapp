import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONTS, LOGO_SIZES, FONT_SIZES } from '../constants/theme';

/**
 * Reusable PageHeader component for consistent title/logo layout across pages
 * 
 * @param {string} title - Main title text
 * @param {string} subtitle - Optional subtitle text
 * @param {string} subtitleColor - Color for subtitle (defaults to teal)
 * @param {boolean} subtitleItalic - Whether subtitle should be italic (defaults to false)
 * @param {boolean} showLogo - Whether to show the logo (defaults to true)
 * @param {string} logoSize - Size variant: 'small', 'medium', or 'large' (defaults to 'medium')
 * @param {string} titleFontSize - Font size for title: 'large', 'medium', or 'small' (defaults to 'medium')
 */
const PageHeader = ({ 
  title, 
  subtitle, 
  subtitleColor = COLORS.TEAL,
  subtitleItalic = false,
  showLogo = true,
  logoSize = 'medium',
  titleFontSize = 'medium',
}) => {
  const logoSizeStyle = LOGO_SIZES[logoSize.toUpperCase()] || LOGO_SIZES.MEDIUM;
  const titleSize = titleFontSize === 'large' 
    ? FONT_SIZES.TITLE_LARGE 
    : titleFontSize === 'small' 
    ? FONT_SIZES.TITLE_SMALL 
    : FONT_SIZES.TITLE_MEDIUM;

  return (
    <View style={styles.titleRow}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { fontSize: titleSize }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: subtitleColor }, subtitleItalic && styles.subtitleItalic]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showLogo && (
        <Image 
          source={require('../../assets/hi_logo.png')} 
          style={[styles.logo, logoSizeStyle]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: FONTS.BITINK,
  },
  subtitle: {
    fontSize: FONT_SIZES.SMALL,
    marginTop: 4,
    marginBottom: 0,
  },
  subtitleItalic: {
    fontStyle: 'italic',
  },
  logo: {
    flexShrink: 0,
  },
});

export default PageHeader;

