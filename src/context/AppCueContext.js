import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getTourSteps } from "../config/appCues";
import { markTourCompleted } from "../utils/appCueStorage";

const AppCueContext = createContext({
  activeTour: null,
  stepIndex: 0,
  activeStep: null,
  activeHighlight: null,
  tourContext: {},
  isActive: false,
  startTour: () => {},
  nextStep: () => {},
  skipTour: () => {},
});

export function AppCueProvider({ children }) {
  const [activeTour, setActiveTour] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourContext, setTourContext] = useState({});

  const steps = activeTour ? getTourSteps(activeTour) : [];
  const activeStep = steps[stepIndex] || null;
  const activeHighlight = activeStep?.highlight || null;

  const finishTour = useCallback(async (tourId) => {
    if (tourId) await markTourCompleted(tourId);
    setActiveTour(null);
    setStepIndex(0);
    setTourContext({});
  }, []);

  const startTour = useCallback((tourId, context = {}) => {
    const tourSteps = getTourSteps(tourId);
    if (!tourSteps.length) return;
    setTourContext(context);
    setActiveTour(tourId);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex >= steps.length - 1) {
      finishTour(activeTour);
      return;
    }
    setStepIndex((prev) => prev + 1);
  }, [activeTour, stepIndex, steps.length, finishTour]);

  const skipTour = useCallback(() => {
    if (activeTour) finishTour(activeTour);
  }, [activeTour, finishTour]);

  const value = useMemo(
    () => ({
      activeTour,
      stepIndex,
      activeStep,
      activeHighlight,
      tourContext,
      isActive: Boolean(activeTour && activeStep),
      startTour,
      nextStep,
      skipTour,
    }),
    [
      activeTour,
      stepIndex,
      activeStep,
      activeHighlight,
      tourContext,
      startTour,
      nextStep,
      skipTour,
    ],
  );

  return (
    <AppCueContext.Provider value={value}>{children}</AppCueContext.Provider>
  );
}

export function useAppCue() {
  return useContext(AppCueContext);
}
