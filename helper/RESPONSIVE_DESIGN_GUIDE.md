# Responsive Design Guide for RVCoast Mobile App

## Overview

This guide explains how to make your screens and components responsive to different phone sizes. The responsive utilities **only affect mobile devices** (phones) - tablets will maintain their original sizing.

## Quick Start

### Import the Responsive Utilities

```javascript
import { wp, hp, fs, spacing, br } from "../helper";
```

### Basic Usage

Replace hardcoded pixel values with responsive functions:

**Before (Static):**
```javascript
const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 200,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
  }
});
```

**After (Responsive):**
```javascript
const styles = StyleSheet.create({
  container: {
    width: wp(300),
    height: hp(200),
    padding: spacing(16),
    borderRadius: br(12),
  },
  title: {
    fontSize: fs(24),
  }
});
```

## Available Functions

### 1. `wp(size)` - Width Percentage

Scales width proportionally based on device screen width.

**When to use:** Width, marginHorizontal, icon sizes, button widths

**Example:**
```javascript
container: {
  width: wp(350),           // Scales to device width
  marginHorizontal: wp(20), // Horizontal spacing
}
```

### 2. `hp(size)` - Height Percentage

Scales height proportionally based on device screen height.

**When to use:** Height, marginVertical, container heights

**Example:**
```javascript
container: {
  height: hp(200),         // Scales to device height
  marginVertical: hp(16),  // Vertical spacing
}
```

### 3. `fs(size)` - Font Size

Scales font sizes proportionally. Minimum font size is 10px for readability.

**When to use:** All fontSize properties

**Example:**
```javascript
title: {
  fontSize: fs(24),      // Large title
},
subtitle: {
  fontSize: fs(16),      // Medium text
},
caption: {
  fontSize: fs(12),      // Small text
}
```

### 4. `spacing(size)` - Spacing/Padding/Margin

Scales padding, margin, and gap values proportionally.

**When to use:** padding, margin, gap properties

**Example:**
```javascript
container: {
  padding: spacing(20),
  marginBottom: spacing(16),
  gap: spacing(12),
}
```

### 5. `br(size)` - Border Radius

Scales border radius proportionally.

**When to use:** borderRadius properties

**Example:**
```javascript
card: {
  borderRadius: br(16),
},
button: {
  borderRadius: br(24),
}
```

## Pre-built Responsive Styles

You can also import pre-configured responsive styles:

```javascript
import {
  ResponsiveFontSize,
  ResponsiveBorder,
  ResponsiveLayout,
  ResponsiveDimensions
} from "../helper";

const styles = StyleSheet.create({
  heading: {
    fontSize: ResponsiveFontSize.size_2xl,  // 24px scaled
  },
  card: {
    borderRadius: ResponsiveBorder.br_xl,   // 20px scaled
    padding: ResponsiveLayout.card.padding,
  },
  icon: {
    width: ResponsiveDimensions.iconMedium, // 24px scaled
    height: ResponsiveDimensions.iconMedium,
  }
});
```

## Common Patterns

### Pattern 1: Container with Padding

```javascript
container: {
  paddingHorizontal: wp(20),
  paddingVertical: hp(24),
}
```

### Pattern 2: Card Components

```javascript
card: {
  width: wp(350),
  borderRadius: br(20),
  padding: spacing(18),
  marginBottom: hp(16),
}
```

### Pattern 3: Text Hierarchy

```javascript
heading1: {
  fontSize: fs(32),
  marginBottom: hp(16),
},
heading2: {
  fontSize: fs(24),
  marginBottom: hp(12),
},
body: {
  fontSize: fs(16),
  lineHeight: hp(24),
},
caption: {
  fontSize: fs(12),
}
```

### Pattern 4: Buttons

```javascript
button: {
  height: hp(48),
  paddingHorizontal: wp(24),
  borderRadius: br(12),
},
buttonText: {
  fontSize: fs(16),
}
```

### Pattern 5: Icons

```javascript
icon: {
  width: wp(24),
  height: wp(24),
  marginRight: wp(12),
}
```

### Pattern 6: Flex Gaps

```javascript
row: {
  flexDirection: 'row',
  gap: spacing(12),
},
column: {
  flexDirection: 'column',
  gap: spacing(16),
}
```

## Real-World Example

Here's how the home.jsx screen was updated:

**Before:**
```javascript
greetingText: {
  fontSize: 32,
  paddingTop: 50,
  marginBottom: 30,
},
weatherContainer: {
  borderRadius: 20,
  padding: 16,
  marginBottom: 16,
  maxHeight: 170,
},
statusIconContainer: {
  width: 44,
  height: 44,
  borderRadius: 22,
}
```

**After:**
```javascript
greetingText: {
  fontSize: fs(32),
  paddingTop: hp(50),
  marginBottom: hp(30),
},
weatherContainer: {
  borderRadius: br(20),
  padding: spacing(16),
  marginBottom: hp(16),
  maxHeight: hp(170),
},
statusIconContainer: {
  width: wp(44),
  height: wp(44),
  borderRadius: wp(22),
}
```

## Best Practices

### ✅ Do's

1. **Use wp() for widths and horizontal spacing**
   ```javascript
   width: wp(300),
   marginHorizontal: wp(20),
   ```

2. **Use hp() for heights and vertical spacing**
   ```javascript
   height: hp(200),
   marginVertical: hp(16),
   ```

3. **Use fs() for all font sizes**
   ```javascript
   fontSize: fs(16),
   ```

4. **Use spacing() for padding, margin, and gap**
   ```javascript
   padding: spacing(16),
   gap: spacing(12),
   ```

5. **Use br() for border radius**
   ```javascript
   borderRadius: br(12),
   ```

6. **Keep square elements square using wp() for both dimensions**
   ```javascript
   icon: {
     width: wp(24),
     height: wp(24),
   }
   ```

### ❌ Don'ts

1. **Don't use responsive functions for flex values**
   ```javascript
   // ❌ Bad
   flex: wp(1),

   // ✅ Good
   flex: 1,
   ```

2. **Don't use responsive functions for borderWidth**
   ```javascript
   // ❌ Bad
   borderWidth: wp(1),

   // ✅ Good
   borderWidth: 1,
   ```

3. **Don't use responsive functions for opacity or other unitless values**
   ```javascript
   // ❌ Bad
   opacity: wp(0.5),

   // ✅ Good
   opacity: 0.5,
   ```

4. **Don't mix percentage strings with responsive functions**
   ```javascript
   // ❌ Bad
   width: wp('100%'),

   // ✅ Good
   width: '100%',
   ```

## Testing Your Responsive Design

### Device Sizes to Test

- **Small Phone**: iPhone SE (375 x 667)
- **Medium Phone**: iPhone 14 (390 x 844)
- **Large Phone**: iPhone 14 Pro Max (430 x 932)
- **Tablet**: iPad (768 x 1024) - Should NOT scale

### Quick Test Commands

```bash
# Test on iOS
expo start --ios

# Test on Android
expo start --android

# Test on specific device
expo start --ios --device-id "iPhone SE"
```

## Checking If Device Is Tablet

If you need to conditionally render different layouts:

```javascript
import { useScreenSize } from "../helper";

const MyComponent = () => {
  const isTablet = useScreenSize();

  return (
    <View>
      {isTablet ? (
        <TabletLayout />
      ) : (
        <MobileLayout />
      )}
    </View>
  );
};
```

## Advanced: Moderate Scaling

For elements that shouldn't scale as aggressively:

```javascript
import { ms } from "../helper";

// Scales with 50% intensity (default)
fontSize: ms(20)

// Scales with 30% intensity
fontSize: ms(20, 0.3)
```

## Migration Checklist

When updating a screen to use responsive design:

- [ ] Import responsive utilities at the top
- [ ] Update all fontSize values to use `fs()`
- [ ] Update all width values to use `wp()`
- [ ] Update all height values to use `hp()`
- [ ] Update all padding/margin/gap to use `spacing()`
- [ ] Update all borderRadius to use `br()`
- [ ] Test on multiple device sizes
- [ ] Verify tablet layout remains unchanged

## Need Help?

- Check `helper/responsiveUtils.js` for implementation details
- Check `helper/responsiveStyles.js` for pre-built responsive styles
- Look at `screens/home.jsx` for a complete example
- The responsive functions automatically detect tablets and return original values

## Summary

The responsive utility system makes your mobile screens adapt to different phone sizes automatically, while keeping tablet layouts exactly as designed. Simply replace hardcoded pixel values with the appropriate responsive function (`wp`, `hp`, `fs`, `spacing`, `br`) and your UI will scale proportionally across all mobile devices.
