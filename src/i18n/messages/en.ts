const messages = {
  Metadata: {
    title: "Prestige Motors | Premium Second-Hand Car Dealership",
    titleTemplate: "{title} | Prestige Motors",
    description:
      "Browse inspected second-hand cars with premium photos, detailed specifications, and direct dealer contact.",
    openGraphDescription:
      "A premium second-hand car showroom with inspected vehicles and transparent specifications."
  },
  PageMetadata: {
    home: {
      title: "Premium Used Car Showroom",
      description:
        "Search Malaysian pre-owned vehicles by brand, body type, price, year, mileage, fuel type, and transmission."
    },
    tradeIn: {
      title: "Trade In Your Car",
      description:
        "Share your vehicle details and photos to request a direct trade-in appraisal from Prestige Motors."
    },
    testDrive: {
      title: "Book a Test Drive",
      description:
        "Request a private Prestige Motors test drive using live showroom appointment times."
    },
    compare: {
      title: "Compare Vehicles",
      description:
        "Compare saved Prestige Motors vehicles side by side by price, mileage, specifications, and equipment."
    },
    alertConfirm: {
      title: "Confirm Vehicle Alert",
      description:
        "Confirm your email address and activate a Prestige Motors vehicle alert."
    },
    alertUnsubscribe: {
      title: "Manage Vehicle Alerts",
      description: "Stop a Prestige Motors vehicle alert subscription."
    },
    adminDashboard: { title: "Admin Dashboard" },
    adminLogin: { title: "Admin Login" },
    vehicle: {
      notFound: "Vehicle not found",
      description:
        "View {vehicle} with verified details, photos, specifications, and direct dealer contact."
    }
  },
  LanguageSwitcher: {
    label: "Change language",
    changing: "Changing language"
  },
  Global: {
    skipToMain: "Skip to main content",
    skipToAdmin: "Skip to admin content",
    loading: "Loading",
    retry: "Try again",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    search: "Search",
    clear: "Clear",
    all: "All",
    optional: "Optional"
  }
};

export type AppMessages = typeof messages;
export default messages;
