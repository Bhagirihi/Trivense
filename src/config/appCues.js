/** In-app cue tours — contextual tips after onboarding. */
export const APP_CUE_TOURS = {
  dashboard: [
    {
      id: "dash_welcome",
      icon: "home-variant-outline",
      titleKey: "cueDashWelcomeTitle",
      bodyKey: "cueDashWelcomeBody",
      bodyKeyNoBoards: "cueDashWelcomeBodyNoBoards",
      highlight: null,
    },
    {
      id: "dash_boards",
      icon: "view-grid-outline",
      titleKey: "cueDashBoardsTitle",
      bodyKey: "cueDashBoardsBody",
      highlight: "quickAction:0",
    },
    {
      id: "dash_add",
      icon: "plus-circle-outline",
      titleKey: "cueDashAddTitle",
      bodyKey: "cueDashAddBody",
      highlight: "quickAction:1",
    },
    {
      id: "dash_categories",
      icon: "tag-outline",
      titleKey: "cueDashCategoriesTitle",
      bodyKey: "cueDashCategoriesBody",
      highlight: "quickAction:2",
    },
  ],
};

export function getTourSteps(tourId) {
  return APP_CUE_TOURS[tourId] || [];
}
