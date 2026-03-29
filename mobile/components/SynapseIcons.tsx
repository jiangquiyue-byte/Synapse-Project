import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
};

export const ICON_TONES = {
  primary: '#111111',
  muted: '#5F5F5F',
  subtle: '#767676',
  inverse: '#FFFFFF',
} as const;

function withDefaults({
  size = 24,
  color = ICON_TONES.primary,
  strokeWidth = 1.2,
  opacity = 1,
}: IconProps) {
  return { size, color, strokeWidth, opacity };
}

export function AddPlusIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="7.5" x2="12" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="7.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SendPulseIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M4 12.2L18.4 6.6L13.7 18L11.7 13.8L4 12.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx="11.8" cy="13.7" r="1.4" fill={color} />
    </Svg>
  );
}

export function ChatTabIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Rect x="4" y="5" width="16" height="12" rx="4.4" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M9 17L8.1 20L11.6 17H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="8.7" cy="11.1" r="0.9" fill={color} />
      <Circle cx="12" cy="11.1" r="0.9" fill={color} />
      <Circle cx="15.3" cy="11.1" r="0.9" fill={color} />
    </Svg>
  );
}

export function AgentsTabIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="8.2" cy="10" r="2.4" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="15.8" cy="10" r="2.4" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4.8 17.7C5.7 15.7 7.4 14.7 9.8 14.7C12.1 14.7 13.5 15.3 14.4 16.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M9.6 16.8C10.5 15.5 12.1 14.7 14.3 14.7C16.7 14.7 18.4 15.7 19.2 17.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsTabIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="12" cy="12" r="2.7" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 5.2V7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 17V18.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M18.8 12H17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M7 12H5.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M16.8 7.2L15.5 8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.5 15.5L7.2 16.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M16.8 16.8L15.5 15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.5 8.5L7.2 7.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function MemoryTabIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Rect x="5.1" y="5.2" width="13.8" height="13.6" rx="3.8" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.3 9.4H15.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.3 12H13.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.3 14.6H11.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="16" cy="14.8" r="1.3" fill={color} />
      <Path d="M15.95 4.8V6.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.05 4.8V6.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function WorkflowsTabIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="7" cy="7.2" r="1.7" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17" cy="7.2" r="1.7" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="16.8" r="1.9" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.7 8.3L10.8 11.1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.3 8.3L13.2 11.1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 11.3V14.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M9.3 18.8H14.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

export function ExportDialogIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M12 6.2V14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M9.1 11.1L12 14L14.9 11.1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="5" y="15.2" width="14" height="3.6" rx="1.8" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function SearchGlobeIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="10.4" cy="10.4" r="5.2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M7.9 10.4H12.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M10.4 7.1C11.3 8 11.8 9.1 11.8 10.4C11.8 11.7 11.3 12.8 10.4 13.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M10.4 7.1C9.5 8 9 9.1 9 10.4C9 11.7 9.5 12.8 10.4 13.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M14.5 14.5L18.5 18.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function EmptyAgentsIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults({ ...props, size: props.size ?? 84 });
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" fill="none" opacity={opacity}>
      <Rect x="10" y="10" width="64" height="64" rx="20" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="31" cy="34" r="6.5" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="53" cy="34" r="6.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M19 57C21.8 49.8 27.1 46.2 34.7 46.2C42.1 46.2 47 48.4 50.1 53" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M33.8 53.1C36.5 48.6 41.5 46.2 49.3 46.2C56.9 46.2 62.2 49.8 65 57" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="42" cy="42" r="2.4" fill={color} />
    </Svg>
  );
}

export function SynapseMarkIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults({ ...props, size: props.size ?? 72 });
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" opacity={opacity}>
      <G>
        <Path d="M14 47C17.6 45.6 19.9 42.5 21.7 38.9C23.9 34.4 27.2 31.6 31.8 31.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 17C46.4 18.4 44.1 21.5 42.3 25.1C40.1 29.6 36.8 32.4 32.2 32.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 52C12.2 50.4 15.6 46.8 18.1 41.6C20.7 36.3 24.9 32.6 31.2 31.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M56 12C51.8 13.6 48.4 17.2 45.9 22.4C43.3 27.7 39.1 31.4 32.8 32.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="28.5" y1="40" x2="35.5" y2="24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="1.2 4.2" />
        <Circle cx="8" cy="52" r="2" fill={color} />
        <Circle cx="14" cy="47" r="1.55" fill={color} />
        <Circle cx="56" cy="12" r="2" fill={color} />
        <Circle cx="50" cy="17" r="1.55" fill={color} />
        <Circle cx="32" cy="32" r="2.8" fill={color} />
      </G>
    </Svg>
  );
}

export function SequentialModeIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="6.5" cy="12" r="1.6" fill={color} />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
      <Circle cx="17.5" cy="12" r="1.6" fill={color} />
      <Path d="M8.6 12H9.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M14.2 12H15.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function DebateModeIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M6.2 9.3H14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M13.3 6.8L16.1 9.3L13.3 11.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17.8 14.7H9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M10.7 12.2L7.9 14.7L10.7 17.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VoteModeIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Rect x="5.2" y="6.1" width="13.6" height="11.8" rx="3.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.3 12.1L10.6 14.4L15.7 9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SingleModeIcon(props: IconProps) {
  const { size, color, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <SvgText
        x="12"
        y="16.2"
        textAnchor="middle"
        fill={color}
        fontSize="15.5"
        fontWeight="700"
      >
        @
      </SvgText>
    </Svg>
  );
}

export function MarkdownFileIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M7.4 4.7H14.6L18.2 8.3V18.5C18.2 19.5 17.4 20.3 16.4 20.3H7.4C6.4 20.3 5.6 19.5 5.6 18.5V6.5C5.6 5.5 6.4 4.7 7.4 4.7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M14.4 4.8V8.4H18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x="12" y="16.1" textAnchor="middle" fill={color} fontSize="5.2" fontWeight="700">MD</SvgText>
    </Svg>
  );
}

export function PdfFileIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M7.4 4.7H14.6L18.2 8.3V18.5C18.2 19.5 17.4 20.3 16.4 20.3H7.4C6.4 20.3 5.6 19.5 5.6 18.5V6.5C5.6 5.5 6.4 4.7 7.4 4.7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M14.4 4.8V8.4H18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x="12" y="16.1" textAnchor="middle" fill={color} fontSize="5.2" fontWeight="700">PDF</SvgText>
    </Svg>
  );
}

export function JsonFileIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M7.4 4.7H14.6L18.2 8.3V18.5C18.2 19.5 17.4 20.3 16.4 20.3H7.4C6.4 20.3 5.6 19.5 5.6 18.5V6.5C5.6 5.5 6.4 4.7 7.4 4.7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M14.4 4.8V8.4H18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.8 12.1C9.1 12.4 8.8 12.8 8.8 13.4C8.8 14 9.1 14.5 9.8 14.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.2 12.1C14.9 12.4 15.2 12.8 15.2 13.4C15.2 14 14.9 14.5 14.2 14.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13.5" r="0.8" fill={color} />
    </Svg>
  );
}

export function SessionStackIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Rect x="6.4" y="6.2" width="11.2" height="7" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="4.6" y="10.8" width="11.2" height="7" rx="2" stroke={color} strokeWidth={strokeWidth} opacity="0.78" />
      <Path d="M8.2 14.3H12.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="14.3" cy="14.3" r="1" fill={color} />
    </Svg>
  );
}

export function SimilaritySignalIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M5.6 15.8C7.5 14.2 9 13.4 10.4 13.4C11.8 13.4 13 12.7 14 11.2C15.1 9.6 16.6 8.4 18.4 7.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="5.8" cy="15.8" r="1.15" fill={color} />
      <Circle cx="10.4" cy="13.4" r="1.15" fill={color} />
      <Circle cx="14.1" cy="11.1" r="1.15" fill={color} />
      <Circle cx="18.3" cy="7.7" r="1.15" fill={color} />
    </Svg>
  );
}

export function ClockTraceIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="12" cy="12" r="6.8" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 8.7V12.2L14.6 13.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17.3 6.7L18.7 5.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseCircleIcon(props: IconProps) {
  const { size, color, strokeWidth, opacity } = withDefaults(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="12" cy="12" r="8.2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M9.3 9.3L14.7 14.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M14.7 9.3L9.3 14.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
