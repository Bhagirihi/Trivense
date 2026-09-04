import { useState, useCallback } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import FeatureLockModal from "../components/FeatureLockModal";

export function useFeatureLockModal(navigation) {
  const { paymentsEnabled } = useSubscription();
  const [visible, setVisible] = useState(false);
  const [feature, setFeature] = useState(null);

  const openFeatureLock = useCallback(
    (featureKey) => {
      if (!featureKey || !paymentsEnabled) return;
      setFeature(featureKey);
      setVisible(true);
    },
    [paymentsEnabled]
  );

  const closeFeatureLock = useCallback(() => {
    setVisible(false);
    setFeature(null);
  }, []);

  const confirmFeatureLock = useCallback(() => {
    const activeFeature = feature;
    setVisible(false);
    setFeature(null);
    if (activeFeature && navigation && paymentsEnabled) {
      navigation.navigate("Paywall", { feature: activeFeature });
    }
  }, [feature, navigation, paymentsEnabled]);

  const featureLockModal = (
    <FeatureLockModal
      visible={visible}
      feature={feature}
      onClose={closeFeatureLock}
      onUpgrade={confirmFeatureLock}
    />
  );

  return {
    openFeatureLock,
    closeFeatureLock,
    confirmFeatureLock,
    featureLockModal,
    lockModalVisible: visible,
    lockedFeature: feature,
  };
}

export default useFeatureLockModal;
