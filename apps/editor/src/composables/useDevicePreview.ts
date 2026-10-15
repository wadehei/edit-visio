import { ref, computed } from 'vue';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'custom';

export interface DeviceConfig {
  type: DeviceType;
  name: string;
  width: number;
  height: number;
  icon: string;
}

export const devices: Record<DeviceType, DeviceConfig> = {
  mobile: {
    type: 'mobile',
    name: '手机',
    width: 375,
    height: 667,
    icon: '📱',
  },
  tablet: {
    type: 'tablet',
    name: '平板',
    width: 768,
    height: 1024,
    icon: '📱',
  },
  desktop: {
    type: 'desktop',
    name: '桌面',
    width: 1920,
    height: 1080,
    icon: '🖥️',
  },
  custom: {
    type: 'custom',
    name: '自定义',
    width: 375,
    height: 667,
    icon: '⚙️',
  },
};

export function useDevicePreview() {
  const currentDevice = ref<DeviceType>('mobile');
  const customWidth = ref(375);
  const customHeight = ref(667);
  const showDeviceSwitcher = ref(true);

  const currentDeviceConfig = computed(() => {
    if (currentDevice.value === 'custom') {
      return {
        ...devices.custom,
        width: customWidth.value,
        height: customHeight.value,
      };
    }
    return devices[currentDevice.value];
  });

  const setDevice = (device: DeviceType) => {
    currentDevice.value = device;
  };

  const setCustomSize = (width: number, height: number) => {
    customWidth.value = width;
    customHeight.value = height;
    currentDevice.value = 'custom';
  };

  const toggleDeviceSwitcher = () => {
    showDeviceSwitcher.value = !showDeviceSwitcher.value;
  };

  return {
    currentDevice,
    currentDeviceConfig,
    devices,
    setDevice,
    setCustomSize,
    showDeviceSwitcher,
    toggleDeviceSwitcher,
  };
}
