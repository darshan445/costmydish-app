import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

/**
 * @param {object} props
 * @param {1|2|3} props.step
 * @param {(nextStep: 1|2|3) => void} [props.onStepPress]
 * @param {(step: 1|2|3) => boolean} [props.canReachStep]
 */
export function WizardProgress({ step, onStepPress, canReachStep }) {
  const progress = Math.min(Math.max(step, 1), 3) / 3;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        {C.home.coachSteps.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          const reachable = canReachStep ? canReachStep(s.n) : true;
          const locked = !active && !reachable;
          const pressable = Boolean(onStepPress) && reachable && !active;

          const content = (
            <View style={[styles.stepChip, active && styles.stepChipActive, locked && styles.stepChipLocked]}>
              <Text
                style={[
                  styles.label,
                  (active || done) && styles.labelActive,
                  active && styles.labelCurrent,
                  locked && styles.labelLocked,
                  pressable && styles.labelPressable,
                ]}
              >
                {s.n}. {s.title}
              </Text>
              {(pressable || active) ? (
                <View style={[styles.stepIndicator, active && styles.stepIndicatorActive]} />
              ) : null}
            </View>
          );

          if (!pressable) {
            return (
              <View
                key={s.n}
                style={styles.stepHit}
                accessibilityState={{ selected: active, disabled: locked }}
              >
                {content}
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={s.n}
              style={styles.stepHit}
              onPress={() => onStepPress(s.n)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${s.n}: ${s.title}`}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {content}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.stepCount}>Step {step} of 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  stepHit: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepChip: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  stepChipActive: {
    backgroundColor: COLORS.surfaceAlt,
  },
  stepChipLocked: {
    opacity: 0.45,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.primaryLight,
  },
  labelCurrent: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  labelLocked: {
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  labelPressable: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  stepIndicator: {
    marginTop: 3,
    height: 2,
    width: 18,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },
  stepIndicatorActive: {
    width: 22,
    backgroundColor: COLORS.primary,
  },
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  stepCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
});
